# Redis Caching System và Performance Optimization

import redis
import json
import hashlib
import time
from functools import wraps
from datetime import datetime, timedelta
import pickle
import gzip
from pymongo import MongoClient
from bson import ObjectId
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisCache:
    def __init__(self, host='localhost', port=6379, db=0, password=None):
        try:
            self.redis_client = redis.Redis(
                host=host, 
                port=port, 
                db=db, 
                password=password,
                decode_responses=False,  # Keep binary for compression
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                max_connections=20
            )
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
        except redis.ConnectionError:
            logger.error("Failed to connect to Redis, using fallback cache")
            self.redis_client = None
        
        # Fallback in-memory cache
        self._memory_cache = {}
        self._cache_timestamps = {}
        
    def _serialize_data(self, data):
        """Serialize and compress data for storage"""
        try:
            # Convert ObjectId to string for JSON serialization
            if isinstance(data, dict):
                data = self._convert_objectids(data)
            elif isinstance(data, list):
                data = [self._convert_objectids(item) if isinstance(item, dict) else item for item in data]
            
            serialized = json.dumps(data, default=str, ensure_ascii=False)
            compressed = gzip.compress(serialized.encode('utf-8'))
            return compressed
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return None
    
    def _deserialize_data(self, data):
        """Decompress and deserialize data"""
        try:
            decompressed = gzip.decompress(data)
            return json.loads(decompressed.decode('utf-8'))
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            return None
    
    def _convert_objectids(self, data):
        """Convert ObjectId instances to strings"""
        if isinstance(data, dict):
            converted = {}
            for key, value in data.items():
                if isinstance(value, ObjectId):
                    converted[key] = str(value)
                elif isinstance(value, dict):
                    converted[key] = self._convert_objectids(value)
                elif isinstance(value, list):
                    converted[key] = [self._convert_objectids(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
                else:
                    converted[key] = value
            return converted
        return data
    
    def _generate_cache_key(self, prefix, *args, **kwargs):
        """Generate a unique cache key"""
        key_data = f"{prefix}:{':'.join(map(str, args))}"
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = ':'.join(f"{k}={v}" for k, v in sorted_kwargs)
            key_data += f":{kwargs_str}"
        
        # Hash long keys
        if len(key_data) > 200:
            key_data = f"{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"
        
        return key_data
    
    def get(self, key):
        """Get data from cache"""
        if self.redis_client:
            try:
                data = self.redis_client.get(key)
                if data:
                    return self._deserialize_data(data)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to memory cache
        if key in self._memory_cache:
            timestamp = self._cache_timestamps.get(key, 0)
            if time.time() - timestamp < 3600:  # 1 hour TTL for memory cache
                return self._memory_cache[key]
            else:
                # Expired
                del self._memory_cache[key]
                del self._cache_timestamps[key]
        
        return None
    
    def set(self, key, data, expire=3600):
        """Set data in cache with expiration"""
        serialized = self._serialize_data(data)
        if not serialized:
            return False
        
        if self.redis_client:
            try:
                return self.redis_client.setex(key, expire, serialized)
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to memory cache
        self._memory_cache[key] = data
        self._cache_timestamps[key] = time.time()
        
        # Clean old entries if memory cache gets too large
        if len(self._memory_cache) > 1000:
            self._cleanup_memory_cache()
        
        return True
    
    def delete(self, key):
        """Delete data from cache"""
        deleted = False
        
        if self.redis_client:
            try:
                deleted = self.redis_client.delete(key) > 0
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        # Also remove from memory cache
        if key in self._memory_cache:
            del self._memory_cache[key]
            del self._cache_timestamps[key]
            deleted = True
        
        return deleted
    
    def delete_pattern(self, pattern):
        """Delete all keys matching pattern"""
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    return self.redis_client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis delete pattern error: {e}")
        
        # Memory cache pattern deletion
        keys_to_delete = [key for key in self._memory_cache.keys() if pattern.replace('*', '') in key]
        for key in keys_to_delete:
            del self._memory_cache[key]
            del self._cache_timestamps[key]
        
        return len(keys_to_delete)
    
    def _cleanup_memory_cache(self):
        """Clean up old entries from memory cache"""
        current_time = time.time()
        keys_to_remove = []
        
        for key, timestamp in self._cache_timestamps.items():
            if current_time - timestamp > 3600:  # Remove entries older than 1 hour
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._memory_cache[key]
            del self._cache_timestamps[key]

# Global cache instance
cache = RedisCache()

# Caching decorators
def cache_result(prefix, expire=3600, key_generator=None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                cache_key = cache._generate_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.info(f"Cache hit for key: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            logger.info(f"Cache miss for key: {cache_key}")
            result = func(*args, **kwargs)
            
            if result is not None:
                cache.set(cache_key, result, expire)
            
            return result
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern):
    """Helper to invalidate cache by pattern"""
    return cache.delete_pattern(pattern)

# Enhanced API endpoints với caching
from flask import Flask, request, jsonify
from functools import wraps

# Cache decorators cho các API endpoints
def cache_api_response(prefix, expire=300, vary_by_user=False):
    """Cache API responses"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key based on request
            key_parts = [prefix, request.path]
            
            if request.args:
                sorted_args = sorted(request.args.items())
                key_parts.append('args:' + ':'.join(f"{k}={v}" for k, v in sorted_args))
            
            if vary_by_user and hasattr(request, 'current_user_id'):
                key_parts.append(f"user:{request.current_user_id}")
            
            cache_key = ':'.join(key_parts)
            
            # Try cache first
            cached_response = cache.get(cache_key)
            if cached_response:
                return jsonify(cached_response)
            
            # Execute function
            response = func(*args, **kwargs)
            
            # Cache successful responses
            if hasattr(response, 'get_json') and response.status_code == 200:
                response_data = response.get_json()
                if response_data.get('success'):
                    cache.set(cache_key, response_data, expire)
            
            return response
        return wrapper
    return decorator

# Enhanced video caching functions
@cache_result('video_details', expire=1800)  # 30 minutes
def get_cached_video_details(video_id):
    """Get video details with caching"""
    from pymongo import MongoClient
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    
    try:
        video = db.videos.find_one({'_id': ObjectId(video_id)})
        if video:
            # Get uploader info
            uploader = db.users.find_one({'_id': video['userId']})
            if uploader:
                uploader_info = {
                    'id': str(uploader['_id']),
                    'username': uploader['username'],
                    'displayName': uploader['displayName'],
                    'avatar': uploader['avatar'],
                    'subscriberCount': uploader['stats']['subscriberCount']
                }
            else:
                uploader_info = None
            
            # Get recent comments
            comments = list(db.comments.find(
                {'videoId': video['_id'], 'parentId': None}
            ).sort('createdAt', -1).limit(5))
            
            return {
                'video': video,
                'uploader': uploader_info,
                'comments': comments
            }
    except Exception as e:
        logger.error(f"Error fetching video details: {e}")
    
    return None

@cache_result('public_videos', expire=600, key_generator=lambda page, limit: f"public_videos:page:{page}:limit:{limit}")
def get_cached_public_videos(page=1, limit=24):
    """Get public videos with caching"""
    from pymongo import MongoClient
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    
    try:
        skip = (page - 1) * limit
        
        videos = list(db.videos.find({
            'visibility': 'public',
            'status': 'ready'
        }).sort('createdAt', -1).skip(skip).limit(limit))
        
        total = db.videos.count_documents({
            'visibility': 'public',
            'status': 'ready'
        })
        
        return {
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    except Exception as e:
        logger.error(f"Error fetching public videos: {e}")
    
    return None

@cache_result('search_results', expire=600)
def get_cached_search_results(query, category=None, sort_by='relevance', duration=None, date=None, page=1, limit=10):
    """Get search results with caching"""
    from pymongo import MongoClient
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    
    try:
        # Build search filter
        search_filter = {
            'visibility': 'public',
            'status': 'ready'
        }
        
        if query:
            search_filter['$text'] = {'$search': query}
        
        if category:
            search_filter['category'] = category
        
        if duration:
            if duration == 'short':
                search_filter['duration'] = {'$lt': 240}
            elif duration == 'medium':
                search_filter['duration'] = {'$gte': 240, '$lt': 1200}
            elif duration == 'long':
                search_filter['duration'] = {'$gte': 1200}
        
        if date:
            date_filter = datetime.now()
            if date == 'today':
                date_filter -= timedelta(days=1)
            elif date == 'week':
                date_filter -= timedelta(days=7)
            elif date == 'month':
                date_filter -= timedelta(days=30)
            elif date == 'year':
                date_filter -= timedelta(days=365)
            
            search_filter['publishedAt'] = {'$gte': date_filter}
        
        # Sort options
        sort_options = {
            'relevance': [('score', {'$meta': 'textScore'})] if query else [('publishedAt', -1)],
            'date': [('publishedAt', -1)],
            'views': [('stats.views', -1)]
        }
        
        skip = (page - 1) * limit
        
        if query and sort_by == 'relevance':
            videos = list(db.videos.find(
                search_filter,
                {'score': {'$meta': 'textScore'}}
            ).sort(sort_options[sort_by]).skip(skip).limit(limit))
        else:
            videos = list(db.videos.find(
                search_filter
            ).sort(sort_options[sort_by]).skip(skip).limit(limit))
        
        total = db.videos.count_documents(search_filter)
        
        return {
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    except Exception as e:
        logger.error(f"Error fetching search results: {e}")
    
    return None

@cache_result('user_profile', expire=1800)
def get_cached_user_profile(user_id):
    """Get user profile with caching"""
    from pymongo import MongoClient
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            # Remove sensitive data
            user.pop('password', None)
            user.pop('sessionToken', None)
            return user
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
    
    return None

# Cache invalidation helpers
def invalidate_video_cache(video_id):
    """Invalidate all cache related to a video"""
    patterns = [
        f"video_details:{video_id}*",
        "public_videos:*",
        "search_results:*"
    ]
    
    for pattern in patterns:
        invalidate_cache_pattern(pattern)

def invalidate_user_cache(user_id):
    """Invalidate all cache related to a user"""
    patterns = [
        f"user_profile:{user_id}*",
        f"*user:{user_id}*"
    ]
    
    for pattern in patterns:
        invalidate_cache_pattern(pattern)

# Performance monitoring
class PerformanceMonitor:
    def __init__(self):
        self.metrics = {}
        self.start_time = time.time()
    
    def record_metric(self, operation, duration, cache_hit=False):
        """Record performance metric"""
        if operation not in self.metrics:
            self.metrics[operation] = {
                'total_calls': 0,
                'total_duration': 0,
                'cache_hits': 0,
                'cache_misses': 0,
                'avg_duration': 0
            }
        
        metric = self.metrics[operation]
        metric['total_calls'] += 1
        metric['total_duration'] += duration
        
        if cache_hit:
            metric['cache_hits'] += 1
        else:
            metric['cache_misses'] += 1
        
        metric['avg_duration'] = metric['total_duration'] / metric['total_calls']
    
    def get_stats(self):
        """Get performance statistics"""
        return {
            'uptime': time.time() - self.start_time,
            'metrics': self.metrics,
            'cache_hit_rate': {
                op: (data['cache_hits'] / data['total_calls'] * 100) if data['total_calls'] > 0 else 0
                for op, data in self.metrics.items()
            }
        }

# Global performance monitor
perf_monitor = PerformanceMonitor()

def monitor_performance(operation_name):
    """Decorator to monitor performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            # Check if result is from cache
            cache_hit = False
            if hasattr(func, '__name__') and 'cached' in func.__name__:
                cache_hit = True
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                perf_monitor.record_metric(operation_name, duration, cache_hit)
                return result
            except Exception as e:
                duration = time.time() - start_time
                perf_monitor.record_metric(f"{operation_name}_error", duration, False)
                raise e
        return wrapper
    return decorator

# Enhanced video update with cache invalidation
def update_video_with_cache_invalidation(video_id, update_data):
    """Update video and invalidate related cache"""
    from pymongo import MongoClient
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    
    try:
        # Update video
        result = db.videos.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {**update_data, 'updatedAt': datetime.now()}}
        )
        
        if result.modified_count > 0:
            # Invalidate cache
            invalidate_video_cache(video_id)
            logger.info(f"Updated video {video_id} and invalidated cache")
            return True
    except Exception as e:
        logger.error(f"Error updating video: {e}")
    
    return False

# Cache warming functions
def warm_cache():
    """Warm up cache with frequently accessed data"""
    logger.info("Starting cache warming...")
    
    try:
        # Warm popular videos
        get_cached_public_videos(1, 24)
        
        # Warm trending videos
        get_cached_search_results("", sort_by='views', page=1, limit=20)
        
        logger.info("Cache warming completed")
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")

# Background task for cache management
import threading
import schedule

def background_cache_cleanup():
    """Background task to cleanup cache"""
    while True:
        try:
            # Clean memory cache
            if hasattr(cache, '_cleanup_memory_cache'):
                cache._cleanup_memory_cache()
            
            time.sleep(3600)  # Run every hour
        except Exception as e:
            logger.error(f"Background cache cleanup error: {e}")
            time.sleep(300)  # Wait 5 minutes on error

# Start background cleanup thread
cleanup_thread = threading.Thread(target=background_cache_cleanup, daemon=True)
cleanup_thread.start()

# Schedule cache warming
schedule.every(30).minutes.do(warm_cache)

def run_scheduled_tasks():
    """Run scheduled tasks"""
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start scheduled tasks thread
schedule_thread = threading.Thread(target=run_scheduled_tasks, daemon=True)
schedule_thread.start()

logger.info("Redis caching system initialized successfully")