# SERVER PYTHON (app.py)

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

app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3000", "https://yourdomain.com"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days=30)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

jwt = JWTManager(app)

# Rate Limiting Setup
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri="redis://localhost:6379",
    strategy="fixed-window"
)

# Kết nối MongoDB
client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death', maxPoolSize=50, minPoolSize=5, maxIdleTimeMS=30000, serverSelectionTimeoutMS=5000)
db = client['CoLy2']
users_collection = db['users']
videos_collection = db['videos']
comments_collection = db['comments']
views_collection = db['views']
search_index_collection = db['search_index']
subscriptions_collection = db['subscriptions']
watch_history_collection = db['watch_history']
saved_videos_collection = db['saved_videos']
watch_later_collection = db['watch_later']
liked_videos_collection = db['liked_videos']

# Tạo các indexes
def setup_indexes():
    # Videos collection
    videos_collection.create_index([("title", "text"), ("description", "text"), ("tags", "text")])
    videos_collection.create_index([("userId", 1)])
    videos_collection.create_index([("category", 1)])
    videos_collection.create_index([("createdAt", -1)])
    videos_collection.create_index([("stats.views", -1)])
    videos_collection.create_index([("videoId", 1)], unique=True)
    videos_collection.create_index([("visibility", 1), ("status", 1)])
    
    # Comments collection
    comments_collection.create_index([("videoId", 1), ("createdAt", -1)])
    comments_collection.create_index([("userId", 1)])
    
    # Views collection
    views_collection.create_index([("videoId", 1), ("watchedAt", 1)])
    views_collection.create_index([("userId", 1), ("watchedAt", 1)])
    
    # Search Index collection
    search_index_collection.create_index([("term", 1)])

    # Subscriptions
    subscriptions_collection.create_index([("subscriberId", 1), ("channelId", 1)], unique=True)
    subscriptions_collection.create_index([("channelId", 1)])
    
    # Watch History  
    watch_history_collection.create_index([("userId", 1), ("watchedAt", -1)])
    watch_history_collection.create_index([("videoId", 1)])
    
    # Saved Videos
    saved_videos_collection.create_index([("userId", 1), ("savedAt", -1)])
    saved_videos_collection.create_index([("videoId", 1)])
    
    # Watch Later
    watch_later_collection.create_index([("userId", 1), ("addedAt", -1)])
    watch_later_collection.create_index([("videoId", 1)])
    
    # Liked Videos
    liked_videos_collection.create_index([("userId", 1), ("likedAt", -1)])
    liked_videos_collection.create_index([("videoId", 1)])


# Thư mục lưu trữ video
UPLOAD_FOLDER = 'uploads'
HLS_FOLDER = 'hls'
THUMBNAILS_FOLDER = 'thumbnails'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(HLS_FOLDER, exist_ok=True)
os.makedirs(THUMBNAILS_FOLDER, exist_ok=True)

# Các hàm tiện ích
def generate_unique_id():
    return str(uuid.uuid4())

def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def check_password(stored_password, provided_password):
    return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password)

def extract_tags_from_text(text):
    # Trích xuất các từ khóa từ tiêu đề và mô tả
    words = re.findall(r'\w+', text.lower())
    # Loại bỏ các từ phổ biến
    common_words = {'và', 'hoặc', 'trong', 'với', 'các', 'là', 'của', 'cho', 'này', 'những'}
    return [word for word in words if len(word) > 2 and word not in common_words]

def update_search_index(video_id, title, description, tags):
    # Cập nhật chỉ mục tìm kiếm
    all_terms = extract_tags_from_text(title + ' ' + description) + tags
    
    for term in set(all_terms):  # Sử dụng set để loại bỏ các từ trùng lặp
        # Tìm hoặc tạo mới term trong search_index
        search_index_collection.update_one(
            {'term': term},
            {'$addToSet': {'videoIds': ObjectId(video_id)},
             '$set': {'updatedAt': datetime.datetime.now()}},
            upsert=True
        )

# Security Middleware
@app.before_request
def security_headers():
    """Apply security headers and CSRF protection"""
    # Skip CSRF for GET requests and preflight OPTIONS
    if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
        # Allow API endpoints to skip CSRF for now (implement proper CSRF tokens later)
        if request.content_type and 'application/json' in request.content_type:
            pass  # Skip CSRF for JSON API requests for now

@app.after_request
def after_request(response):
    """Add security headers"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# API đăng ký người dùng
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    display_name = data.get('displayName', username)
    
    # Kiểm tra dữ liệu đầu vào
    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'Thiếu thông tin người dùng'}), 400
    
    # Kiểm tra username và email đã tồn tại chưa
    if users_collection.find_one({'$or': [{'username': username}, {'email': email}]}):
        return jsonify({'success': False, 'message': 'Tên người dùng hoặc email đã tồn tại'}), 400
    
    # Hash mật khẩu
    hashed_password = hash_password(password)
    
    # Tạo người dùng mới
    new_user = {
        'username': username,
        'email': email,
        'password': hashed_password,
        'displayName': display_name,
        'avatar': None,
        'role': 'user',
        'subscriptions': [],
        'createdAt': datetime.datetime.now(),
        'updatedAt': datetime.datetime.now(),
        'lastLogin': datetime.datetime.now(),
        'stats': {
            'videoCount': 0,
            'subscriberCount': 0,
            'totalViews': 0
        }
    }
    
    user_id = users_collection.insert_one(new_user).inserted_id
    
    return jsonify({
        'success': True, 
        'userId': str(user_id),
        'message': 'Đăng ký thành công'
    }), 201

# API đăng nhập
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username', '')  # Có thể nhận username hoặc email
    password = data.get('password', '')
    
    # Tìm người dùng theo username hoặc email
    user = users_collection.find_one({
        '$or': [
            {'username': username_or_email},
            {'email': username_or_email}
        ]
    })
    
    if not user or not check_password(user['password'], password):
        return jsonify({'success': False, 'message': 'Thông tin đăng nhập không đúng'}), 401
    
    # Cập nhật thời gian đăng nhập
    users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {'lastLogin': datetime.datetime.now()}}
    )
    
    # Tạo token JWT
    access_token = create_access_token(identity=str(user['_id']))
    
    return jsonify({
        'success': True, 
        'access_token': access_token,
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'displayName': user['displayName'],
            'avatar': user['avatar'],
            'role': user['role']
        }
    })

# API tải lên video
@app.route('/api/videos/upload', methods=['POST'])
@jwt_required()
def upload_video():
    if 'video' not in request.files:
        return jsonify({'success': False, 'message': 'Không có tệp nào được tải lên'}), 400
    
    video_file = request.files['video']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')
    category = request.form.get('category', 'Khác')
    tags = request.form.get('tags', '').split(',')
    visibility = request.form.get('visibility', 'public')
    
    if video_file.filename == '':
        return jsonify({'success': False, 'message': 'Không có tệp nào được chọn'}), 400
    
    # Tạo ID duy nhất cho video
    video_id = generate_unique_id()
    original_filename = secure_filename(video_file.filename)
    extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    
    # Lưu video gốc
    original_path = os.path.join(UPLOAD_FOLDER, f"{video_id}.{extension}")
    video_file.save(original_path)
    
    # Lấy thông tin người dùng
    user_id = get_jwt_identity()
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    
    # Lưu thông tin vào MongoDB
    video_doc = {
        'videoId': video_id,
        'title': title,
        'description': description,
        'userId': ObjectId(user_id),
        'username': user['username'],  # Lưu username để truy vấn nhanh
        'category': category,
        'tags': [tag.strip() for tag in tags if tag.strip()],
        'visibility': visibility,
        'duration': 0,  # Sẽ được cập nhật sau khi xử lý
        
        'format': 'hls',
        'originalFilename': original_filename,
        'contentPath': os.path.join(HLS_FOLDER, video_id),
        'thumbnailPath': os.path.join(THUMBNAILS_FOLDER, f"{video_id}.jpg"),
        
        'status': 'uploading',
        'processingDetails': {
            'progress': 0,
            'error': None,
            'quality': []  # Sẽ được cập nhật với thông tin chi tiết từng chất lượng
        },
        
        'stats': {
            'views': 0,
            'likes': 0,
            'dislikes': 0,
            'commentCount': 0,
            'viewsLastHour': 0,
            'viewsLast24Hours': 0,
            'viewsLastWeek': 0
        },
        
        'createdAt': datetime.datetime.now(),
        'updatedAt': datetime.datetime.now(),
        'publishedAt': None  # Sẽ được cập nhật khi xử lý hoàn tất
    }
    
    db_video_id = videos_collection.insert_one(video_doc).inserted_id
    
    # Tăng số lượng video của người dùng
    users_collection.update_one(
        {'_id': ObjectId(user_id)},
        {'$inc': {'stats.videoCount': 1}}
    )
    
    # Bắt đầu quá trình chuyển đổi HLS (không đồng bộ)
    # Trong thực tế, bạn nên sử dụng hàng đợi công việc như Celery
    subprocess.Popen([
        '/home/death/miniconda3/envs/CoLy/bin/python3.11', 'convert_to_hls.py', 
        '--video_path', original_path,
        '--output_dir', os.path.join(HLS_FOLDER, video_id),
        '--thumbnail_path', os.path.join(THUMBNAILS_FOLDER, f"{video_id}.jpg"),
        '--video_id', str(db_video_id)
    ])
    
    # Cập nhật chỉ mục tìm kiếm
    update_search_index(str(db_video_id), title, description, video_doc['tags'])
    
    return jsonify({
        'success': True, 
        'videoId': str(db_video_id),
        'message': 'Video đã được tải lên, đang xử lý chuyển đổi HLS'
    }), 201

@app.route('/api/videos/<video_id>/status', methods=['GET'])
@jwt_required()
def check_video_status(video_id):
    user_id = get_jwt_identity()
    
    # Tìm video
    try:
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
    except:
        video = videos_collection.find_one({'videoId': video_id})
    
    if not video:
        return jsonify({'success': False, 'message': 'Không tìm thấy video'}), 404
    
    # Kiểm tra quyền sở hữu
    if str(video['userId']) != user_id:
        return jsonify({'success': False, 'message': 'Bạn không có quyền truy cập video này'}), 403
    
    # Trả về thông tin trạng thái
    status_info = {
        'videoId': str(video['_id']),
        'status': video['status'],
        'progress': video['processingDetails']['progress'] if 'processingDetails' in video else 0,
        'currentStep': video['processingDetails'].get('currentStep', 'Đang xử lý') if 'processingDetails' in video else 'Đang xử lý',
        'error': video['processingDetails'].get('error', None) if 'processingDetails' in video else None,
        'thumbnail': video.get('thumbnailPath', None),
        'duration': video.get('duration', 0)
    }
    
    return jsonify({
        'success': True,
        'statusInfo': status_info
    })

# API lấy danh sách video của người dùng hiện tại
@app.route('/api/videos/my', methods=['GET'])
@jwt_required()
def get_my_videos():
    user_id = get_jwt_identity()
    
    # Tham số phân trang
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    # Lấy tổng số video
    total = videos_collection.count_documents({'userId': ObjectId(user_id)})
    
    # Lấy danh sách video với phân trang
    videos = list(videos_collection.find(
        {'userId': ObjectId(user_id)}
    ).sort(
        'createdAt', -1
    ).skip(skip).limit(limit))
    
    # Chuyển đổi ObjectId thành chuỗi
    for video in videos:
        video['_id'] = str(video['_id'])
        video['userId'] = str(video['userId'])
    
    return jsonify({
        'success': True, 
        'videos': videos,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    })

# API lấy danh sách video công khai
@app.route('/api/videos/public', methods=['GET'])
def get_public_videos():
    # Tham số phân trang
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 100))
    skip = (page - 1) * limit
    
    # Lấy tổng số video công khai và đã sẵn sàng
    total = videos_collection.count_documents({
        'visibility': 'public',
        'status': 'ready'
    })
    
    # Lấy danh sách video công khai với phân trang, sắp xếp theo thời gian tạo
    videos = list(videos_collection.find(
        {
            'visibility': 'public',
            'status': 'ready'
        }
    ).sort(
        'createdAt', -1
    ).skip(skip).limit(limit))
    
    # Chuyển đổi ObjectId thành chuỗi
    for video in videos:
        video['_id'] = str(video['_id'])
        video['userId'] = str(video['userId'])
    
    return jsonify({
        'success': True, 
        'videos': videos,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    })

# API tìm kiếm video
@app.route('/api/search', methods=['GET'])
def search_videos():
    query = request.args.get('q', '')
    category = request.args.get('category', None)
    sort_by = request.args.get('sort', 'relevance')  # 'relevance', 'date', 'views'
    duration = request.args.get('duration', None)  # 'short', 'medium', 'long'
    date = request.args.get('date', None)  # 'today', 'week', 'month', 'year'
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # Xây dựng query MongoDB
    search_filter = {
        'visibility': 'public',
        'status': 'ready'
    }
    
    # Text search với trọng số
    if query:
        search_filter['$text'] = {'$search': query}
    
    # Thêm bộ lọc
    if category:
        search_filter['category'] = category
    
    if duration:
        if duration == 'short':
            search_filter['duration'] = {'$lt': 240}  # < 4 phút
        elif duration == 'medium':
            search_filter['duration'] = {'$gte': 240, '$lt': 1200}  # 4-20 phút
        elif duration == 'long':
            search_filter['duration'] = {'$gte': 1200}  # > 20 phút
    
    if date:
        if date == 'today':
            search_filter['publishedAt'] = {'$gte': datetime.datetime.now() - datetime.timedelta(days=1)}
        elif date == 'week':
            search_filter['publishedAt'] = {'$gte': datetime.datetime.now() - datetime.timedelta(days=7)}
        elif date == 'month':
            search_filter['publishedAt'] = {'$gte': datetime.datetime.now() - datetime.timedelta(days=30)}
        elif date == 'year':
            search_filter['publishedAt'] = {'$gte': datetime.datetime.now() - datetime.timedelta(days=365)}
    
    # Sắp xếp kết quả
    sort_options = {
        'relevance': [('score', {'$meta': 'textScore'})],
        'date': [('publishedAt', -1)],
        'views': [('stats.views', -1)]
    }
    
    # Thực hiện truy vấn với phân trang
    skip = (page - 1) * limit
    
    if query and sort_by == 'relevance':
        videos = list(videos_collection.find(
            search_filter,
            {'score': {'$meta': 'textScore'}}
        ).sort(
            sort_options[sort_by]
        ).skip(skip).limit(limit))
    else:
        videos = list(videos_collection.find(
            search_filter
        ).sort(
            sort_options[sort_by]
        ).skip(skip).limit(limit))
    
    # Đếm tổng số kết quả
    total = videos_collection.count_documents(search_filter)
    
    # Chuyển đổi ObjectId thành chuỗi
    for video in videos:
        video['_id'] = str(video['_id'])
        video['userId'] = str(video['userId'])
    
    return jsonify({
        'success': True,
        'videos': videos,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    })

# API lấy thông tin chi tiết video
@app.route('/api/videos/<video_id>', methods=['GET'])
def get_video(video_id):
    # Kiểm tra format của video_id
    try:
        if len(video_id) != 24:  # Không phải ObjectId
            # Tìm theo videoId field
            video = videos_collection.find_one({'videoId': video_id})
        else:
            # Tìm theo _id
            video = videos_collection.find_one({'_id': ObjectId(video_id)})
    except:
        # Nếu lỗi, thử tìm theo videoId
        video = videos_collection.find_one({'videoId': video_id})
    
    if not video:
        return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
    
    # Kiểm tra quyền xem video
    if video['visibility'] != 'public':
        # Kiểm tra người dùng có đăng nhập không
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Bạn không có quyền xem video này'}), 403
        
        try:
            # Lấy user_id từ token
            user_id = get_jwt_identity()
            # Chỉ cho phép chủ sở hữu video xem video không công khai
            if str(video['userId']) != user_id:
                return jsonify({'success': False, 'message': 'Bạn không có quyền xem video này'}), 403
        except:
            return jsonify({'success': False, 'message': 'Bạn không có quyền xem video này'}), 403
    
    # Lấy thông tin người tải lên
    uploader = users_collection.find_one({'_id': video['userId']})
    uploader_info = {
        'id': str(uploader['_id']),
        'username': uploader['username'],
        'displayName': uploader['displayName'],
        'avatar': uploader['avatar'],
        'subscriberCount': uploader['stats']['subscriberCount']
    }
   
    # Lấy 5 bình luận mới nhất
    recent_comments = list(comments_collection.find(
        {'videoId': ObjectId(video['_id']), 'parentId': None}
    ).sort('createdAt', -1).limit(5))
    
    # Chuyển đổi ObjectId thành chuỗi
    for comment in recent_comments:
        comment['_id'] = str(comment['_id'])
        comment['videoId'] = str(comment['videoId'])
        comment['userId'] = str(comment['userId'])
    
    # Chuyển đổi ObjectId thành chuỗi
    video['_id'] = str(video['_id'])
    video['userId'] = str(video['userId'])
    
    # Ghi lại lượt xem
    try:
        # Lấy thông tin người dùng nếu đã đăng nhập
        user_id = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
        
                from jwt import decode
                decoded = decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                user_id = decoded.get('sub')
            except:
                pass
       
        is_video_owner = False
        if user_id and str(video['userId']) == user_id or user_id == None:
            is_video_owner = True

        print(video['userId'])
        print(user_id)
        print(f"Is video owner: {is_video_owner}")

        # Lưu lượt xem
        if not is_video_owner:
            view_record = {
                'videoId': ObjectId(video['_id']),
                'userId': ObjectId(user_id) if user_id else None,
                'ip': request.remote_addr,
                'userAgent': request.headers.get('User-Agent', ''),
                'watchDuration': 0,  # Sẽ được cập nhật sau
                'watchedAt': datetime.datetime.now(),
                'completionRate': 0  # Sẽ được cập nhật sau
            }
            views_collection.insert_one(view_record)
            
            # Tăng lượt xem
            videos_collection.update_one(
                {'_id': ObjectId(video['_id'])},
                {'$inc': {
                    'stats.views': 0.5,
                    'stats.viewsLastHour': 0.5,
                    'stats.viewsLast24Hours': 0.5,
                    'stats.viewsLastWeek': 0.5
                }}
            )
            
            # Cập nhật tổng lượt xem cho người dùng
            users_collection.update_one(
                {'_id': ObjectId(video['userId'])},
                {'$inc': {'stats.totalViews': 1}}
        )
    except Exception as e:
        print(f"Lỗi khi ghi lượt xem: {e}")
    
    return jsonify({
        'success': True,
        'video': video,
        'uploader': uploader_info,
        'comments': recent_comments
    })

# API thêm bình luận
@app.route('/api/videos/<video_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(video_id):
    data = request.get_json()
    content = data.get('content', '').strip()
    parent_id = data.get('parentId', None)
    
    if not content:
        return jsonify({'success': False, 'message': 'Nội dung bình luận không được để trống'}), 400
    
    # Tìm video
    try:
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
    except:
        return jsonify({'success': False, 'message': 'ID video không hợp lệ'}), 400
    
    # Lấy thông tin người dùng
    user_id = get_jwt_identity()
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    
    # Tạo bình luận mới
    new_comment = {
        'videoId': ObjectId(video_id),
        'userId': ObjectId(user_id),
        'username': user['username'],
        'displayName': user['displayName'],
        'avatar': user['avatar'],
        'content': content,
        'likes': 0,
        'dislikes': 0,
        'createdAt': datetime.datetime.now(),
        'updatedAt': datetime.datetime.now(),
        'parentId': ObjectId(parent_id) if parent_id else None,
        'replies': []
    }
    
    comment_id = comments_collection.insert_one(new_comment).inserted_id
    
    # Nếu là reply, cập nhật bình luận cha
    if parent_id:
        comments_collection.update_one(
            {'_id': ObjectId(parent_id)},
            {'$push': {'replies': comment_id}}
        )
    
    # Tăng số lượng bình luận
    videos_collection.update_one(
        {'_id': ObjectId(video_id)},
        {'$inc': {'stats.commentCount': 1}}
    )
    
    # Chuyển đổi ObjectId thành chuỗi
    new_comment['_id'] = str(comment_id)
    new_comment['videoId'] = str(new_comment['videoId'])
    new_comment['userId'] = str(new_comment['userId'])
    if new_comment['parentId']:
        new_comment['parentId'] = str(new_comment['parentId'])
    
    return jsonify({
        'success': True,
        'comment': new_comment
    }), 201

# API lấy danh sách bình luận
@app.route('/api/videos/<video_id>/comments', methods=['GET'])
def get_comments(video_id):
    # Tham số phân trang
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    skip = (page - 1) * limit
    
    try:
        # Lấy danh sách bình luận gốc
        comments = list(comments_collection.find(
            {'videoId': ObjectId(video_id), 'parentId': None}
        ).sort('createdAt', -1).skip(skip).limit(limit))
        
        # Lấy tổng số bình luận gốc
        total = comments_collection.count_documents({
            'videoId': ObjectId(video_id),
            'parentId': None
        })
        
        # Lấy các câu trả lời cho mỗi bình luận
        for comment in comments:
            if 'replies' in comment and comment['replies']:
                reply_ids = [ObjectId(reply_id) for reply_id in comment['replies']]
                replies = list(comments_collection.find({'_id': {'$in': reply_ids}}))
                comment['replies'] = replies
            else:
                comment['replies'] = []
        
        # Chuyển đổi ObjectId thành chuỗi
        for comment in comments:
            comment['_id'] = str(comment['_id'])
            comment['videoId'] = str(comment['videoId'])
            comment['userId'] = str(comment['userId'])
            for reply in comment['replies']:
                reply['_id'] = str(reply['_id'])
                reply['videoId'] = str(reply['videoId'])
                reply['userId'] = str(reply['userId'])
                if reply['parentId']:
                    reply['parentId'] = str(reply['parentId'])
        
        return jsonify({
            'success': True,
            'comments': comments,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi khi lấy bình luận: {str(e)}'}), 500

# API ĐĂNG KÝ KÊNH
@app.route('/api/channels/<channel_id>/subscribe', methods=['POST'])
@jwt_required()
def subscribe_channel(channel_id):
    user_id = get_jwt_identity()
    
    # Kiểm tra kênh tồn tại
    channel = users_collection.find_one({'_id': ObjectId(channel_id)})
    if not channel:
        return jsonify({'success': False, 'message': 'Kênh không tồn tại'}), 404
    
    # Không thể đăng ký kênh của chính mình
    if str(channel['_id']) == user_id:
        return jsonify({'success': False, 'message': 'Không thể đăng ký kênh của chính bạn'}), 400
    
    try:
        # Kiểm tra đã đăng ký chưa
        existing = subscriptions_collection.find_one({
            'subscriberId': ObjectId(user_id),
            'channelId': ObjectId(channel_id)
        })
        
        if existing:
            return jsonify({'success': False, 'message': 'Đã đăng ký kênh này rồi'}), 400
        
        # Tạo subscription mới
        subscription = {
            'subscriberId': ObjectId(user_id),
            'channelId': ObjectId(channel_id),
            'subscribedAt': datetime.datetime.now(),
            'notificationEnabled': True
        }
        
        subscriptions_collection.insert_one(subscription)
        
        # Tăng số subscriber cho kênh
        users_collection.update_one(
            {'_id': ObjectId(channel_id)},
            {'$inc': {'stats.subscriberCount': 1}}
        )
        
        return jsonify({'success': True, 'message': 'Đăng ký kênh thành công'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/channels/<channel_id>/unsubscribe', methods=['DELETE'])
@jwt_required()
def unsubscribe_channel(channel_id):
    user_id = get_jwt_identity()
    
    try:
        # Xóa subscription
        result = subscriptions_collection.delete_one({
            'subscriberId': ObjectId(user_id),
            'channelId': ObjectId(channel_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Chưa đăng ký kênh này'}), 400
        
        # Giảm số subscriber
        users_collection.update_one(
            {'_id': ObjectId(channel_id)},
            {'$inc': {'stats.subscriberCount': -1}}
        )
        
        return jsonify({'success': True, 'message': 'Hủy đăng ký thành công'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/subscriptions', methods=['GET'])
@jwt_required()
def get_subscriptions():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Lấy danh sách subscription với thông tin kênh
        pipeline = [
            {'$match': {'subscriberId': ObjectId(user_id)}},
            {'$lookup': {
                'from': 'users',
                'localField': 'channelId',
                'foreignField': '_id',
                'as': 'channel'
            }},
            {'$unwind': '$channel'},
            {'$sort': {'subscribedAt': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        subscriptions = list(subscriptions_collection.aggregate(pipeline))
        
        # Đếm tổng số subscription
        total = subscriptions_collection.count_documents({'subscriberId': ObjectId(user_id)})
        
        # Chuyển đổi ObjectId
        for sub in subscriptions:
            sub['_id'] = str(sub['_id'])
            sub['subscriberId'] = str(sub['subscriberId'])
            sub['channelId'] = str(sub['channelId'])
            sub['channel']['_id'] = str(sub['channel']['_id'])
        
        return jsonify({
            'success': True,
            'subscriptions': subscriptions,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/subscriptions/videos', methods=['GET'])
@jwt_required()
def get_subscription_videos():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Lấy danh sách kênh đã đăng ký
        subscribed_channels = list(subscriptions_collection.find(
            {'subscriberId': ObjectId(user_id)},
            {'channelId': 1}
        ))
        
        channel_ids = [sub['channelId'] for sub in subscribed_channels]
        
        if not channel_ids:
            return jsonify({
                'success': True,
                'videos': [],
                'total': 0,
                'page': page,
                'pages': 0
            })
        
        # Lấy video từ các kênh đã đăng ký
        videos = list(videos_collection.find({
            'userId': {'$in': channel_ids},
            'visibility': 'public',
            'status': 'ready'
        }).sort('publishedAt', -1).skip(skip).limit(limit))
        
        total = videos_collection.count_documents({
            'userId': {'$in': channel_ids},
            'visibility': 'public',
            'status': 'ready'
        })
        
        # Chuyển đổi ObjectId
        for video in videos:
            video['_id'] = str(video['_id'])
            video['userId'] = str(video['userId'])
        
        return jsonify({
            'success': True,
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API LỊCH SỬ XEM
@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_watch_history():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Lấy lịch sử xem với thông tin video
        pipeline = [
            {'$match': {'userId': ObjectId(user_id)}},
            {'$lookup': {
                'from': 'videos',
                'localField': 'videoId',
                'foreignField': '_id',
                'as': 'video'
            }},
            {'$unwind': '$video'},
            {'$match': {'video.status': 'ready'}},
            {'$sort': {'watchedAt': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        history = list(watch_history_collection.aggregate(pipeline))
        
        total = watch_history_collection.count_documents({'userId': ObjectId(user_id)})
        
        # Chuyển đổi ObjectId
        for item in history:
            item['_id'] = str(item['_id'])
            item['userId'] = str(item['userId'])
            item['videoId'] = str(item['videoId'])
            item['video']['_id'] = str(item['video']['_id'])
            item['video']['userId'] = str(item['video']['userId'])
        
        return jsonify({
            'success': True,
            'history': history,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/history', methods=['DELETE'])
@jwt_required()
def clear_watch_history():
    user_id = get_jwt_identity()
    
    try:
        watch_history_collection.delete_many({'userId': ObjectId(user_id)})
        return jsonify({'success': True, 'message': 'Đã xóa lịch sử xem'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API VIDEO ĐÃ LƯU
@app.route('/api/videos/<video_id>/save', methods=['POST'])
@jwt_required()
def save_video(video_id):
    user_id = get_jwt_identity()
    
    try:
        # Kiểm tra video tồn tại
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        # Kiểm tra đã lưu chưa
        existing = saved_videos_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if existing:
            return jsonify({'success': False, 'message': 'Video đã được lưu rồi'}), 400
        
        # Lưu video
        saved_video = {
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id),
            'savedAt': datetime.datetime.now()
        }
        
        saved_videos_collection.insert_one(saved_video)
        
        return jsonify({'success': True, 'message': 'Đã lưu video'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/videos/<video_id>/unsave', methods=['DELETE'])
@jwt_required()
def unsave_video(video_id):
    user_id = get_jwt_identity()
    
    try:
        result = saved_videos_collection.delete_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Video chưa được lưu'}), 400
        
        return jsonify({'success': True, 'message': 'Đã bỏ lưu video'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/saved-videos', methods=['GET'])
@jwt_required()
def get_saved_videos():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        pipeline = [
            {'$match': {'userId': ObjectId(user_id)}},
            {'$lookup': {
                'from': 'videos',
                'localField': 'videoId',
                'foreignField': '_id',
                'as': 'video'
            }},
            {'$unwind': '$video'},
            {'$match': {'video.status': 'ready'}},
            {'$sort': {'savedAt': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        saved_videos = list(saved_videos_collection.aggregate(pipeline))
        
        total = saved_videos_collection.count_documents({'userId': ObjectId(user_id)})
        
        # Chuyển đổi ObjectId
        for item in saved_videos:
            item['_id'] = str(item['_id'])
            item['userId'] = str(item['userId'])
            item['videoId'] = str(item['videoId'])
            item['video']['_id'] = str(item['video']['_id'])
            item['video']['userId'] = str(item['video']['userId'])
        
        return jsonify({
            'success': True,
            'savedVideos': saved_videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API XEM SAU
@app.route('/api/videos/<video_id>/watch-later', methods=['POST'])
@jwt_required()
def add_to_watch_later(video_id):
    user_id = get_jwt_identity()
    
    try:
        # Kiểm tra video tồn tại
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        # Kiểm tra đã thêm chưa
        existing = watch_later_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if existing:
            return jsonify({'success': False, 'message': 'Video đã có trong danh sách xem sau'}), 400
        
        # Thêm vào xem sau
        watch_later_item = {
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id),
            'addedAt': datetime.datetime.now()
        }
        
        watch_later_collection.insert_one(watch_later_item)
        
        return jsonify({'success': True, 'message': 'Đã thêm vào xem sau'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/videos/<video_id>/watch-later', methods=['DELETE'])
@jwt_required()
def remove_from_watch_later(video_id):
    user_id = get_jwt_identity()
    
    try:
        result = watch_later_collection.delete_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Video không có trong danh sách xem sau'}), 400
        
        return jsonify({'success': True, 'message': 'Đã xóa khỏi xem sau'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/watch-later', methods=['GET'])
@jwt_required()
def get_watch_later():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        pipeline = [
            {'$match': {'userId': ObjectId(user_id)}},
            {'$lookup': {
                'from': 'videos',
                'localField': 'videoId',
                'foreignField': '_id',
                'as': 'video'
            }},
            {'$unwind': '$video'},
            {'$match': {'video.status': 'ready'}},
            {'$sort': {'addedAt': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        watch_later_videos = list(watch_later_collection.aggregate(pipeline))
        
        total = watch_later_collection.count_documents({'userId': ObjectId(user_id)})
        
        # Chuyển đổi ObjectId
        for item in watch_later_videos:
            item['_id'] = str(item['_id'])
            item['userId'] = str(item['userId'])
            item['videoId'] = str(item['videoId'])
            item['video']['_id'] = str(item['video']['_id'])
            item['video']['userId'] = str(item['video']['userId'])
        
        return jsonify({
            'success': True,
            'watchLaterVideos': watch_later_videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API VIDEO ĐÃ THÍCH
@app.route('/api/videos/<video_id>/like', methods=['POST'])
@jwt_required()
def like_video(video_id):
    user_id = get_jwt_identity()
    
    try:
        # Kiểm tra video tồn tại
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        # Kiểm tra đã thích chưa
        existing = liked_videos_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if existing:
            return jsonify({'success': False, 'message': 'Đã thích video này rồi'}), 400
        
        # Thêm vào danh sách thích
        liked_video = {
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id),
            'likedAt': datetime.datetime.now()
        }
        
        liked_videos_collection.insert_one(liked_video)
        
        # Tăng số like cho video
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$inc': {'stats.likes': 1}}
        )
        
        return jsonify({'success': True, 'message': 'Đã thích video'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/videos/<video_id>/unlike', methods=['DELETE'])
@jwt_required()
def unlike_video(video_id):
    user_id = get_jwt_identity()
    
    try:
        result = liked_videos_collection.delete_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Chưa thích video này'}), 400
        
        # Giảm số like
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$inc': {'stats.likes': -1}}
        )
        
        return jsonify({'success': True, 'message': 'Đã bỏ thích video'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

@app.route('/api/liked-videos', methods=['GET'])
@jwt_required()
def get_liked_videos():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        pipeline = [
            {'$match': {'userId': ObjectId(user_id)}},
            {'$lookup': {
                'from': 'videos',
                'localField': 'videoId',
                'foreignField': '_id',
                'as': 'video'
            }},
            {'$unwind': '$video'},
            {'$match': {'video.status': 'ready'}},
            {'$sort': {'likedAt': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        liked_videos = list(liked_videos_collection.aggregate(pipeline))
        
        total = liked_videos_collection.count_documents({'userId': ObjectId(user_id)})
        
        # Chuyển đổi ObjectId
        for item in liked_videos:
            item['_id'] = str(item['_id'])
            item['userId'] = str(item['userId'])
            item['videoId'] = str(item['videoId'])
            item['video']['_id'] = str(item['video']['_id'])
            item['video']['userId'] = str(item['video']['userId'])
        
        return jsonify({
            'success': True,
            'likedVideos': liked_videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# Cập nhật hàm ghi lượt xem để lưu vào history
def record_view(video_id, user_id, request):
    """Ghi lại lượt xem và lưu vào lịch sử"""
    try:
        # Lưu vào views collection (như cũ)
        view_record = {
            'videoId': ObjectId(video_id),
            'userId': ObjectId(user_id) if user_id else None,
            'ip': request.remote_addr,
            'userAgent': request.headers.get('User-Agent', ''),
            'watchDuration': 0,
            'watchedAt': datetime.datetime.now(),
            'completionRate': 0
        }
        views_collection.insert_one(view_record)
        
        # Lưu vào watch history nếu user đã đăng nhập
        if user_id:
            # Kiểm tra đã có trong history chưa (trong 24h gần nhất)
            recent_watch = watch_history_collection.find_one({
                'userId': ObjectId(user_id),
                'videoId': ObjectId(video_id),
                'watchedAt': {'$gte': datetime.datetime.now() - datetime.timedelta(hours=24)}
            })
            
            if not recent_watch:
                history_record = {
                    'userId': ObjectId(user_id),
                    'videoId': ObjectId(video_id),
                    'watchedAt': datetime.datetime.now(),
                    'watchDuration': 0,
                    'completionRate': 0
                }
                watch_history_collection.insert_one(history_record)
                
    except Exception as e:
        print(f"Lỗi khi ghi lượt xem: {e}")

# API lấy thông tin kênh
@app.route('/api/channels/<channel_id>', methods=['GET'])
def get_channel_info(channel_id):
    try:
        # Lấy thông tin người dùng
        channel = users_collection.find_one({'_id': ObjectId(channel_id)})
        if not channel:
            return jsonify({'success': False, 'message': 'Kênh không tồn tại'}), 404
        
        # Kiểm tra đăng ký nếu user đã đăng nhập
        is_subscribed = False
        if request.headers.get('Authorization'):
            try:
                user_id = get_jwt_identity()
                subscription = subscriptions_collection.find_one({
                    'subscriberId': ObjectId(user_id),
                    'channelId': ObjectId(channel_id)
                })
                is_subscribed = subscription is not None
            except:
                pass
        
        # Chuyển đổi ObjectId
        channel['_id'] = str(channel['_id'])
        
        return jsonify({
            'success': True,
            'channel': channel,
            'isSubscribed': is_subscribed
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API lấy video của kênh
@app.route('/api/channels/<channel_id>/videos', methods=['GET'])
def get_channel_videos(channel_id):
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Lấy video của kênh
        videos = list(videos_collection.find({
            'userId': ObjectId(channel_id),
            'visibility': 'public',
            'status': 'ready'
        }).sort('publishedAt', -1).skip(skip).limit(limit))
        
        total = videos_collection.count_documents({
            'userId': ObjectId(channel_id),
            'visibility': 'public',
            'status': 'ready'
        })
        
        # Chuyển đổi ObjectId
        for video in videos:
            video['_id'] = str(video['_id'])
            video['userId'] = str(video['userId'])
        
        return jsonify({
            'success': True,
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API kiểm tra trạng thái tương tác của user với video
@app.route('/api/videos/<video_id>/user-status', methods=['GET'])
@jwt_required()
def get_video_user_status(video_id):
    user_id = get_jwt_identity()
    
    try:
        # Kiểm tra các trạng thái
        is_liked = liked_videos_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        }) is not None
        
        is_saved = saved_videos_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        }) is not None
        
        is_in_watch_later = watch_later_collection.find_one({
            'userId': ObjectId(user_id),
            'videoId': ObjectId(video_id)
        }) is not None
        
        # Kiểm tra đăng ký kênh
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        is_subscribed = False
        if video:
            is_subscribed = subscriptions_collection.find_one({
                'subscriberId': ObjectId(user_id),
                'channelId': video['userId']
            }) is not None
        
        return jsonify({
            'success': True,
            'status': {
                'liked': is_liked,
                'saved': is_saved,
                'inWatchLater': is_in_watch_later,
                'subscribed': is_subscribed
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API cập nhật thông tin video
@app.route('/api/videos/<video_id>', methods=['PUT'])
@jwt_required()
def update_video(video_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Kiểm tra quyền sở hữu
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        if str(video['userId']) != user_id:
            return jsonify({'success': False, 'message': 'Bạn không có quyền chỉnh sửa video này'}), 403
        
        # Cập nhật thông tin
        update_data = {}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'category' in data:
            update_data['category'] = data['category']
        if 'tags' in data:
            update_data['tags'] = data['tags']
        if 'visibility' in data:
            update_data['visibility'] = data['visibility']
        
        update_data['updatedAt'] = datetime.datetime.now()
        
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': update_data}
        )
        
        return jsonify({'success': True, 'message': 'Cập nhật video thành công'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API xóa video
@app.route('/api/videos/<video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    user_id = get_jwt_identity()
    
    try:
        # Kiểm tra quyền sở hữu
        video = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video:
            return jsonify({'success': False, 'message': 'Video không tồn tại'}), 404
        
        if str(video['userId']) != user_id:
            return jsonify({'success': False, 'message': 'Bạn không có quyền xóa video này'}), 403
        
        # Xóa các file liên quan
        import shutil
        if 'contentPath' in video and os.path.exists(video['contentPath']):
            shutil.rmtree(video['contentPath'])
        
        if 'thumbnailPath' in video and os.path.exists(video['thumbnailPath']):
            os.remove(video['thumbnailPath'])
        
        # Xóa các bản ghi liên quan
        videos_collection.delete_one({'_id': ObjectId(video_id)})
        comments_collection.delete_many({'videoId': ObjectId(video_id)})
        views_collection.delete_many({'videoId': ObjectId(video_id)})
        watch_history_collection.delete_many({'videoId': ObjectId(video_id)})
        saved_videos_collection.delete_many({'videoId': ObjectId(video_id)})
        watch_later_collection.delete_many({'videoId': ObjectId(video_id)})
        liked_videos_collection.delete_many({'videoId': ObjectId(video_id)})
        
        # Giảm số lượng video của user
        users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$inc': {'stats.videoCount': -1}}
        )
        
        return jsonify({'success': True, 'message': 'Xóa video thành công'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API lấy video trending
@app.route('/api/videos/trending', methods=['GET'])
def get_trending_videos():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        # Tính điểm trending dựa trên views gần đây và likes
        pipeline = [
            {'$match': {
                'visibility': 'public',
                'status': 'ready',
                'publishedAt': {'$gte': datetime.datetime.now() - datetime.timedelta(days=7)}
            }},
            {'$addFields': {
                'trendingScore': {
                    '$add': [
                        {'$multiply': ['$stats.viewsLastWeek', 1]},
                        {'$multiply': ['$stats.likes', 2]}
                    ]
                }
            }},
            {'$sort': {'trendingScore': -1}},
            {'$skip': skip},
            {'$limit': limit}
        ]
        
        videos = list(videos_collection.aggregate(pipeline))
        total = videos_collection.count_documents({
            'visibility': 'public',
            'status': 'ready',
            'publishedAt': {'$gte': datetime.datetime.now() - datetime.timedelta(days=7)}
        })
        
        # Chuyển đổi ObjectId
        for video in videos:
            video['_id'] = str(video['_id'])
            video['userId'] = str(video['userId'])
        
        return jsonify({
            'success': True,
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API lấy video đề xuất
@app.route('/api/videos/recommended', methods=['GET'])
@jwt_required(optional=True)
def get_recommended_videos():
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit
    
    try:
        if user_id:
            # Đề xuất dựa trên lịch sử xem và đăng ký
            # Lấy categories từ video đã xem
            watched_categories = list(watch_history_collection.aggregate([
                {'$match': {'userId': ObjectId(user_id)}},
                {'$lookup': {
                    'from': 'videos',
                    'localField': 'videoId',
                    'foreignField': '_id',
                    'as': 'video'
                }},
                {'$unwind': '$video'},
                {'$group': {'_id': '$video.category', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 3}
            ]))
            
            preferred_categories = [cat['_id'] for cat in watched_categories]
            
            # Đề xuất video từ categories yêu thích
            videos = list(videos_collection.find({
                'visibility': 'public',
                'status': 'ready',
                'category': {'$in': preferred_categories} if preferred_categories else {'$exists': True}
            }).sort('stats.views', -1).skip(skip).limit(limit))
        else:
            # Người dùng chưa đăng nhập - đề xuất video phổ biến
            videos = list(videos_collection.find({
                'visibility': 'public',
                'status': 'ready'
            }).sort('stats.views', -1).skip(skip).limit(limit))
        
        total = len(videos)
        
        # Chuyển đổi ObjectId
        for video in videos:
            video['_id'] = str(video['_id'])
            video['userId'] = str(video['userId'])
        
        return jsonify({
            'success': True,
            'videos': videos,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500

# API phục vụ file HLS
@app.route('/hls/<path:filename>')
def serve_hls(filename):
    return send_from_directory(HLS_FOLDER, filename)

# API phục vụ file thumbnail
@app.route('/thumbnails/<path:filename>')
def serve_thumbnail(filename):
    return send_from_directory(THUMBNAILS_FOLDER, filename)

# Thiết lập indexes khi khởi động
setup_indexes()

if __name__ == '__main__':
    app.run(debug=True, port=8000)