# convert_to_hls.py

import argparse
import os
import subprocess
import json
import time
from pymongo import MongoClient
from bson.objectid import ObjectId
import datetime

def get_video_duration(video_path):
    """Lấy thời lượng của video bằng ffprobe"""
    cmd = [
        'ffprobe', 
        '-v', 'error', 
        '-show_entries', 'format=duration', 
        '-of', 'json', 
        video_path
    ]
    
    try:
        output = subprocess.check_output(cmd).decode('utf-8')
        data = json.loads(output)
        return float(data['format']['duration'])
    except Exception as e:
        print(f"Lỗi khi lấy thời lượng video: {e}")
        return 0

def generate_thumbnail(video_path, thumbnail_path):
    """Tạo thumbnail từ video"""
    os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
    
    # Lấy thumbnail tại thời điểm 5 giây hoặc 10% thời lượng, tùy vào giá trị nào nhỏ hơn
    duration = get_video_duration(video_path)
    thumbnail_time = min(5, duration * 0.1) if duration > 0 else 0
    
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-ss', str(thumbnail_time),
        '-frames:v', '1',
        '-q:v', '2',
        thumbnail_path
    ]
    
    try:
        subprocess.run(cmd, check=True)
        return True
    except Exception as e:
        print(f"Lỗi khi tạo thumbnail: {e}")
        return False

# Loại bỏ hàm update_video_segments vì không còn sử dụng

def convert_to_hls(video_path, output_dir, thumbnail_path, video_id):
    """Chuyển đổi video sang định dạng HLS"""
    # Kết nối MongoDB
    client = MongoClient('mongodb+srv://Death:DeathA_1205@death.8wudq.mongodb.net/CoLy2?retryWrites=true&w=majority&appName=Death')
    db = client['CoLy2']
    videos_collection = db['videos']
    
    # Cập nhật trạng thái trong MongoDB
    videos_collection.update_one(
        {'_id': ObjectId(video_id)},
        {'$set': {
            'status': 'processing',
            'processingDetails': {
                'progress': 0,
                'currentStep': 'Bắt đầu xử lý',
                'error': None,
                'quality': []
            }
        }}
    )
    
    try:
        # Tạo thư mục đầu ra
        os.makedirs(output_dir, exist_ok=True)
        
        # Lấy thời lượng video
        duration = get_video_duration(video_path)
        
        # Tạo thumbnail
        thumbnail_success = generate_thumbnail(video_path, thumbnail_path)
        
        # Cập nhật tiến trình
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {
                'duration': duration,
                'processingDetails.progress': 10
            }}
        )
        
        # Chuyển đổi video sang HLS sử dụng FFmpeg
        resolutions = [
            ('240p', '426x240', '400k', '64k'),
            ('360p', '640x360', '700k', '96k'),
            ('480p', '854x480', '1000k', '128k'),
            ('720p', '1280x720', '2500k', '192k'),
            ('1080p', '1920x1080', '5000k', '256k')
        ]
        
        quality_info = []  # Thay thế quality_list bằng danh sách chi tiết hơn
        progress_step = 80 / len(resolutions)  # 80% cho quá trình chuyển đổi
        
        for i, (name, res, v_bitrate, a_bitrate) in enumerate(resolutions):
            quality_dir = os.path.join(output_dir, name)
            os.makedirs(quality_dir, exist_ok=True)
            
            output_file = os.path.join(quality_dir, 'playlist.m3u8')
            
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-c:v', 'libx264', '-c:a', 'aac',
                '-b:v', v_bitrate, '-b:a', a_bitrate,
                '-s', res,
                '-profile:v', 'main', '-preset', 'fast',
                '-sc_threshold', '0',
                '-g', '48', '-keyint_min', '48',
                '-hls_time', '4',
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', os.path.join(quality_dir, 'segment_%03d.ts'),
                output_file
            ]
            
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            process.communicate()
            
            if process.returncode == 0:
                # Thêm thông tin chi tiết về thư mục segments
                segment_files = [f for f in os.listdir(quality_dir) if f.endswith('.ts')]
                total_size = sum(os.path.getsize(os.path.join(quality_dir, f)) for f in segment_files)
                segment_count = len(segment_files)
                
                quality_info.append({
                    'name': name,
                    'relativePath': os.path.join(os.path.basename(output_dir), name),
                    'segmentCount': segment_count,
                    'totalSize': total_size,
                    'resolution': res,
                    'videoBitrate': v_bitrate,
                    'audioBitrate': a_bitrate
                })
            
            # Cập nhật tiến trình
            current_progress = 10 + (i + 1) * progress_step
            videos_collection.update_one(
                {'_id': ObjectId(video_id)},
                {'$set': {
                    'processingDetails.progress': current_progress,
                    'processingDetails.quality': quality_info
                }}
            )
        
        # Tạo playlist chính
        master_playlist = os.path.join(output_dir, 'master.m3u8')
        with open(master_playlist, 'w') as f:
            f.write("#EXTM3U\n")
            f.write("#EXT-X-VERSION:3\n")
            
            for name, res, v_bitrate, a_bitrate in resolutions:
                if any(q['name'] == name for q in quality_info):
                    # Lấy giá trị bandwidth từ bitrate
                    video_bw = int(v_bitrate.replace('k', '')) * 1000
                    audio_bw = int(a_bitrate.replace('k', '')) * 1000
                    total_bw = video_bw + audio_bw
                    
                    # Lấy kích thước từ res (WxH)
                    width, height = res.split('x')
                    
                    f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={total_bw},RESOLUTION={res},NAME=\"{name}\"\n")
                    f.write(f"{name}/playlist.m3u8\n")
        
        # Cập nhật trạng thái hoàn thành
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {
                'status': 'ready',
                'processingDetails.progress': 100,
                'processingDetails.quality': quality_info,
                'publishedAt': datetime.datetime.now()
            }}
        )
        
        # Xóa file gốc sau khi chuyển đổi thành công
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"Đã xóa file gốc: {video_path}")
        
        print(f"Chuyển đổi thành công: {video_path} -> {output_dir}")
        
    except Exception as e:
        # Cập nhật trạng thái lỗi
        videos_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {
                'status': 'error',
                'processingDetails.error': str(e)
            }}
        )
        print(f"Lỗi khi chuyển đổi video: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Chuyển đổi video sang HLS format')
    parser.add_argument('--video_path', required=True, help='Đường dẫn đến file video gốc')
    parser.add_argument('--output_dir', required=True, help='Thư mục đầu ra cho các tệp HLS')
    parser.add_argument('--thumbnail_path', required=True, help='Đường dẫn đến file thumbnail')
    parser.add_argument('--video_id', required=True, help='ID của video trong MongoDB')
    args = parser.parse_args()
    
    convert_to_hls(args.video_path, args.output_dir, args.thumbnail_path, args.video_id)