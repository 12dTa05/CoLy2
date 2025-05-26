// SavedVideos.js - Trang Video đã lưu
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaSearch, FaBookmark, FaTrash, FaSortAmountDown, FaEye, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getSavedVideos, unsaveVideo, getThumbnailUrl } from '../api';

const SavedVideos = () => {
  const [savedVideos, setSavedVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('savedAt'); // 'savedAt', 'title', 'views'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // Tải video đã lưu
  useEffect(() => {
    fetchSavedVideos();
  }, [page]);

  // Lọc và sắp xếp video
  useEffect(() => {
    let filtered = [...savedVideos];
    
    // Tìm kiếm
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.video.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sắp xếp
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'title':
          valueA = a.video.title.toLowerCase();
          valueB = b.video.title.toLowerCase();
          break;
        case 'views':
          valueA = a.video.stats.views;
          valueB = b.video.stats.views;
          break;
        default: // savedAt
          valueA = new Date(a.savedAt);
          valueB = new Date(b.savedAt);
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredVideos(filtered);
  }, [savedVideos, searchQuery, sortBy, sortOrder]);

  const fetchSavedVideos = async () => {
    try {
      setLoading(true);
      const response = await getSavedVideos(page, 50);
      setSavedVideos(response.data.savedVideos);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
    } catch (err) {
      setError('Không thể tải video đã lưu');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Xóa video khỏi danh sách đã lưu
  const handleUnsaveVideo = async (videoId, videoTitle) => {
    if (!window.confirm(`Bạn có chắc muốn bỏ lưu video "${videoTitle}"?`)) {
      return;
    }

    try {
      await unsaveVideo(videoId);
      toast.success('Đã bỏ lưu video');
      
      // Cập nhật danh sách
      setSavedVideos(savedVideos.filter(item => item.video._id !== videoId));
      setTotal(total - 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi bỏ lưu video');
    }
  };

  // Định dạng thời gian lưu
  const formatSaveTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  // Định dạng lượt xem
  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Render phân trang
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      items.push(
        <Button
          key={i}
          variant={i === page ? "primary" : "outline-primary"}
          size="sm"
          className="me-2"
          onClick={() => setPage(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="d-flex justify-content-center mt-4">
        {page > 1 && (
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="me-2"
            onClick={() => setPage(page - 1)}
          >
            &laquo; Trước
          </Button>
        )}
        {items}
        {page < totalPages && (
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => setPage(page + 1)}
          >
            Sau &raquo;
          </Button>
        )}
      </div>
    );
  };

  if (loading && page === 1) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Video đã lưu</h2>
          <small className="text-muted">{total} video đã lưu</small>
        </div>
      </div>

      {/* Search and Sort Controls */}
      {total > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <InputGroup style={{ maxWidth: '400px' }}>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm video đã lưu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
          </InputGroup>

          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
              <FaSortAmountDown className="me-2" />
              Sắp xếp
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item 
                active={sortBy === 'savedAt' && sortOrder === 'desc'}
                onClick={() => { setSortBy('savedAt'); setSortOrder('desc'); }}
              >
                Mới lưu nhất
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'savedAt' && sortOrder === 'asc'}
                onClick={() => { setSortBy('savedAt'); setSortOrder('asc'); }}
              >
                Cũ nhất
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'title' && sortOrder === 'asc'}
                onClick={() => { setSortBy('title'); setSortOrder('asc'); }}
              >
                Tên A-Z
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'title' && sortOrder === 'desc'}
                onClick={() => { setSortBy('title'); setSortOrder('desc'); }}
              >
                Tên Z-A
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'views' && sortOrder === 'desc'}
                onClick={() => { setSortBy('views'); setSortOrder('desc'); }}
              >
                Lượt xem cao nhất
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Content */}
      {!loading && savedVideos.length === 0 ? (
        <Alert variant="info" className="text-center mt-4">
          <FaBookmark size={48} className="mb-3 text-muted" />
          <h5>Chưa có video nào được lưu</h5>
          <p>Lưu những video yêu thích để xem lại sau này.</p>
          <Button as={Link} to="/" variant="primary">
            Khám phá video
          </Button>
        </Alert>
      ) : filteredVideos.length === 0 && searchQuery ? (
        <Alert variant="info" className="text-center">
          <h6>Không tìm thấy kết quả</h6>
          <p>Không có video nào phù hợp với từ khóa "{searchQuery}"</p>
        </Alert>
      ) : (
        <div>
          {/* Video Grid */}
          <Row className="g-3">
            {filteredVideos.map(item => (
              <Col key={item._id} xs={12}>
                <Card className="shadow-sm">
                  <div className="d-flex">
                    {/* Thumbnail */}
                    <div 
                      className="flex-shrink-0 position-relative"
                      style={{ width: '168px', height: '94px' }}
                    >
                      <Link to={`/video/${item.video._id}`}>
                        <img 
                          src={item.video.thumbnailPath ? getThumbnailUrl(item.video.thumbnailPath) : 'https://via.placeholder.com/168x94?text=No+Thumbnail'}
                          alt={item.video.title}
                          className="w-100 h-100 rounded-start"
                          style={{ objectFit: 'cover' }}
                        />
                        {item.video.duration > 0 && (
                          <div 
                            className="position-absolute bottom-0 end-0 bg-dark text-white px-1 m-1"
                            style={{ fontSize: '12px', borderRadius: '2px' }}
                          >
                            {formatDuration(item.video.duration)}
                          </div>
                        )}
                      </Link>
                    </div>
                    
                    {/* Content */}
                    <Card.Body className="py-2 d-flex justify-content-between">
                      <div className="flex-grow-1 me-3">
                        <Link 
                          to={`/video/${item.video._id}`}
                          className="text-decoration-none text-reset"
                        >
                          <h6 className="mb-1" style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {item.video.title}
                          </h6>
                        </Link>
                        
                        <div className="text-muted small">
                          <Link 
                            to={`/channel/${item.video.userId}`}
                            className="text-decoration-none text-muted"
                          >
                            {item.video.username}
                          </Link>
                          <span className="mx-2">•</span>
                          <span>{formatViews(Math.ceil(item.video.stats.views))} lượt xem</span>
                        </div>
                        
                        <div className="text-muted small mt-1">
                          <FaBookmark className="me-1" />
                          Đã lưu {formatSaveTime(item.savedAt)}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="d-flex flex-column justify-content-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleUnsaveVideo(item.video._id, item.video.title)}
                          title="Bỏ lưu video"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </Card.Body>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default SavedVideos;