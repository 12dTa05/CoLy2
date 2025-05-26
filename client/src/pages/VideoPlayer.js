// VideoPlayer.js - Updated với Network Monitoring và Smart Quality Control
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
  
  // Core video states
  const [video, setVideo] = useState(null);
  const [uploader, setUploader] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // User interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
  // Video player states
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Network monitoring states
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [isNetworkSlow, setIsNetworkSlow] = useState(false);
  const [lastBandwidthCheck, setLastBandwidthCheck] = useState(0);
  
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
  
  // Load user interaction states
  const loadUserInteractions = async () => {
    try {
      // Placeholder - trong thực tế cần API endpoints để check status
      setIsLiked(false);
      setIsSaved(false);
      setIsInWatchLater(false);
      setIsSubscribed(false);
    } catch (err) {
      console.error('Error loading user interactions:', err);
    }
  };
  
  // Thiết lập HLS player với network monitoring
  useEffect(() => {
    if (!video || video.status !== 'ready' || !videoRef.current) return;
    
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
        
        videoRef.current.play().catch(e => console.error('Không thể tự động phát video:', e));
      });

      // Network speed monitoring từ fragment loads
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const loadTime = data.stats.total / 1000;
        
        if (loadTime > 0 && data.frag.byteLength > 0) {
          const speed = (data.frag.byteLength * 8) / (loadTime * 1000000); // Mbps
          setNetworkSpeed(speed);
          setLastBandwidthCheck(Date.now());
          
          // Kiểm tra nếu đang ở chế độ manual quality
          if (currentQuality !== 'auto') {
            const currentLevel = hls.currentLevel;
            if (currentLevel >= 0 && hls.levels[currentLevel]) {
              const requiredBitrate = hls.levels[currentLevel].bitrate;
              const availableBitrate = speed * 1000000;
              
              // Hiển thị slow network indicator nếu bandwidth không đủ
              setIsNetworkSlow(availableBitrate < requiredBitrate * 0.8);
            }
          } else {
            setIsNetworkSlow(false);
          }
        }
      });

      // Xử lý buffering events cho manual quality
      hls.on(Hls.Events.BUFFER_STALLED, () => {
        if (currentQuality !== 'auto') {
          setIsNetworkSlow(true);
        }
      });

      hls.on(Hls.Events.BUFFER_FLUSHED, () => {
        setIsNetworkSlow(false);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Lỗi mạng khi tải video, đang thử lại...');
              if (currentQuality !== 'auto') {
                setIsNetworkSlow(true);
              }
              hls.startLoad();
              setTimeout(() => setIsNetworkSlow(false), 3000);
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
  }, [video, currentQuality]);

  // Thiết lập event listeners đơn giản cho buffering
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    
    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
    };

    const onPlaying = () => {
      setIsBuffering(false);
    };

    const onLoadStart = () => {
      setIsBuffering(true);
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

  // Adaptive quality logic - chỉ hoạt động khi ở chế độ auto
  useEffect(() => {
    if (!hlsRef.current || currentQuality !== 'auto' || availableQualities.length <= 1) return;

    const adaptiveQualityInterval = setInterval(() => {
      if (networkSpeed > 0 && hlsRef.current) {
        const currentLevel = hlsRef.current.currentLevel;
        const levels = hlsRef.current.levels;
        
        if (levels && levels.length > 0) {
          const currentBitrate = levels[currentLevel]?.bitrate || 0;
          const availableBandwidth = networkSpeed * 1000000; // Convert to bps
          
          // Nếu bandwidth không đủ, giảm chất lượng
          if (availableBandwidth < currentBitrate * 1.5) {
            for (let i = levels.length - 1; i >= 0; i--) {
              if (levels[i].bitrate <= availableBandwidth * 0.7) {
                if (i !== currentLevel) {
                  console.log(`Auto switching down: ${levels[currentLevel]?.height}p -> ${levels[i].height}p`);
                  hlsRef.current.currentLevel = i;
                  toast.info(`Tự động chuyển xuống ${levels[i].height}p do mạng chậm`, { autoClose: 2000 });
                }
                break;
              }
            }
          }
          // Nếu bandwidth dư thừa, có thể tăng chất lượng
          else if (availableBandwidth > currentBitrate * 2.5) {
            for (let i = 0; i < levels.length; i++) {
              if (levels[i].bitrate <= availableBandwidth * 0.6) {
                if (i < currentLevel) {
                  console.log(`Auto switching up: ${levels[currentLevel]?.height}p -> ${levels[i].height}p`);
                  hlsRef.current.currentLevel = i;
                  toast.info(`Tự động chuyển lên ${levels[i].height}p`, { autoClose: 2000 });
                  break;
                }
              }
            }
          }
        }
      }
    }, 8000); // Kiểm tra mỗi 8 giây

    return () => clearInterval(adaptiveQualityInterval);
  }, [networkSpeed, currentQuality, availableQualities]);
  
  // Function để thay đổi chất lượng video
  const handleQualityChange = (qualityIndex) => {
    if (hlsRef.current) {
      if (qualityIndex === -1) {
        hlsRef.current.currentLevel = -1;
        setCurrentQuality('auto');
        setIsNetworkSlow(false); // Reset slow network indicator
        toast.info('Đã chuyển sang chất lượng tự động');
      } else {
        hlsRef.current.currentLevel = qualityIndex;
        const selectedQuality = availableQualities.find(q => q.index === qualityIndex);
        setCurrentQuality(selectedQuality?.name || 'auto');
        toast.info(`Đã chọn chất lượng ${selectedQuality?.name}`);
      }
    }
    setShowQualityMenu(false);
  };

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
  
  // Action handlers
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
    <div className="container-fluid px-3 py-2">
      {/* Main Content Layout - Chia 2 cột ngay từ đầu */}
      <Row>
        <Col xs={12} lg={8} xl={9}>
          {/* Video Player - Nằm trong cột trái */}
          <div className="position-relative mb-3">
            <div 
              className="ratio ratio-16x9 shadow rounded"
              style={{ 
                pointerEvents: 'none',
                margin: 0,
                padding: 0
              }}
            >
              <video
                ref={videoRef}
                controls
                playsInline
                className="embed-responsive-item"
                style={{ 
                  pointerEvents: 'auto',
                  zIndex: 1,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              
              {/* Network Status Indicators */}
              {currentQuality === 'auto' && networkSpeed > 0 && (
                <div 
                  className="position-absolute"
                  style={{
                    top: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    fontSize: '10px',
                    borderRadius: '3px',
                    padding: '2px 4px',
                    pointerEvents: 'none'
                  }}
                >
                  Auto
                </div>
              )}

              {/* Slow Network Indicator */}
              {currentQuality !== 'auto' && isNetworkSlow && (
                <div 
                  className="position-absolute d-flex align-items-center"
                  style={{ 
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(0,0,0,0.7)', 
                    borderRadius: '6px',
                    padding: '6px 10px',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  <Spinner 
                    animation="border" 
                    size="sm" 
                    variant="light"
                    style={{ width: '16px', height: '16px' }}
                  >
                    <span className="visually-hidden">Đang tải...</span>
                  </Spinner>
                  <span className="text-white ms-2" style={{ fontSize: '11px' }}>
                    Mạng chậm
                  </span>
                </div>
              )}

              {/* Standard Buffering Indicator */}
              {isBuffering && (
                <div 
                  className="position-absolute d-flex align-items-center justify-content-center"
                  style={{ 
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)', 
                    borderRadius: '8px',
                    padding: '8px 12px',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                >
                  <Spinner animation="border" size="sm" variant="light">
                    <span className="visually-hidden">Đang tải...</span>
                  </Spinner>
                  <span className="text-white ms-2" style={{ fontSize: '12px' }}>
                    Đang tải...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Video Controls Panel */}
          <div className="d-flex justify-content-end align-items-center mb-3 p-4 bg-light rounded">
            <div className="d-flex align-items-center">
              {/* Quality Selector */}
              {availableQualities.length > 0 && (
                <div className="me-3 d-flex align-items-center">
                  <label className="form-label mb-0 me-2 small">Chất lượng:</label>
                  <Dropdown>
                    <Dropdown.Toggle 
                      variant="outline-secondary" 
                      size="sm"
                      style={{ minWidth: '80px' }}
                    >
                      {currentQuality === 'auto' ? 'Tự động' : currentQuality}
                    </Dropdown.Toggle>
                    
                    <Dropdown.Menu>
                      {availableQualities.map((quality) => (
                        <Dropdown.Item
                          key={quality.index}
                          onClick={() => handleQualityChange(quality.index)}
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
              
              {/* Network Info */}
              {networkSpeed > 0 && (
                <div className="text-muted small">
                  <span className="me-2">{networkSpeed.toFixed(1)} Mbps</span>
                  {currentQuality === 'auto' && (
                    <span className="badge bg-success">Auto</span>
                  )}
                  {isNetworkSlow && (
                    <span className="badge bg-warning ms-1">Mạng chậm</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Video Stats */}
            {/* <div className="text-muted small">
              Độ phân giải: {currentQuality === 'auto' ? 'Tự động' : currentQuality}
            </div> */}
          </div>

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
                
                {/* <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-more">
                    <FaEllipsisH />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item href="#" disabled>Báo cáo</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown> */}
              </div>
            </div>
            
            {/* Duration and Tags */}
            <div className="mb-3">
              {/* {video.duration > 0 && (
                <div className="mb-2 text-secondary">
                  <strong>Thời lượng:</strong> {formatDuration(video.duration)}
                </div>
              )} */}
              
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

          {/* Comments Section */}
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
        
        <Col xs={12} lg={4} xl={3}>
          {/* Related Videos Sidebar - Chiếm toàn bộ cột phải */}
          <div className="sticky-top" style={{ top: '20px' }}>
            <h6 className="mb-3">Video liên quan</h6>
            
            {/* Placeholder cho video liên quan */}
            {/* {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <div key={index} className="mb-3">
                <div className="d-flex">
                  <div className="flex-shrink-0 me-2">
                    <div 
                      className="bg-secondary rounded position-relative"
                      style={{ width: '168px', height: '94px' }}
                    >
                      <div 
                        className="position-absolute bottom-0 end-0 bg-dark text-white px-1 m-1"
                        style={{ fontSize: '10px', borderRadius: '2px' }}
                      >
                        5:23
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="small mb-1 lh-sm" style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      Video liên quan {index} - Tiêu đề dài có thể xuống dòng
                    </h6>
                    <div className="text-muted small">Tên kênh</div>
                    <div className="text-muted small">
                      1.2M lượt xem • 2 ngày trước
                    </div>
                  </div>
                </div>
              </div>
            ))} */}
            
            {/* Thông báo phát triển */}
            <div className="mt-4 p-3 bg-light rounded">
              <small className="text-muted">
                Tính năng gợi ý video thông minh đang được phát triển. 
                Các video liên quan sẽ được hiển thị dựa trên nội dung, 
                lượt xem và sở thích người dùng.
              </small>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default VideoPlayer;