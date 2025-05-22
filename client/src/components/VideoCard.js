// VideoPlayer.js - Hoàn toàn mới, không có lỗi eslint
import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, Button, Alert, Spinner, Form, ListGroup, Dropdown, ButtonGroup } from 'react-bootstrap';
import Hls from 'hls.js';
import { 
  FaThumbsUp, 
  FaThumbsDown, 
  FaUser, 
  FaEye, 
  FaCalendarAlt, 
  FaComment, 
  FaBookmark,
  FaClock,
  FaShare,
  FaEllipsisH,
  FaSignInAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import { 
  getVideo, 
  getHLSUrl, 
  getVideoComments, 
  addComment,
  likeVideo,
  unlikeVideo,
  saveVideo,
  unsaveVideo,
  addToWatchLater,
  removeFromWatchLater,
  subscribeToChannel,
  unsubscribeFromChannel
} from '../api';
import AuthContext from '../context/AuthContext';
import CommentItem from '../components/CommentItem';

const VideoPlayer = () => {
  const { videoId } = useParams();
  const { currentUser } = useContext(AuthContext);
  
  // State cho video và thông tin liên quan
  const [video, setVideo] = useState(null);
  const [uploader, setUploader] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // State cho các tương tác người dùng
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
  // State cho video player
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [isBuffering, setIsBuffering] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Tải thông tin video và bình luận
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        const response = await getVideo(videoId);
        setVideo(response.data.video);
        setUploader(response.data.uploader);
        setComments(response.data.comments);
        setIsOwner(response.data.isOwner);
        
        // Tải trạng thái tương tác người dùng nếu đã đăng nhập
        if (currentUser) {
          loadUserInteractions();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin video');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideoData();
  }, [videoId, currentUser]);
  
  // Tải trạng thái tương tác của người dùng
  const loadUserInteractions = async () => {
    if (!currentUser) return;
    
    try {
      // Trong thực tế, cần API endpoints để kiểm tra trạng thái
      // Hiện tại đặt giá trị mặc định
      setIsLiked(false);
      setIsSaved(false);
      setIsInWatchLater(false);
      setIsSubscribed(false);
    } catch (err) {
      console.error('Lỗi khi tải trạng thái tương tác:', err);
    }
  };
  
  // Thiết lập HLS player
  useEffect(() => {
    if (!video || video.status !== 'ready' || !videoRef.current) return;
    
    // Hủy instance HLS cũ nếu có
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    
    const contentPath = video.contentPath.endsWith('/') ? video.contentPath.slice(0, -1) : video.contentPath;
    const hlsUrl = getHLSUrl(contentPath + '/master.m3u8');
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        enableWorker: true,
        startFragPrefetch: true
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      
      // Xử lý khi manifest được parsed
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualities = data.levels.map((level, index) => ({
          index: index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`
        }));
        
        setAvailableQualities([
          { index: -1, name: 'Tự động', bitrate: 0 },
          ...qualities.sort((a, b) => b.height - a.height)
        ]);
        
        // Bắt đầu phát video
        videoRef.current.play().catch(e => console.error('Không thể tự động phát video:', e));
      });
      
      // Xử lý lỗi
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Lỗi mạng khi tải video, đang thử lại...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Lỗi phương tiện, đang khôi phục...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Lỗi không thể khôi phục khi phát video');
              hls.destroy();
              toast.error('Không thể phát video, vui lòng thử lại');
              break;
          }
        }
      });
      
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Hỗ trợ Safari
      videoRef.current.src = hlsUrl;
    } else {
      toast.error('Trình duyệt của bạn không hỗ trợ phát video HLS');
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video]);
  
  // Thiết lập event listeners cho video player
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    
    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
    };

    const onLoadStart = () => {
      setIsBuffering(true);
    };

    const onPlaying = () => {
      setIsBuffering(false);
    };

    const onCanPlayThrough = () => {
      setIsBuffering(false);
    };
    
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('canplay', onCanPlay);
    videoElement.addEventListener('loadstart', onLoadStart);
    videoElement.addEventListener('playing', onPlaying);
    videoElement.addEventListener('canplaythrough', onCanPlayThrough);
    
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('waiting', onWaiting);
        videoElement.removeEventListener('canplay', onCanPlay);
        videoElement.removeEventListener('loadstart', onLoadStart);
        videoElement.removeEventListener('playing', onPlaying);
        videoElement.removeEventListener('canplaythrough', onCanPlayThrough);
      }
    };
  }, []);
  
  // Kiểm tra quyền trước khi thực hiện hành động
  const checkUserPermission = (actionName) => {
    if (!currentUser) {
      toast.info(`Vui lòng đăng nhập để ${actionName}`);
      return false;
    }
    return true;
  };
  
  // Kiểm tra quyền like (không cho phép chủ sở hữu like video của mình)
  const checkLikePermission = () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để thích video');
      return false;
    }
    
    if (isOwner) {
      toast.warning('Bạn không thể thích video của chính mình');
      return false;
    }
    
    return true;
  };
  
  // Function để thay đổi chất lượng video
  const handleQualityChange = (qualityIndex) => {
    if (hlsRef.current) {
      if (qualityIndex === -1) {
        hlsRef.current.currentLevel = -1;
        setCurrentQuality('auto');
        toast.info('Đã chuyển sang chất lượng tự động');
      } else {
        hlsRef.current.currentLevel = qualityIndex;
        const selectedQuality = availableQualities.find(q => q.index === qualityIndex);
        setCurrentQuality(selectedQuality?.name || 'auto');
        toast.info(`Đã chuyển sang chất lượng ${selectedQuality?.name}`);
      }
    }
    setShowQualityMenu(false);
  };
  
  // Xử lý like/unlike video
  const handleLike = async () => {
    if (!checkLikePermission()) return;
    
    try {
      setActionLoading({ ...actionLoading, like: true });
      
      if (isLiked) {
        await unlikeVideo(videoId);
        setIsLiked(false);
        setVideo({ ...video, stats: { ...video.stats, likes: video.stats.likes - 1 } });
        toast.success('Đã bỏ thích video');
      } else {
        await likeVideo(videoId);
        setIsLiked(true);
        setVideo({ ...video, stats: { ...video.stats, likes: video.stats.likes + 1 } });
        toast.success('Đã thích video');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hành động');
    } finally {
      setActionLoading({ ...actionLoading, like: false });
    }
  };
  
  // Xử lý lưu/bỏ lưu video
  const handleSave = async () => {
    if (!checkUserPermission('lưu video')) return;
    
    try {
      setActionLoading({ ...actionLoading, save: true });
      
      if (isSaved) {
        await unsaveVideo(videoId);
        setIsSaved(false);
        toast.success('Đã bỏ lưu video');
      } else {
        await saveVideo(videoId);
        setIsSaved(true);
        toast.success('Đã lưu video');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hành động');
    } finally {
      setActionLoading({ ...actionLoading, save: false });
    }
  };
  
  // Xử lý thêm/xóa khỏi xem sau
  const handleWatchLater = async () => {
    if (!checkUserPermission('thêm vào xem sau')) return;
    
    try {
      setActionLoading({ ...actionLoading, watchLater: true });
      
      if (isInWatchLater) {
        await removeFromWatchLater(videoId);
        setIsInWatchLater(false);
        toast.success('Đã xóa khỏi danh sách xem sau');
      } else {
        await addToWatchLater(videoId);
        setIsInWatchLater(true);
        toast.success('Đã thêm vào xem sau');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hành động');
    } finally {
      setActionLoading({ ...actionLoading, watchLater: false });
    }
  };
  
  // Xử lý đăng ký/hủy đăng ký kênh
  const handleSubscribe = async () => {
    if (!checkUserPermission('đăng ký kênh')) return;
    
    if (!uploader) return;
    
    try {
      setActionLoading({ ...actionLoading, subscribe: true });
      
      if (isSubscribed) {
        await unsubscribeFromChannel(uploader.id);
        setIsSubscribed(false);
        toast.success('Đã hủy đăng ký kênh');
      } else {
        await subscribeToChannel(uploader.id);
        setIsSubscribed(true);
        toast.success('Đã đăng ký kênh');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hành động');
    } finally {
      setActionLoading({ ...actionLoading, subscribe: false });
    }
  };
  
  // Xử lý chia sẻ video
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Đã sao chép liên kết video');
    }).catch(() => {
      toast.error('Không thể sao chép liên kết');
    });
  };
  
  // Xử lý gửi bình luận
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!checkUserPermission('bình luận')) return;
    
    if (!comment.trim()) return;
    
    try {
      setSubmittingComment(true);
      const response = await addComment(videoId, comment);
      setComments([response.data.comment, ...comments]);
      setComment('');
      toast.success('Đã thêm bình luận');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Định dạng thời lượng
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
  
  // Định dạng thời gian đăng
  const formatPublishedTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Component cho nút yêu cầu đăng nhập
  const LoginRequiredButton = ({ children, action, variant = "outline-secondary", ...props }) => {
    if (!currentUser) {
      return (
        <Button 
          variant={variant} 
          onClick={() => toast.info(`Vui lòng đăng nhập để ${action}`)}
          {...props}
        >
          {children}
        </Button>
      );
    }
    return null;
  };
  
  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }
  
  // Hiển thị lỗi
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  // Hiển thị nếu không tìm thấy video
  if (!video) {
    return <Alert variant="warning">Không tìm thấy video</Alert>;
  }
  
  return (
    <div className="container py-4">
      {/* Video Player */}
      <div className="position-relative mb-4">
        <div className="ratio ratio-16x9 shadow rounded">
          <video
            ref={videoRef}
            controls
            playsInline
            className="embed-responsive-item"
          />
          
          {/* Buffering Indicator */}
          {isBuffering && (
            <div 
              className="position-absolute top-50 start-50 translate-middle"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                borderRadius: '8px',
                padding: '12px 16px',
                zIndex: 5,
                pointerEvents: 'none'
              }}
            >
              <div className="text-center text-white d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2">
                  <span className="visually-hidden">Đang tải...</span>
                </Spinner>
                <div style={{ fontSize: '14px' }}>Đang tải...</div>
              </div>
            </div>
          )}

          {/* Quality Settings Button */}
          {availableQualities.length > 0 && (
            <div className="position-absolute" style={{ bottom: '60px', right: '12px' }}>
              <Dropdown 
                show={showQualityMenu} 
                onToggle={setShowQualityMenu}
                drop="up"
              >
                <Dropdown.Toggle
                  variant="dark"
                  size="sm"
                  className="opacity-75"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {currentQuality === 'auto' ? 'Auto' : currentQuality}
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="bg-dark border-0">
                  {availableQualities.map((quality) => (
                    <Dropdown.Item
                      key={quality.index}
                      onClick={() => handleQualityChange(quality.index)}
                      className="text-light small"
                      active={
                        (currentQuality === 'auto' && quality.index === -1) ||
                        currentQuality === quality.name
                      }
                    >
                      {quality.name}
                      {quality.bitrate > 0 && (
                        <small className="text-muted ms-2">
                          ({Math.round(quality.bitrate / 1000)}k)
                        </small>
                      )}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
      
      <Row>
        <Col lg={8}>
          {/* Video Info */}
          <div className="mb-4">
            <h2 className="mb-3">{video.title}</h2>
            
            <div className="d-flex justify-content-between align-items-start mb-3">
              {/* Video Stats */}
              <div className="d-flex align-items-center text-muted">
                <FaEye className="me-1" />
                <span className="me-3">{Math.ceil(video.stats.views)} lượt xem</span>
                
                <FaCalendarAlt className="me-1" />
                <span>
                  {video.publishedAt ? formatPublishedTime(video.publishedAt) : 'Chưa xuất bản'}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="d-flex align-items-center">
                <ButtonGroup className="me-3">
                  {currentUser && !isOwner ? (
                    <Button
                      variant={isLiked ? "primary" : "outline-secondary"}
                      size="sm"
                      onClick={handleLike}
                      disabled={actionLoading.like}
                      className="d-flex align-items-center"
                    >
                      <FaThumbsUp className="me-1" />
                      {video.stats.likes}
                    </Button>
                  ) : (
                    <LoginRequiredButton 
                      action="thích video" 
                      size="sm" 
                      className="d-flex align-items-center"
                    >
                      <FaThumbsUp className="me-1" />
                      {video.stats.likes}
                    </LoginRequiredButton>
                  )}
                  
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled
                    className="d-flex align-items-center"
                  >
                    <FaThumbsDown className="me-1" />
                    {video.stats.dislikes}
                  </Button>
                </ButtonGroup>
                
                {currentUser ? (
                  <>
                    <Button
                      variant={isSaved ? "success" : "outline-secondary"}
                      size="sm"
                      onClick={handleSave}
                      disabled={actionLoading.save}
                      className="me-2 d-flex align-items-center"
                    >
                      <FaBookmark className="me-1" />
                      {isSaved ? 'Đã lưu' : 'Lưu'}
                    </Button>
                    
                    <Button
                      variant={isInWatchLater ? "info" : "outline-secondary"}
                      size="sm"
                      onClick={handleWatchLater}
                      disabled={actionLoading.watchLater}
                      className="me-2 d-flex align-items-center"
                    >
                      <FaClock className="me-1" />
                      {isInWatchLater ? 'Đã thêm' : 'Xem sau'}
                    </Button>
                  </>
                ) : (
                  <>
                    <LoginRequiredButton 
                      action="lưu video" 
                      size="sm" 
                      className="me-2 d-flex align-items-center"
                    >
                      <FaBookmark className="me-1" />
                      Lưu
                    </LoginRequiredButton>
                    
                    <LoginRequiredButton 
                      action="thêm vào xem sau" 
                      size="sm" 
                      className="me-2 d-flex align-items-center"
                    >
                      <FaClock className="me-1" />
                      Xem sau
                    </LoginRequiredButton>
                  </>
                )}
                
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleShare}
                  className="me-2 d-flex align-items-center"
                >
                  <FaShare className="me-1" />
                  Chia sẻ
                </Button>
                
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-more">
                    <FaEllipsisH />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item href="#" disabled>Báo cáo</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
            
            {/* Duration and Tags */}
            <div className="mb-3">
              {video.duration > 0 && (
                <div className="mb-2 text-secondary">
                  <strong>Thời lượng:</strong> {formatDuration(video.duration)}
                </div>
              )}
              
              {video.tags && video.tags.length > 0 && (
                <div className="mb-3">
                  {video.tags.map((tag, index) => (
                    <Link 
                      key={index} 
                      to={`/search?q=${tag}`}
                      className="badge bg-secondary me-1 text-decoration-none"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Uploader Info */}
            {uploader && (
              <Card className="mb-4">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        {uploader.avatar ? (
                          <img 
                            src={uploader.avatar} 
                            alt={uploader.displayName} 
                            className="rounded-circle" 
                            width="48" 
                            height="48" 
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
                            style={{ width: '48px', height: '48px' }}
                          >
                            <FaUser />
                          </div>
                        )}
                      </div>
                      <div>
                        <h6 className="m-0">{uploader.displayName}</h6>
                        <small className="text-secondary">{uploader.subscriberCount} người đăng ký</small>
                      </div>
                    </div>
                    
                    {currentUser && currentUser.id !== uploader.id ? (
                      <Button 
                        variant={isSubscribed ? "secondary" : "danger"}
                        onClick={handleSubscribe}
                        disabled={actionLoading.subscribe}
                      >
                        {isSubscribed ? 'Đã đăng ký' : 'Đăng ký'}
                      </Button>
                    ) : !currentUser ? (
                      <Button 
                        variant="outline-danger"
                        onClick={() => toast.info('Vui lòng đăng nhập để đăng ký kênh')}
                      >
                        <FaSignInAlt className="me-1" />
                        Đăng nhập để đăng ký
                      </Button>
                    ) : null}
                  </div>
                </Card.Body>
              </Card>
            )}
            
            {/* Description */}
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Mô tả</Card.Title>
                <Card.Text style={{ whiteSpace: 'pre-line' }}>
                  {video.description || 'Không có mô tả cho video này.'}
                </Card.Text>
              </Card.Body>
            </Card>
          </div>
        </Col>
        
        <Col lg={4}>
          {/* Related Videos */}
          <Card>
            <Card.Header>
              <h6 className="m-0">Video liên quan</h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">Tính năng gợi ý video đang được phát triển...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Comments Section */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title className="mb-4">
                <FaComment className="me-2" />
                Bình luận ({video.stats.commentCount})
              </Card.Title>
              
              {currentUser ? (
                <Form onSubmit={handleSubmitComment} className="mb-4">
                  <Form.Group className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Thêm bình luận..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      disabled={submittingComment}
                    >
                      {submittingComment ? 'Đang gửi...' : 'Bình luận'}
                    </Button>
                  </div>
                </Form>
              ) : (
                <Alert variant="info" className="mb-4">
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Đăng nhập để thêm bình luận và tương tác với video</span>
                    <Link to={`/login?redirect=/video/${videoId}`} className="btn btn-primary btn-sm">
                      <FaSignInAlt className="me-1" />
                      Đăng nhập
                    </Link>
                  </div>
                </Alert>
              )}
              
              {comments.length > 0 ? (
                <ListGroup variant="flush">
                  {comments.map(comment => (
                    <ListGroup.Item key={comment._id} className="border-bottom py-3 px-0">
                      <CommentItem 
                        comment={comment} 
                        videoId={videoId} 
                        onReplyAdded={(newReply) => {
                          setComments(comments.map(c => 
                            c._id === comment._id 
                              ? { ...c, replies: [...(c.replies || []), newReply] }
                              : c
                          ));
                        }}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-3">
                  <p className="text-secondary">
                    Chưa có bình luận nào. 
                    {currentUser 
                      ? ' Hãy là người đầu tiên bình luận!' 
                      : ' Đăng nhập để trở thành người đầu tiên bình luận!'
                    }
                  </p>
                </div>
              )}
              
              {video.stats.commentCount > comments.length && (
                <div className="text-center mt-3">
                  <Button variant="outline-primary">Xem thêm bình luận</Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VideoPlayer;