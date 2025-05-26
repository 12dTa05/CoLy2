# database_schema.py - Optimized database schema and indexes

from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
import datetime

def setup_optimized_indexes(db):
    """Setup optimized indexes for better performance"""
    
    # Videos collection - Core indexes
    videos_collection = db['videos']
    videos_collection.create_index([("title", TEXT), ("description", TEXT), ("tags", TEXT)], weights={"title": 10, "description": 5, "tags": 3})
    videos_collection.create_index([("userId", ASCENDING)])
    videos_collection.create_index([("category", ASCENDING), ("publishedAt", DESCENDING)])
    videos_collection.create_index([("visibility", ASCENDING), ("status", ASCENDING), ("publishedAt", DESCENDING)])
    videos_collection.create_index([("stats.views", DESCENDING)])
    videos_collection.create_index([("stats.likes", DESCENDING)])
    videos_collection.create_index([("publishedAt", DESCENDING)])
    videos_collection.create_index([("videoId", ASCENDING)], unique=True)
    
    # Compound indexes for common queries
    videos_collection.create_index([("visibility", ASCENDING), ("status", ASCENDING), ("stats.views", DESCENDING)])
    videos_collection.create_index([("userId", ASCENDING), ("publishedAt", DESCENDING)])
    videos_collection.create_index([("category", ASCENDING), ("stats.views", DESCENDING)])
    
    # Users collection
    users_collection = db['users']
    users_collection.create_index([("username", ASCENDING)], unique=True)
    users_collection.create_index([("email", ASCENDING)], unique=True)
    users_collection.create_index([("stats.subscriberCount", DESCENDING)])
    users_collection.create_index([("stats.totalViews", DESCENDING)])
    
    # Comments collection
    comments_collection = db['comments']
    comments_collection.create_index([("videoId", ASCENDING), ("createdAt", DESCENDING)])
    comments_collection.create_index([("userId", ASCENDING)])
    comments_collection.create_index([("parentId", ASCENDING)])
    
    # Views collection for analytics
    views_collection = db['views']
    views_collection.create_index([("videoId", ASCENDING), ("watchedAt", DESCENDING)])
    views_collection.create_index([("userId", ASCENDING), ("watchedAt", DESCENDING)])
    views_collection.create_index([("watchedAt", DESCENDING)])
    
    # Subscriptions
    subscriptions_collection = db['subscriptions']
    subscriptions_collection.create_index([("subscriberId", ASCENDING), ("channelId", ASCENDING)], unique=True)
    subscriptions_collection.create_index([("channelId", ASCENDING), ("subscribedAt", DESCENDING)])
    subscriptions_collection.create_index([("subscriberId", ASCENDING), ("subscribedAt", DESCENDING)])
    
    # Playlists collection (new)
    playlists_collection = db['playlists']
    playlists_collection.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    playlists_collection.create_index([("visibility", ASCENDING), ("createdAt", DESCENDING)])
    playlists_collection.create_index([("title", TEXT), ("description", TEXT)])
    
    # Playlist items collection (new)
    playlist_items_collection = db['playlist_items']
    playlist_items_collection.create_index([("playlistId", ASCENDING), ("addedAt", DESCENDING)])
    playlist_items_collection.create_index([("videoId", ASCENDING)])
    playlist_items_collection.create_index([("playlistId", ASCENDING), ("order", ASCENDING)])
    
    # Watch history optimization
    watch_history_collection = db['watch_history']
    watch_history_collection.create_index([("userId", ASCENDING), ("watchedAt", DESCENDING)])
    watch_history_collection.create_index([("videoId", ASCENDING), ("watchedAt", DESCENDING)])
    
    # Saved videos optimization  
    saved_videos_collection = db['saved_videos']
    saved_videos_collection.create_index([("userId", ASCENDING), ("savedAt", DESCENDING)])
    saved_videos_collection.create_index([("videoId", ASCENDING)])
    
    # Watch later optimization
    watch_later_collection = db['watch_later']
    watch_later_collection.create_index([("userId", ASCENDING), ("addedAt", DESCENDING)])
    watch_later_collection.create_index([("videoId", ASCENDING)])
    
    # Liked videos optimization
    liked_videos_collection = db['liked_videos']
    liked_videos_collection.create_index([("userId", ASCENDING), ("likedAt", DESCENDING)])
    liked_videos_collection.create_index([("videoId", ASCENDING)])
    
    # Notifications collection (new)
    notifications_collection = db['notifications']
    notifications_collection.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    notifications_collection.create_index([("isRead", ASCENDING), ("createdAt", DESCENDING)])
    
    # Search logs for analytics (new)
    search_logs_collection = db['search_logs']
    search_logs_collection.create_index([("query", ASCENDING), ("searchedAt", DESCENDING)])
    search_logs_collection.create_index([("userId", ASCENDING), ("searchedAt", DESCENDING)])
    
    # Video analytics collection (new)
    video_analytics_collection = db['video_analytics']
    video_analytics_collection.create_index([("videoId", ASCENDING), ("date", DESCENDING)])
    video_analytics_collection.create_index([("userId", ASCENDING), ("date", DESCENDING)])

def create_collections_schema(db):
    """Create collections with proper schema validation"""
    
    # Playlists schema
    playlist_schema = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["title", "userId", "visibility", "createdAt"],
            "properties": {
                "title": {"bsonType": "string", "maxLength": 150},
                "description": {"bsonType": "string", "maxLength": 5000},
                "userId": {"bsonType": "objectId"},
                "visibility": {"enum": ["public", "private", "unlisted"]},
                "videoCount": {"bsonType": "int", "minimum": 0},
                "thumbnailVideoId": {"bsonType": "objectId"},
                "createdAt": {"bsonType": "date"},
                "updatedAt": {"bsonType": "date"}
            }
        }
    }
    
    # Playlist items schema
    playlist_item_schema = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["playlistId", "videoId", "addedAt", "order"],
            "properties": {
                "playlistId": {"bsonType": "objectId"},
                "videoId": {"bsonType": "objectId"},
                "addedAt": {"bsonType": "date"},
                "order": {"bsonType": "int", "minimum": 0}
            }
        }
    }
    
    # Video analytics schema
    analytics_schema = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["videoId", "date", "views", "watchTime"],
            "properties": {
                "videoId": {"bsonType": "objectId"},
                "userId": {"bsonType": "objectId"},
                "date": {"bsonType": "date"},
                "views": {"bsonType": "int", "minimum": 0},
                "watchTime": {"bsonType": "int", "minimum": 0},
                "likes": {"bsonType": "int", "minimum": 0},
                "comments": {"bsonType": "int", "minimum": 0},
                "subscribers": {"bsonType": "int", "minimum": 0}
            }
        }
    }
    
    try:
        db.create_collection("playlists", validator=playlist_schema)
        db.create_collection("playlist_items", validator=playlist_item_schema)
        db.create_collection("video_analytics", validator=analytics_schema)
    except Exception as e:
        print(f"Collections may already exist: {e}")

def init_database(connection_string):
    """Initialize database with optimized schema"""
    client = MongoClient(connection_string)
    db = client['CoLy2']
    
    create_collections_schema(db)
    setup_optimized_indexes(db)
    
    return db