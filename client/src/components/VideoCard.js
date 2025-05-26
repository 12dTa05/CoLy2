// VideoCard.js
import React from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaClock } from 'react-icons/fa';
import { getThumbnailUrl } from '../api';

const VideoCard = ({ video }) => {
  // Định dạng thời lượng
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '';
    
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

  // Định dạng lượt xem
  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return Math.ceil(views).toString();
  };

  // Định dạng thời gian đăng
  const formatPublishedTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 ngày trước';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} tháng trước`;
    return `${Math.ceil(diffDays / 365)} năm trước`;
  };

  return (
    <Card className="h-100 border-0 video-card">
      <div className="position-relative">
        <Link to={`/video/${video._id}`} className="text-decoration-none">
          <div className="thumbnail-container position-relative overflow-hidden rounded-top">
            <img 
              src={video.thumbnailPath ? getThumbnailUrl(video.thumbnailPath) : 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
              alt={video.title}
              className="card-img-top"
              style={{ 
                aspectRatio: '16/9', 
                objectFit: 'cover',
                transition: 'transform 0.2s ease'
              }}
            />
            {video.duration > 0 && (
              <div 
                className="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 m-2 rounded"
                style={{ fontSize: '12px', fontWeight: '500' }}
              >
                {formatDuration(video.duration)}
              </div>
            )}
          </div>
        </Link>
      </div>
      
      <Card.Body className="p-3">
        <Link 
          to={`/video/${video._id}`} 
          className="text-decoration-none text-reset"
        >
          <h6 className="card-title video-title mb-2" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.3',
            fontWeight: '500'
          }}>
            {video.title}
          </h6>
        </Link>
        
        <div className="text-muted small mb-1">
          <Link 
            to={`/channel/${video.userId}`}
            className="text-decoration-none text-muted channel-name"
          >
            {video.username}
          </Link>
        </div>
        
        <div className="text-muted small video-stats">
          <span className="me-2">
            <FaEye className="me-1" size={12} />
            {formatViews(video.stats.views)} lượt xem
          </span>
          <span>
            <FaClock className="me-1" size={12} />
            {video.publishedAt ? formatPublishedTime(video.publishedAt) : 'Đang xử lý'}
          </span>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VideoCard;