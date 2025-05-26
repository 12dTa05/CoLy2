// Subscriptions.js - Trang Kênh đăng ký
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Tab, Tabs, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUser, FaVideo, FaBell, FaBellSlash, FaEye, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getSubscriptions, getSubscriptionVideos, unsubscribeFromChannel } from '../api';
import VideoCard from '../components/VideoCard';

const Subscriptions = () => {
  const [activeTab, setActiveTab] = useState('videos');
  const [subscriptions, setSubscriptions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Tải dữ liệu theo tab
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchSubscriptionVideos();
    } else {
      fetchSubscriptions();
    }
  }, [activeTab, page]);

  // Tải video từ kênh đăng ký
  const fetchSubscriptionVideos = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionVideos(page, 24);
      setVideos(response.data.videos);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
    } catch (err) {
      setError('Không thể tải video từ kênh đăng ký');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách kênh đăng ký
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptions(page, 20);
      setSubscriptions(response.data.subscriptions);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
    } catch (err) {
      setError('Không thể tải danh sách kênh đăng ký');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Hủy đăng ký kênh
  const handleUnsubscribe = async (channelId, channelName) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đăng ký kênh "${channelName}"?`)) {
      return;
    }

    try {
      await unsubscribeFromChannel(channelId);
      toast.success('Hủy đăng ký thành công');
      
      // Cập nhật danh sách
      if (activeTab === 'channels') {
        fetchSubscriptions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi hủy đăng ký');
    }
  };

  // Định dạng thời gian đăng ký
  const formatSubscribeDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Kênh đăng ký</h2>
        <Badge bg="secondary">{total} {activeTab === 'videos' ? 'video' : 'kênh'}</Badge>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => {
          setActiveTab(k);
          setPage(1);
        }}
        className="mb-4"
      >
        <Tab eventKey="videos" title="Video mới nhất">
          {error && <Alert variant="danger">{error}</Alert>}
          
          {!loading && videos.length === 0 ? (
            <Alert variant="info" className="text-center mt-4">
              <h5>Chưa có video mới từ kênh đăng ký</h5>
              <p>Hãy đăng ký các kênh bạn yêu thích để xem video mới nhất tại đây.</p>
              <Button as={Link} to="/" variant="primary">
                Khám phá video
              </Button>
            </Alert>
          ) : (
            <>
              <Row className="g-4">
                {videos.map(video => (
                  <Col key={video._id} xs={12} sm={6} md={4} lg={3} xl={3} xxl={2}>
                    <VideoCard video={video} />
                  </Col>
                ))}
              </Row>
              {renderPagination()}
            </>
          )}
        </Tab>

        <Tab eventKey="channels" title="Quản lý kênh">
          {error && <Alert variant="danger">{error}</Alert>}
          
          {!loading && subscriptions.length === 0 ? (
            <Alert variant="info" className="text-center mt-4">
              <h5>Bạn chưa đăng ký kênh nào</h5>
              <p>Đăng ký các kênh yêu thích để không bỏ lỡ video mới.</p>
              <Button as={Link} to="/" variant="primary">
                Tìm kênh để đăng ký
              </Button>
            </Alert>
          ) : (
            <>
              <Row className="g-3">
                {subscriptions.map(subscription => (
                  <Col key={subscription._id} xs={12} sm={6} md={4} lg={3}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="text-center">
                        <div className="mb-3">
                          {subscription.channel.avatar ? (
                            <img 
                              src={subscription.channel.avatar} 
                              alt={subscription.channel.displayName}
                              className="rounded-circle"
                              width="80"
                              height="80"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto"
                              style={{ width: '80px', height: '80px' }}
                            >
                              <FaUser size={32} color="white" />
                            </div>
                          )}
                        </div>
                        
                        <h6 className="card-title mb-2">
                          {subscription.channel.displayName}
                        </h6>
                        
                        <div className="mb-2">
                          <small className="text-muted d-block">
                            @{subscription.channel.username}
                          </small>
                          <small className="text-muted d-block">
                            {subscription.channel.stats.subscriberCount} người đăng ký
                          </small>
                          <small className="text-muted d-block">
                            {subscription.channel.stats.videoCount} video
                          </small>
                        </div>
                        
                        <div className="mb-3">
                          <small className="text-muted">
                            Đăng ký từ {formatSubscribeDate(subscription.subscribedAt)}
                          </small>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <Button 
                            as={Link}
                            to={`/channel/${subscription.channel._id}`}
                            variant="outline-primary" 
                            size="sm"
                          >
                            <FaVideo className="me-1" />
                            Xem kênh
                          </Button>
                          
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleUnsubscribe(
                              subscription.channel._id, 
                              subscription.channel.displayName
                            )}
                          >
                            Hủy đăng ký
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              {renderPagination()}
            </>
          )}
        </Tab>
      </Tabs>
    </div>
  );
};

export default Subscriptions;