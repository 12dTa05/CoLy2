// LikedVideos.js - Trang Video đã thích (YouTube Style)
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaSearch, FaThumbsUp, FaTrash, FaPlay, FaSortAmountDown, FaEye, FaHeart, FaRandom, FaDownload, FaPlus, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getLikedVideos, unlikeVideo, getThumbnailUrl } from '../api';

const LikedVideos = () => {
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Tải video đã thích
  useEffect(() => {
    fetchLikedVideos();
  }, [page]);

  const fetchLikedVideos = async () => {
    try {
      setLoading(true);
      const response = await getLikedVideos(page, 50);
      setLikedVideos(response.data.likedVideos);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
    } catch (err) {
      setError('Không thể tải video đã thích');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Bỏ thích video
  const handleUnlikeVideo = async (videoId, videoTitle) => {
    try {
      await unlikeVideo(videoId);
      toast.success('Đã bỏ thích video');
      
      // Cập nhật danh sách
      setLikedVideos(likedVideos.filter(item => item.video._id !== videoId));
      setTotal(total - 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi bỏ thích video');
    }
  };

  // Phát tất cả video (chuyển đến video đầu tiên)
  const handlePlayAll = () => {
    if (likedVideos.length > 0) {
      window.location.href = `/video/${likedVideos[0].video._id}?playlist=liked`;
    }
  };

  // Định dạng thời gian thích
  const formatLikedTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    });
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

  // Tính tổng thời lượng playlist
  const getTotalDuration = () => {
    const totalSeconds = likedVideos.reduce((sum, item) => sum + item.video.duration, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    }
    return `${minutes} phút`;
  };

  if (loading && page === 1) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', color: 'white' }}>
      <div className="container-fluid" style={{ maxWidth: '1284px', padding: '24px' }}>
        <div className="row">
          {/* Left Column - Playlist Info */}
          <div className="col-12 col-lg-5 col-xl-4 mb-4">
            <div 
              className="position-sticky"
              style={{ 
                top: '90px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '24px',
                minHeight: '400px'
              }}
            >
              {/* Playlist Thumbnail */}
              <div className="mb-4 position-relative">
                {likedVideos.length > 0 ? (
                  <div className="position-relative">
                    <img 
                      src={likedVideos[0].video.thumbnailPath ? getThumbnailUrl(likedVideos[0].video.thumbnailPath) : 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
                      alt="Playlist thumbnail"
                      className="w-100 rounded"
                      style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                    />
                    {/* Guitar Icon Overlay */}
                    <div 
                      className="position-absolute bottom-0 start-0 p-3"
                      style={{ 
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        borderRadius: '0 0 12px 12px',
                        width: '100%'
                      }}
                    >
                      <div style={{ fontSize: '32px', color: 'white' }}>🎸</div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="w-100 rounded d-flex align-items-center justify-content-center"
                    style={{ 
                      aspectRatio: '16/9', 
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px dashed rgba(255,255,255,0.3)'
                    }}
                  >
                    <FaHeart size={48} style={{ opacity: 0.5 }} />
                  </div>
                )}
              </div>

              <h2 className="h4 mb-2" style={{ color: 'white', fontWeight: '600' }}>
                Video đã thích
              </h2>
              
              <p className="mb-2" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                Đạm Vũ Đức Anh
              </p>
              
              <div className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                <div className="d-flex align-items-center mb-1">
                  <FaLock className="me-2" size={12} />
                  <span>{total} video</span>
                </div>
                <div>0 lượt xem • Cập nhật lần cuối vào {total > 0 ? formatLikedTime(likedVideos[0]?.likedAt) : 'hôm nay'}</div>
              </div>

              {/* Action Buttons */}
              {total > 0 && (
                <div className="d-grid gap-2">
                  <Button
                    variant="light"
                    className="d-flex align-items-center justify-content-center fw-bold"
                    onClick={handlePlayAll}
                    style={{ borderRadius: '18px', padding: '8px 16px' }}
                  >
                    <FaPlay className="me-2" />
                    Phát tất cả
                  </Button>
                  
                  <Button
                    variant="outline-light"
                    className="d-flex align-items-center justify-content-center"
                    style={{ borderRadius: '18px', padding: '8px 16px' }}
                  >
                    <FaRandom className="me-2" />
                    Trộn bài
                  </Button>
                </div>
              )}

              {/* Download button */}
              <div className="mt-4">
                <Button
                  variant="link"
                  className="text-white p-0 text-decoration-none d-flex align-items-center"
                  style={{ fontSize: '14px', opacity: 0.8 }}
                >
                  <FaDownload className="me-2" />
                  Tải xuống
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Video List */}
          <div className="col-12 col-lg-7 col-xl-8">
            {/* Header with sort options and hide/show toggle */}
            {total > 0 && (
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <span style={{ fontSize: '14px', color: '#aaa' }} className="me-3">
                    Đã ẩn 6 video không xem được
                  </span>
                  <div className="d-flex">
                    <Button 
                      variant="link" 
                      className="text-decoration-none text-white p-0 me-3 fw-bold"
                      style={{ fontSize: '14px', border: 'none', background: 'none' }}
                    >
                      Tất cả
                    </Button>
                    <Button 
                      variant="link" 
                      className="text-decoration-none text-muted p-0 me-3"
                      style={{ fontSize: '14px', border: 'none', background: 'none' }}
                    >
                      Video
                    </Button>
                    <Button 
                      variant="link" 
                      className="text-decoration-none text-muted p-0"
                      style={{ fontSize: '14px', border: 'none', background: 'none' }}
                    >
                      Shorts
                    </Button>
                  </div>
                </div>
                
                <Dropdown>
                  <Dropdown.Toggle 
                    variant="link" 
                    className="text-decoration-none text-white p-0"
                    style={{ border: 'none', background: 'none' }}
                  >
                    <FaSortAmountDown className="me-2" />
                    Sắp xếp
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="bg-dark border-0">
                    <Dropdown.Item className="text-light" style={{ backgroundColor: 'transparent' }}>
                      Đã được thêm gần đây nhất (mặc định)
                    </Dropdown.Item>
                    <Dropdown.Item className="text-light" style={{ backgroundColor: 'transparent' }}>
                      Đã được thêm cũ nhất
                    </Dropdown.Item>
                    <Dropdown.Item className="text-light" style={{ backgroundColor: 'transparent' }}>
                      Phổ biến nhất
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            )}

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Content */}
            {!loading && likedVideos.length === 0 ? (
              <div className="text-center py-5">
                <FaThumbsUp size={48} className="mb-3 text-muted" />
                <h5 style={{ color: 'white' }}>Chưa có video nào được thích</h5>
                <p className="text-muted mb-4">Nhấn thích những video yêu thích để lưu lại tại đây.</p>
                <Button as={Link} to="/" variant="primary">
                  <FaPlus className="me-2" />
                  Tìm video để thích
                </Button>
              </div>
            ) : (
              <div>
                {/* Video List */}
                {likedVideos.map((item, index) => (
                  <div key={item._id} className="d-flex mb-2 position-relative video-item p-2" 
                       style={{ borderRadius: '8px' }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    
                    {/* Index Number */}
                    <div 
                      className="flex-shrink-0 d-flex align-items-center justify-content-center me-3"
                      style={{ width: '24px', fontSize: '14px', color: '#aaa' }}
                    >
                      {index + 1}
                    </div>
                    
                    {/* Thumbnail */}
                    <div 
                      className="flex-shrink-0 position-relative me-3"
                      style={{ width: '120px', height: '68px' }}
                    >
                      <Link to={`/video/${item.video._id}`}>
                        <img 
                          src={item.video.thumbnailPath ? getThumbnailUrl(item.video.thumbnailPath) : 'https://via.placeholder.com/120x68?text=No+Thumbnail'}
                          alt={item.video.title}
                          className="w-100 h-100 rounded"
                          style={{ objectFit: 'cover' }}
                        />
                        {item.video.duration > 0 && (
                          <div 
                            className="position-absolute bottom-0 end-0 bg-dark text-white px-1 m-1"
                            style={{ 
                              fontSize: '12px', 
                              borderRadius: '2px',
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              fontWeight: '500'
                            }}
                          >
                            {formatDuration(item.video.duration)}
                          </div>
                        )}
                      </Link>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-grow-1 me-3">
                      <Link 
                        to={`/video/${item.video._id}`}
                        className="text-decoration-none"
                      >
                        <h6 className="mb-1 text-white" style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '14px',
                          fontWeight: '400',
                          lineHeight: '20px'
                        }}>
                          {item.video.title}
                        </h6>
                      </Link>
                      
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        <Link 
                          to={`/channel/${item.video.userId}`}
                          className="text-decoration-none text-muted me-2"
                        >
                          {item.video.username}
                        </Link>
                        <span className="me-2">•</span>
                        <span className="me-2">{Math.ceil(item.video.stats.views)} lượt xem</span>
                        <span className="me-2">•</span>
                        <span>{formatLikedTime(item.likedAt)}</span>
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <div className="flex-shrink-0 d-flex align-items-center">
                      <Button
                        variant="link"
                        className="text-muted p-1"
                        onClick={() => handleUnlikeVideo(item.video._id, item.video.title)}
                        title="Bỏ thích video"
                        style={{ opacity: 0.7 }}
                      >
                        <FaTrash size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikedVideos;