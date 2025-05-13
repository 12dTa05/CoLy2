// VideoCard.js
import React from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaClock } from 'react-icons/fa';

import { getThumbnailUrl } from '../api';

const VideoCard = ({ video }) => {
  // Tính thời gian đã trôi qua từ khi đăng
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 0) return 'Vừa tải lên';
    
    let interval = Math.floor(seconds / 31536000); // Số giây trong năm
    if (interval >= 1) return `${interval} năm trước`;
    
    interval = Math.floor(seconds / 2592000); // Số giây trong tháng
    if (interval >= 1) return `${interval} tháng trước`;
    
    interval = Math.floor(seconds / 86400); // Số giây trong ngày
    if (interval >= 1) return `${interval} ngày trước`;
    
    interval = Math.floor(seconds / 3600); // Số giây trong giờ
    if (interval >= 1) return `${interval} giờ trước`;
    
    interval = Math.floor(seconds / 60); // Số giây trong phút
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
  
  // Xác định URL thumbnail
  const thumbnailUrl = video.thumbnailPath 
    ? getThumbnailUrl(video.thumbnailPath)
    : 'https://via.placeholder.com/480x270?text=No+Thumbnail';
  
  return (
    <Card className="h-100 shadow-sm hover-scale" as={Link} to={`/video/${video._id}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s' }}>
      <div className="position-relative">
        <Card.Img 
          variant="top" 
          src={thumbnailUrl} 
          alt={video.title}
          style={{ height: '180px', objectFit: 'cover' }}
        />
        
        {/* Badge thời lượng */}
        {video.duration > 0 && (
          <div 
            className="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 m-2 rounded"
            style={{ fontSize: '0.8rem' }}
          >
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Badge trạng thái */}
        {video.status !== 'ready' && (
          <div 
            className="position-absolute top-0 start-0 bg-warning text-dark px-2 py-1 m-2 rounded"
            style={{ fontSize: '0.8rem' }}
          >
            {video.status === 'processing' ? 'Đang xử lý' : 'Đang tải lên'}
          </div>
        )}
      </div>
      
      <Card.Body>
        <Card.Title as="h6" className="mb-2 text-truncate">
          {video.title}
        </Card.Title>
        
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted">{video.username}</small>
        </div>
        
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            <FaEye className="me-1" />
            {video.stats.views}
          </small>
          <small className="text-muted">
            <FaClock className="me-1" />
            {video.publishedAt ? formatTimeAgo(video.publishedAt) : 'Chưa xuất bản'}
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VideoCard;