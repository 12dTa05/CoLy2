// VideoCard.js - Updated với YouTube-style design
import React from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaClock, FaUser } from 'react-icons/fa';

import { getThumbnailUrl } from '../api';

const VideoCard = ({ video }) => {
  // Tính thời gian đã trôi qua từ khi đăng
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 0) return 'Vừa tải lên';
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} năm trước`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} tháng trước`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} ngày trước`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} giờ trước`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} phút trước`;
    
    return `${Math.floor(seconds)} giây trước`;
  };
  
  // Định dạng thời lượng video
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hrs > 0) {
      result += `${hrs}:${mins < 10 ? '0' : ''}`;
    }
    result += `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    
    return result;
  };

  // Định dạng số lượt xem
  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };
  
  // Xác định URL thumbnail
  const thumbnailUrl = video.thumbnailPath 
    ? getThumbnailUrl(video.thumbnailPath)
    : 'https://via.placeholder.com/320x180?text=No+Thumbnail';
  
  return (
    <div className="video-card">
      <Link 
        to={`/video/${video._id}`} 
        className="text-decoration-none text-reset"
      >
        {/* Thumbnail Container */}
        <div 
          className="thumbnail-container position-relative mb-3"
          style={{
            aspectRatio: '16/9',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <img 
            src={thumbnailUrl} 
            alt={video.title}
            className="w-100 h-100"
            style={{ 
              objectFit: 'cover',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          />
          
          {/* Duration Badge */}
          {video.duration > 0 && (
            <div 
              className="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 m-2"
              style={{ 
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.8) !important'
              }}
            >
              {formatDuration(video.duration)}
            </div>
          )}
          
          {/* Status Badge */}
          {video.status !== 'ready' && (
            <div 
              className="position-absolute top-0 start-0 px-2 py-1 m-2"
              style={{ 
                fontSize: '11px',
                fontWeight: '500',
                borderRadius: '4px',
                backgroundColor: video.status === 'processing' ? '#ff9800' : '#f44336',
                color: 'white'
              }}
            >
              {video.status === 'processing' ? 'Đang xử lý' : 'Đang tải lên'}
            </div>
          )}
        </div>
        
        {/* Video Info */}
        <div className="video-info">
          <div className="d-flex">
            {/* Channel Avatar */}
            <div className="flex-shrink-0 me-3">
              <div 
                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                style={{ width: '36px', height: '36px' }}
              >
                <FaUser size={16} color="white" />
              </div>
            </div>
            
            {/* Video Details */}
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              {/* Title */}
              <h6 
                className="video-title mb-1"
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  lineHeight: '20px',
                  color: '#0f0f0f',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word'
                }}
                title={video.title}
              >
                {video.title}
              </h6>
              
              {/* Channel Name */}
              <p 
                className="channel-name mb-1"
                style={{
                  fontSize: '12px',
                  color: '#606060',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {video.username}
              </p>
              
              {/* Views and Date */}
              <div 
                className="video-stats d-flex align-items-center"
                style={{
                  fontSize: '12px',
                  color: '#606060'
                }}
              >
                <span>{formatViews(Math.ceil(video.stats.views))} lượt xem</span>
                <span className="mx-1">•</span>
                <span>
                  {video.publishedAt ? formatTimeAgo(video.publishedAt) : 'Chưa xuất bản'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default VideoCard;