// History.js - Trang Lịch sử xem (YouTube Style)
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Form, InputGroup, Modal, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaSearch, FaTrash, FaClock, FaEye, FaCalendarAlt, FaEllipsisV, FaPause } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getWatchHistory, clearWatchHistory, getThumbnailUrl } from '../api';

const History = () => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);

  // Tải lịch sử xem
  useEffect(() => {
    fetchHistory();
  }, [page]);

  // Lọc lịch sử theo tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const filtered = history.filter(item =>
        item.video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.video.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [history, searchQuery]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await getWatchHistory(page, 50);
      setHistory(response.data.history);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
    } catch (err) {
      setError('Không thể tải lịch sử xem');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Xóa toàn bộ lịch sử
  const handleClearHistory = async () => {
    try {
      await clearWatchHistory();
      toast.success('Đã xóa toàn bộ lịch sử xem');
      setHistory([]);
      setFilteredHistory([]);
      setTotal(0);
      setShowClearModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa lịch sử');
    }
  };

  // Định dạng thời gian xem
  const formatWatchTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Hôm qua lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
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

  // Nhóm lịch sử theo ngày
  const groupHistoryByDate = (historyItems) => {
    const groups = {};
    
    historyItems.forEach(item => {
      const date = new Date(item.watchedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Hôm nay';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Hôm qua';
      } else {
        // Lấy tên thứ trong tuần bằng tiếng Việt
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = dayNames[date.getDay()];
        const dayMonth = date.getDate();
        const month = date.getMonth() + 1;
        dateKey = `${dayName}, ${dayMonth} thg ${month}`;
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    
    return groups;
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

  const groupedHistory = groupHistoryByDate(filteredHistory);

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', color: 'white' }}>
      <div className="container-fluid" style={{ maxWidth: '1284px', padding: '24px' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h1 className="h4 mb-2" style={{ color: 'white', fontWeight: '400' }}>Nhật ký xem</h1>
            <div className="d-flex align-items-center">
              <span className="text-muted me-3">{total} video</span>
              <Dropdown>
                <Dropdown.Toggle 
                  variant="link" 
                  className="text-decoration-none p-0 text-muted"
                  style={{ border: 'none', background: 'none' }}
                >
                  <FaEllipsisV />
                </Dropdown.Toggle>
                <Dropdown.Menu className="bg-dark border-0">
                  <Dropdown.Item 
                    onClick={() => setShowClearModal(true)}
                    className="text-light"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <FaTrash className="me-2" />
                    Xóa tất cả nhật ký xem
                  </Dropdown.Item>
                  <Dropdown.Item 
                    className="text-light"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <FaPause className="me-2" />
                    Tạm dừng nhật ký xem
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
          
          {/* Search */}
          <div style={{ width: '300px' }}>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm trong danh sách video đã xem"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: '#121212',
                  border: '1px solid #303030',
                  color: 'white'
                }}
              />
              <InputGroup.Text style={{ backgroundColor: '#121212', border: '1px solid #303030' }}>
                <FaSearch style={{ color: '#aaa' }} />
              </InputGroup.Text>
            </InputGroup>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Content */}
        {!loading && history.length === 0 ? (
          <div className="text-center py-5">
            <FaClock size={48} className="mb-3 text-muted" />
            <h5 style={{ color: 'white' }}>Nhật ký xem trống</h5>
            <p className="text-muted">Các video bạn đã xem sẽ xuất hiện tại đây.</p>
            <Button as={Link} to="/" variant="primary">
              Khám phá video
            </Button>
          </div>
        ) : filteredHistory.length === 0 && searchQuery ? (
          <div className="text-center py-5">
            <h6 style={{ color: 'white' }}>Không tìm thấy kết quả</h6>
            <p className="text-muted">Không có video nào phù hợp với từ khóa "{searchQuery}"</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedHistory).map(([dateKey, items]) => (
              <div key={dateKey} className="mb-4">
                <h6 className="mb-3 text-muted fw-normal" style={{ fontSize: '14px' }}>
                  {dateKey}
                </h6>
                
                <div>
                  {items.map(item => (
                    <div key={item._id} className="d-flex mb-3 position-relative">
                      {/* Thumbnail */}
                      <div 
                        className="flex-shrink-0 position-relative me-3"
                        style={{ width: '168px', height: '94px' }}
                      >
                        <Link to={`/video/${item.video._id}`}>
                          <img 
                            src={item.video.thumbnailPath ? getThumbnailUrl(item.video.thumbnailPath) : 'https://via.placeholder.com/168x94?text=No+Thumbnail'}
                            alt={item.video.title}
                            className="w-100 h-100 rounded"
                            style={{ objectFit: 'cover' }}
                          />
                          {item.video.duration > 0 && (
                            <div 
                              className="position-absolute bottom-0 end-0 bg-dark text-white px-1 m-1"
                              style={{ fontSize: '12px', borderRadius: '2px', backgroundColor: 'rgba(0,0,0,0.8)' }}
                            >
                              {formatDuration(item.video.duration)}
                            </div>
                          )}
                        </Link>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-grow-1">
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
                          <span>{formatWatchTime(item.watchedAt)}</span>
                        </div>
                      </div>
                      
                      {/* More options */}
                      <div className="position-absolute" style={{ top: '0', right: '0' }}>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="link" 
                            className="text-decoration-none p-1 text-muted"
                            style={{ border: 'none', background: 'none', opacity: '0.7' }}
                          >
                            <FaEllipsisV size={12} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="bg-dark border-0">
                            <Dropdown.Item className="text-light small" style={{ backgroundColor: 'transparent' }}>
                              Xóa khỏi nhật ký xem
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear History Modal */}
        <Modal show={showClearModal} onHide={() => setShowClearModal(false)} className="text-dark">
          <Modal.Header closeButton>
            <Modal.Title>Xóa nhật ký xem</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Bạn có chắc chắn muốn xóa toàn bộ nhật ký xem không?</p>
            <p className="text-muted small">
              Hành động này không thể hoàn tác. Tất cả video trong nhật ký xem sẽ bị xóa vĩnh viễn.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleClearHistory}>
              Xóa nhật ký xem
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default History;