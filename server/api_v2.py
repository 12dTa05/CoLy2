# api_v2.py - Optimized API with playlist system and better performance

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
import subprocess
import uuid
import datetime
import bcrypt
import re
from werkzeug.utils import secure_filename
from database_schema import init_database
import redis
import json

app = Flask(__name__)
CORS(app)
app.config['JWT_SECRET_KEY'] = 'd89196fbc63502b37fc00fa691b64af09b40b80b4cf90d14f611dcbc4dc3e609'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# Database and Redis setup
db = init_database('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Collections
users_collection = db['users']
videos_collection = db['videos']
comments_collection = db['comments']
views_collection = db['views']
subscriptions_collection = db['subscriptions']
watch_history_collection = db['watch_history']
saved_videos_collection = db['saved_videos']
watch_later_collection = db['watch_later']
liked_videos_collection = db['liked_videos']
playlists_collection = db['playlists']
playlist_items_collection = db['playlist_items']
notifications_collection = db['notifications']
video_analytics_collection = db['video_analytics']

# File storage
UPLOAD_FOLDER = 'uploads'
HLS_FOLDER = 'hls'
THUMBNAILS_FOLDER = 'thumbnails'

# Utility functions
def generate_unique_id():
    return str(uuid.uuid4())

def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def check_password(stored_password, provided_password):
    return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password)

def cache_get(key):
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except:
        return None

def cache_set(key, data, expire=300):
    try:
        redis_client.setex(key, expire, json.dumps(data, default=str))
    except:
        pass

def convert_objectids(data):
    """Convert ObjectIds to strings recursively"""
    if isinstance(data, list):
        return [convert_objectids(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_objectids(value) for key, value in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

# PLAYLIST APIs
@app.route('/api/playlists', methods=['POST'])
@jwt_required()
def create_playlist():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    visibility = data.get('visibility', 'private')
    
    if not title:
        return jsonify({'success': False, 'message': 'Tiêu đề playlist không được để trống'}), 400
    
    if len(title) > 150:
        return jsonify({'success': False, 'message': 'Tiêu đề quá dài'}), 400
    
    playlist = {
        'title': title,
        'description': description,
        'userId': ObjectId(user_id),
        'visibility': visibility,
        'videoCount': 0,
        'thumbnailVideoId': None,
        'createdAt': datetime.datetime.now(),
        'updatedAt': datetime.datetime.now()
    }
    
    playlist_id = playlists_collection.insert_one(playlist).inserted_id
    playlist['_id'] = str(playlist_id)
    playlist['userId'] = str(playlist['userId'])
    
    return jsonify({'success': True, 'playlist': playlist}), 201

@app.route('/api/playlists/<playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    try:
        # Check cache first
        cache_key = f"playlist:{playlist_id}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify({'success': True, 'playlist': cached})
        
        playlist = playlists_collection.find_one({'_id': ObjectId(playlist_id)})
        if not playlist:
            return jsonify({'success': False, 'message': 'Playlist không tồn tại'}), 404
        
        # Get playlist items
        items = list(playlist_items_collection.aggregate([
            {'$match': {'playlistId': ObjectId(playlist_id)}},
            {'$lookup': {
                'from': 'videos',
                'localField': 'videoId',
                'foreignField': '_id',
                'as': 'video'
            }},
            {'$unwind': '$video'},
            {'$match': {'video.status': 'ready'}},
            {'$sort': {'order': 1}},
            {'$project': {
                'video._id': 1,
                'video.title': 1,
                'video.thumbnailPath': 1,
                'video.duration': 1,
                'video.username': 1,
                'video.stats.views': 1,
                'addedAt': 1,
                'order': 1
            }}
        ]))
        
        playlist_data = convert_objectids(playlist)
        playlist_data['items'] = convert_objectids(items)
        
        # Cache for 5 minutes
        cache_set(cache_key, playlist_data, 300)
        
        return jsonify({'success': True, 'playlist': playlist_data})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/playlists/<playlist_id>/videos', methods=['POST'])
@jwt_required()
def add_video_to_playlist(playlist_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    video_id = data.get('videoId')
    
    if not video_id:
        return jsonify({'success': False, 'message': 'Video ID không được để trống'}), 400
    
    try:
        # Check playlist ownership
        playlist = playlists_collection.find_one({
            '_id': ObjectId(playlist_id),
            'userId': ObjectId(user_id)
        })
        
        if not playlist:
            return jsonify({'success': False, 'message': 'Playlist không tồn tại hoặc bạn không có quyền'}), 404
        
        # Check if video exists and is ready
        video = videos_collection.find_one({
            '_id': ObjectId(video_id),
            'status': 'ready'
        })
        
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        # Check if video already in playlist
        existing = playlist_items_collection.find_one({
            'playlistId': ObjectId(playlist_id),
            'videoId': ObjectId(video_id)
        })
        
        if existing:
            return jsonify({'success': False, 'message': 'Video đã có trong playlist'}), 400
        
        # Get next order number
        last_item = playlist_items_collection.find_one(
            {'playlistId': ObjectId(playlist_id)},
            sort=[('order', -1)]
        )
        next_order = (last_item['order'] + 1) if last_item else 0
        
        # Add video to playlist
        playlist_item = {
            'playlistId': ObjectId(playlist_id),
            'videoId': ObjectId(video_id),
            'addedAt': datetime.datetime.now(),
            'order': next_order
        }
        
        playlist_items_collection.insert_one(playlist_item)
        
        # Update playlist video count and thumbnail
        update_data = {'$inc': {'videoCount': 1}, '$set': {'updatedAt': datetime.datetime.now()}}
        if not playlist.get('thumbnailVideoId'):
            update_data['$set']['thumbnailVideoId'] = ObjectId(video_id)
        
        playlists_collection.update_one(
            {'_id': ObjectId(playlist_id)},
            update_data
        )
        
        # Clear cache
        redis_client.delete(f"playlist:{playlist_id}")
        
        return jsonify({'success': True, 'message': 'Đã thêm video vào playlist'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/users/<user_id>/playlists', methods=['GET'])
def get_user_playlists(user_id):
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Check if requesting own playlists or public playlists
        is_own_request = False
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                current_user_id = get_jwt_identity()
                is_own_request = current_user_id == user_id
            except:
                pass
        
        # Build query
        query = {'userId': ObjectId(user_id)}
        if not is_own_request:
            query['visibility'] = 'public'
        
        playlists = list(playlists_collection.find(query)
                        .sort('updatedAt', -1)
                        .skip(skip)
                        .limit(limit))
        
        total = playlists_collection.count_documents(query)
        
        return jsonify({
            'success': True,
            'playlists': convert_objectids(playlists),
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# ADVANCED SEARCH API
@app.route('/api/search/advanced', methods=['GET'])
def advanced_search():
    query = request.args.get('q', '')
    category = request.args.get('category', None)
    sort_by = request.args.get('sort', 'relevance')
    duration = request.args.get('duration', None)
    date = request.args.get('date', None)
    min_views = request.args.get('min_views', None)
    max_views = request.args.get('max_views', None)
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    
    try:
        # Build aggregation pipeline
        pipeline = []
        
        # Match stage
        match_stage = {
            'visibility': 'public',
            'status': 'ready'
        }
        
        if query:
            match_stage['$text'] = {'$search': query}
        
        if category:
            match_stage['category'] = category
        
        if duration:
            if duration == 'short':
                match_stage['duration'] = {'$lt': 240}
            elif duration == 'medium':
                match_stage['duration'] = {'$gte': 240, '$lt': 1200}
            elif duration == 'long':
                match_stage['duration'] = {'$gte': 1200}
        
        if date:
            date_filter = {}
            if date == 'today':
                date_filter = {'$gte': datetime.datetime.now() - datetime.timedelta(days=1)}
            elif date == 'week':
                date_filter = {'$gte': datetime.datetime.now() - datetime.timedelta(days=7)}
            elif date == 'month':
                date_filter = {'$gte': datetime.datetime.now() - datetime.timedelta(days=30)}
            elif date == 'year':
                date_filter = {'$gte': datetime.datetime.now() - datetime.timedelta(days=365)}
            
            if date_filter:
                match_stage['publishedAt'] = date_filter
        
        if min_views or max_views:
            views_filter = {}
            if min_views:
                views_filter['$gte'] = int(min_views)
            if max_views:
                views_filter['$lte'] = int(max_views)
            if views_filter:
                match_stage['stats.views'] = views_filter
        
        pipeline.append({'$match': match_stage})
        
        # Add score for text search
        if query:
            pipeline.append({'$addFields': {'score': {'$meta': 'textScore'}}})
        
        # Sort stage
        if sort_by == 'relevance' and query:
            pipeline.append({'$sort': {'score': {'$meta': 'textScore'}}})
        elif sort_by == 'date':
            pipeline.append({'$sort': {'publishedAt': -1}})
        elif sort_by == 'views':
            pipeline.append({'$sort': {'stats.views': -1}})
        elif sort_by == 'rating':
            pipeline.append({'$sort': {'stats.likes': -1}})
        
        # Count total for pagination
        count_pipeline = pipeline.copy()
        count_pipeline.append({'$count': 'total'})
        count_result = list(videos_collection.aggregate(count_pipeline))
        total = count_result[0]['total'] if count_result else 0
        
        # Add pagination
        pipeline.extend([
            {'$skip': (page - 1) * limit},
            {'$limit': limit}
        ])
        
        # Execute search
        videos = list(videos_collection.aggregate(pipeline))
        
        return jsonify({
            'success': True,
            'videos': convert_objectids(videos),
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# VIDEO RECOMMENDATIONS API
@app.route('/api/videos/<video_id>/recommendations', methods=['GET'])
def get_video_recommendations(video_id):
    limit = int(request.args.get('limit', 20))
    
    try:
        # Check cache first
        cache_key = f"recommendations:{video_id}:{limit}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify({'success': True, 'videos': cached})
        
        # Get current video
        current_video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not current_video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        # Recommendation algorithm
        pipeline = [
            {
                '$match': {
                    '_id': {'$ne': ObjectId(video_id)},
                    'visibility': 'public',
                    'status': 'ready'
                }
            },
            {
                '$addFields': {
                    'relevanceScore': {
                        '$add': [
                            # Same category bonus
                            {'$cond': [
                                {'$eq': ['$category', current_video['category']]},
                                10, 0
                            ]},
                            # Same uploader bonus
                            {'$cond': [
                                {'$eq': ['$userId', current_video['userId']]},
                                15, 0
                            ]},
                            # Tags similarity (simplified)
                            {'$size': {
                                '$setIntersection': [
                                    '$tags',
                                    current_video.get('tags', [])
                                ]
                            }},
                            # Recent popularity
                            {'$multiply': [
                                {'$log10': {'$add': ['$stats.views', 1]}},
                                0.1
                            ]},
                            # Engagement rate
                            {'$multiply': [
                                {'$divide': [
                                    {'$add': ['$stats.likes', '$stats.commentCount']},
                                    {'$add': ['$stats.views', 1]}
                                ]},
                                100
                            ]}
                        ]
                    }
                }
            },
            {'$sort': {'relevanceScore': -1, 'publishedAt': -1}},
            {'$limit': limit},
            {
                '$project': {
                    '_id': 1,
                    'title': 1,
                    'thumbnailPath': 1,
                    'duration': 1,
                    'username': 1,
                    'userId': 1,
                    'stats.views': 1,
                    'publishedAt': 1,
                    'relevanceScore': 1
                }
            }
        ]
        
        recommendations = list(videos_collection.aggregate(pipeline))
        result = convert_objectids(recommendations)
        
        # Cache for 10 minutes
        cache_set(cache_key, result, 600)
        
        return jsonify({'success': True, 'videos': result})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# TRENDING VIDEOS API
@app.route('/api/videos/trending', methods=['GET'])
def get_trending_videos():
    limit = int(request.args.get('limit', 50))
    category = request.args.get('category', None)
    
    try:
        cache_key = f"trending:{category}:{limit}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify({'success': True, 'videos': cached})
        
        # Trending algorithm
        pipeline = [
            {
                '$match': {
                    'visibility': 'public',
                    'status': 'ready',
                    'publishedAt': {'$gte': datetime.datetime.now() - datetime.timedelta(days=30)}
                }
            }
        ]
        
        if category:
            pipeline[0]['$match']['category'] = category
        
        pipeline.extend([
            {
                '$addFields': {
                    'trendingScore': {
                        '$add': [
                            # Recent views weight (40%)
                            {'$multiply': [
                                {'$ifNull': ['$stats.viewsLast24Hours', 0]},
                                0.4
                            ]},
                            # Likes weight (25%)
                            {'$multiply': ['$stats.likes', 0.25]},
                            # Comments weight (20%)
                            {'$multiply': ['$stats.commentCount', 0.2]},
                            # Recency bonus (15%)
                            {'$multiply': [
                                {'$divide': [
                                    {'$subtract': [
                                        datetime.datetime.now(),
                                        '$publishedAt'
                                    ]},
                                    86400000  # Convert to days
                                ]},
                                -0.15  # Negative for recency bonus
                            ]}
                        ]
                    }
                }
            },
            {'$sort': {'trendingScore': -1}},
            {'$limit': limit}
        ])
        
        videos = list(videos_collection.aggregate(pipeline))
        result = convert_objectids(videos)
        
        # Cache for 30 minutes
        cache_set(cache_key, result, 1800)
        
        return jsonify({'success': True, 'videos': result})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# OPTIMIZED VIDEO LIST API
@app.route('/api/videos/optimized', methods=['GET'])
def get_videos_optimized():
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 24)), 50)  # Max 50 per request
    category = request.args.get('category')
    sort_by = request.args.get('sort', 'recent')
    
    try:
        cache_key = f"videos:{page}:{limit}:{category}:{sort_by}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify(cached)
        
        # Build query
        match_query = {'visibility': 'public', 'status': 'ready'}
        if category:
            match_query['category'] = category
        
        # Build sort
        sort_options = {
            'recent': {'publishedAt': -1},
            'popular': {'stats.views': -1},
            'trending': {'stats.viewsLast24Hours': -1},
            'top_rated': {'stats.likes': -1}
        }
        sort_field = sort_options.get(sort_by, {'publishedAt': -1})
        
        # Use aggregation for better performance
        pipeline = [
            {'$match': match_query},
            {'$sort': sort_field},
            {'$skip': (page - 1) * limit},
            {'$limit': limit},
            {
                '$project': {
                    '_id': 1,
                    'title': 1,
                    'thumbnailPath': 1,
                    'duration': 1,
                    'username': 1,
                    'userId': 1,
                    'category': 1,
                    'stats.views': 1,
                    'publishedAt': 1
                }
            }
        ]
        
        videos = list(videos_collection.aggregate(pipeline))
        
        # Get total count for pagination
        total = videos_collection.count_documents(match_query)
        
        result = {
            'success': True,
            'videos': convert_objectids(videos),
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit,
            'hasNext': page * limit < total
        }
        
        # Cache for 5 minutes
        cache_set(cache_key, result, 300)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# USER ANALYTICS API
@app.route('/api/analytics/dashboard', methods=['GET'])
@jwt_required()
def get_user_analytics():
    user_id = get_jwt_identity()
    days = int(request.args.get('days', 30))
    
    try:
        cache_key = f"analytics:{user_id}:{days}"
        cached = cache_get(cache_key)
        if cached:
            return jsonify({'success': True, 'analytics': cached})
        
        start_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        # Get video analytics
        pipeline = [
            {
                '$match': {
                    'userId': ObjectId(user_id),
                    'date': {'$gte': start_date}
                }
            },
            {
                '$group': {
                    '_id': None,
                    'totalViews': {'$sum': '$views'},
                    'totalWatchTime': {'$sum': '$watchTime'},
                    'totalLikes': {'$sum': '$likes'},
                    'totalComments': {'$sum': '$comments'},
                    'subscribersGained': {'$sum': '$subscribers'}
                }
            }
        ]
        
        analytics_result = list(video_analytics_collection.aggregate(pipeline))
        
        # Get top videos
        top_videos = list(videos_collection.find(
            {'userId': ObjectId(user_id)},
            {'title': 1, 'stats.views': 1, 'publishedAt': 1}
        ).sort('stats.views', -1).limit(10))
        
        analytics = {
            'summary': analytics_result[0] if analytics_result else {
                'totalViews': 0,
                'totalWatchTime': 0,
                'totalLikes': 0,
                'totalComments': 0,
                'subscribersGained': 0
            },
            'topVideos': convert_objectids(top_videos)
        }
        
        # Cache for 1 hour
        cache_set(cache_key, analytics, 3600)
        
        return jsonify({'success': True, 'analytics': analytics})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)