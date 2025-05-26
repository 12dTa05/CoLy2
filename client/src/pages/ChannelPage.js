// ChannelPage.js - Trang thông tin kênh (YouTube Style)
import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Button, Alert, Spinner, Tab, Tabs, Card } from 'react-bootstrap';
import { FaUser, FaBell, FaCheck, FaPlay, FaEye, FaVideo } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { 
  getChannelInfo, 
  getChannelVideos, 
  subscribeToChannel, 
  unsubscribeFromChannel, 
  getThumbnailUrl 
} from '../api';
import AuthContext from '../context/AuthContext';
import VideoCard from '../components/VideoCard';

const ChannelPage = () => {
  const { channelId } = useParams();
  const { currentUser } = useContext(AuthContext);
  
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Tải thông tin kênh
  useEffect(() => {
    fetchChannelData();
  }, [channelId]);

  // Tải video khi thay đổi tab hoặc trang
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchChannelVideos();
    }
  }, [activeTab, page, channelId]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const response = await getChannelInfo(channelId);
      setChannel(response.data.channel);
      setIsSubscribed(response.data.isSubscribed || false);
    } catch (err) {
      setError('Không thể tải thông tin kênh');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelVideos = async () => {
    try {
      const response = await getChannelVideos(channelId, page, 20);
      setVideos(response.data.videos);
      setTotalPages(response.data.pages);
    } catch (err) {
      console.error('Error fetching channel videos:', err);
    }
  };

  // Xử lý đăng ký/hủy đăng ký
  const handleSubscribe = async () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để đăng ký kênh');
      return;
    }

    try {
      setSubscribing(true);
      
      if (isSubscribed) {
        await unsubscribeFromChannel(channelId);
        setIsSubscribed(false);
        setChannel({
          ...channel,
          stats: {
            ...channel.stats,
            subscriberCount: channel.stats.subscriberCount - 1
          }
        });
        toast.success('Đã hủy đăng ký kênh');
      } else {
        await subscribeToChannel(channelId);
        setIsSubscribed(true);
        setChannel({
          ...channel,
          stats: {
            ...channel.stats,
            subscriberCount: channel.stats.subscriberCount + 1
          }
        });
        toast.success('Đã đăng ký kênh');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hành động');
    } finally {
      setSubscribing(false);
    }
  };

  // Định dạng số subscriber
  const formatSubscriberCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Định dạng ngày tham gia
  const formatJoinDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }

  if (error || !channel) {
    return <Alert variant="danger">{error || 'Không tìm thấy kênh'}</Alert>;
  }

  const isOwner = currentUser && currentUser.id === channelId;

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', color: 'white' }}>
      {/* Channel Banner */}
      <div 
        className="position-relative"
        style={{
          height: '200px',
          background: channel.banner 
            ? `url(${channel.banner}) center/cover no-repeat`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {/* Banner overlay content if needed */}
      </div>

      <div className="container-fluid" style={{ maxWidth: '1284px', padding: '0 24px' }}>
        {/* Channel Header */}
        <div className="py-4">
          <div className="d-flex align-items-start">
            {/* Channel Avatar */}
            <div className="flex-shrink-0 me-4">
              {channel.avatar ? (
                <img 
                  src={channel.avatar}
                  alt={channel.displayName}
                  className="rounded-circle"
                  style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                />
              ) : (
                <div 
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                  style={{ width: '80px', height: '80px' }}
                >
                  <FaUser size={32} color="white" />
                </div>
              )}
            </div>

            {/* Channel Info */}
            <div className="flex-grow-1">
              <h1 className="h3 mb-2" style={{ color: 'white', fontWeight: '600' }}>
                {channel.displayName}
                {channel.verified && (
                  <FaCheck className="ms-2 text-muted" size={16} />
                )}
              </h1>
              
              <div className="text-muted mb-2" style={{ fontSize: '14px' }}>
                <span>@{channel.username}</span>
                <span className="mx-2">•</span>
                <span>{formatSubscriberCount(channel.stats.subscriberCount)} người đăng ký</span>
                <span className="mx-2">•</span>
                <span>{channel.stats.videoCount} video</span>
              </div>

              {channel.description && (
                <p className="text-muted mb-2" style={{ fontSize: '14px', maxWidth: '600px' }}>
                  {channel.description.length > 100 
                    ? `${channel.description.substring(0, 100)}...` 
                    : channel.description}
                </p>
              )}

              <div className="text-muted" style={{ fontSize: '13px' }}>
                Đã tham gia vào {formatJoinDate(channel.createdAt)}
              </div>
            </div>

            {/* Subscribe Button */}
            {!isOwner && (
              <div className="flex-shrink-0">
                <Button
                  variant={isSubscribed ? "secondary" : "light"}
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="d-flex align-items-center fw-bold"
                  style={{ 
                    borderRadius: '18px', 
                    padding: '8px 16px',
                    backgroundColor: isSubscribed ? '#272727' : 'white',
                    color: isSubscribed ? 'white' : 'black',
                    border: 'none'
                  }}
                >
                  {isSubscribed ? (
                    <>
                      <FaBell className="me-2" />
                      Đã đăng ký
                    </>
                  ) : (
                    'Đăng ký'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Channel Navigation */}
        <div className="border-bottom" style={{ borderColor: '#303030' }}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="channel-tabs"
            style={{
              borderBottom: 'none'
            }}
          >
            <Tab 
              eventKey="home" 
              title="Trang chủ"
              className="text-white"
            >
              {/* Channel Home Content */}
              <div className="py-4">
                {/* Featured Video Section */}
                {videos.length > 0 && (
                  <div className="mb-5">
                    <h5 className="mb-3" style={{ color: 'white' }}>Video nổi bật</h5>
                    <div className="row">
                      <div className="col-12 col-md-6">
                        <div className="position-relative">
                          <img 
                            src={videos[0].thumbnailPath ? getThumbnailUrl(videos[0].thumbnailPath) : 'https://via.placeholder.com/560x315?text=No+Thumbnail'}
                            alt={videos[0].title}
                            className="w-100 rounded"
                            style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                          />
                          <div className="position-absolute top-50 start-50 translate-middle">
                            <Button
                              variant="light"
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '60px', height: '60px' }}
                            >
                              <FaPlay />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6 d-flex align-items-center">
                        <div>
                          <h6 className="text-white mb-2">{videos[0].title}</h6>
                          <div className="text-muted small mb-3">
                            {Math.ceil(videos[0].stats.views)} lượt xem • {formatJoinDate(videos[0].publishedAt)}
                          </div>
                          <p className="text-muted small">
                            {videos[0].description && videos[0].description.length > 150 
                              ? `${videos[0].description.substring(0, 150)}...`
                              : videos[0].description || 'Không có mô tả'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* About Section */}
                <div className="mb-5">
                  <h5 className="mb-3" style={{ color: 'white' }}>Giới thiệu</h5>
                  <div className="row">
                    <div className="col-12 col-md-8">
                      <div className="text-muted">
                        {channel.description || 'Kênh này chưa có mô tả.'}
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="text-muted small">
                        <div className="mb-2">
                          <strong>Thống kê:</strong>
                        </div>
                        <div>• {channel.stats.videoCount} video</div>
                        <div>• {formatSubscriberCount(channel.stats.subscriberCount)} người đăng ký</div>
                        <div>• {channel.stats.totalViews} lượt xem tổng cộng</div>
                        <div className="mt-2">
                          <strong>Tham gia:</strong> {formatJoinDate(channel.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Tab>

            <Tab 
              eventKey="videos" 
              title="Video"
              className="text-white"
            >
              {/* Videos Grid */}
              <div className="py-4">
                {videos.length === 0 ? (
                  <div className="text-center py-5">
                    <FaVideo size={48} className="mb-3 text-muted" />
                    <h6 style={{ color: 'white' }}>Kênh này chưa có video nào</h6>
                    <p className="text-muted">Hãy quay lại sau để xem video mới.</p>
                  </div>
                ) : (
                  <Row className="g-4">
                    {videos.map(video => (
                      <Col key={video._id} xs={12} sm={6} md={4} lg={3}>
                        <VideoCard video={video} />
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            </Tab>

            <Tab 
              eventKey="shorts" 
              title="Shorts"
              className="text-white"
            >
              <div className="py-4 text-center">
                <p className="text-muted">Tính năng Shorts đang được phát triển...</p>
              </div>
            </Tab>

            <Tab 
              eventKey="playlists" 
              title="Danh sách phát"
              className="text-white"
            >
              <div className="py-4 text-center">
                <p className="text-muted">Tính năng Danh sách phát đang được phát triển...</p>
              </div>
            </Tab>

            <Tab 
              eventKey="community" 
              title="Cộng đồng"
              className="text-white"
            >
              <div className="py-4 text-center">
                <p className="text-muted">Tính năng Cộng đồng đang được phát triển...</p>
              </div>
            </Tab>

            <Tab 
              eventKey="about" 
              title="Giới thiệu"
              className="text-white"
            >
              {/* About Page */}
              <div className="py-4">
                <div className="row">
                  <div className="col-12 col-md-8">
                    <h6 className="text-white mb-3">Mô tả</h6>
                    <div className="text-muted mb-4" style={{ whiteSpace: 'pre-line' }}>
                      {channel.description || 'Kênh này chưa có mô tả.'}
                    </div>

                    {/* Links section if available */}
                    {channel.links && channel.links.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-white mb-3">Liên kết</h6>
                        {channel.links.map((link, index) => (
                          <div key={index} className="mb-2">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                              {link.title}: {link.url}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-4">
                    <h6 className="text-white mb-3">Thống kê</h6>
                    <div className="text-muted">
                      <div className="mb-2">Tham gia vào {formatJoinDate(channel.createdAt)}</div>
                      <div className="mb-2">{channel.stats.totalViews} lượt xem</div>
                      <div className="mb-2">{formatSubscriberCount(channel.stats.subscriberCount)} người đăng ký</div>
                      <div className="mb-2">{channel.stats.videoCount} video</div>
                    </div>
                  </div>
                </div>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>

      <style jsx>{`
        .channel-tabs .nav-link {
          color: #aaa !important;
          border: none !important;
          background: none !important;
          padding: 12px 16px !important;
          font-weight: 500 !important;
        }
        .channel-tabs .nav-link.active {
          color: white !important;
          border-bottom: 2px solid white !important;
        }
        .channel-tabs .nav-link:hover {
          color: white !important;
        }
      `}</style>
    </div>
  );
};

export default ChannelPage;