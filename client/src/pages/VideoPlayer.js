// VideoPlayer.js - Updated với Action Buttons
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
  FaHeart
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
  
  const [video, setVideo] = useState(null);
  const [uploader, setUploader] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Action states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
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
        
        // Load user interaction states if logged in
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
  }, [videoId]);
  
  // Load user interaction states
  const loadUserInteractions = async () => {
    try {
      // Check liked status (có thể implement API riêng hoặc từ video data)
      // Check saved status
      // Check watch later status
      // Check subscription status
      
      // Placeholder - trong thực tế cần API endpoints để check status
      setIsLiked(false);
      setIsSaved(false);
      setIsInWatchLater(false);
      setIsSubscribed(false);
    } catch (err) {
      console.error('Error loading user interactions:', err);
    }
  };
  
  // Video player states
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isStalling, setIsStalling] = useState(false);
  const [lastBufferCheck, setLastBufferCheck] = useState(0);

  // Thiết lập HLS player với quality controls và buffering
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
        // Cấu hình cho adaptive bitrate và buffering
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        lowBufferWatchdogPeriod: 0.5,
        highBufferWatchdogPeriod: 3,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        enableWorker: true,
        enableSoftwareAES: true,
        startFragPrefetch: true,
        // ABR Controller settings
        abrEwmaFastLive: 3.0,
        abrEwmaSlowLive: 9.0,
        abrEwmaFastVoD: 3.0,
        abrEwmaSlowVoD: 9.0,
        abrEwmaDefaultEstimate: 500000, // 500kbps
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      
      // Event listeners for quality and buffering
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('Manifest parsed, available levels:', data.levels);
        
        // Lấy danh sách chất lượng có sẵn
        const qualities = data.levels.map((level, index) => ({
          index: index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`
        }));
        
        // Thêm option Auto
        setAvailableQualities([
          { index: -1, name: 'Tự động', bitrate: 0 },
          ...qualities.sort((a, b) => b.height - a.height)
        ]);
        
        // Bắt đầu phát video
        videoRef.current.play().catch(e => console.error('Không thể tự động phát video:', e));
      });

      // Theo dõi thay đổi chất lượng
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        console.log('Quality switched to:', level.height + 'p');
      });

      // Chỉ theo dõi khi fragment thực sự bị lỗi hoặc load chậm
      hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, () => {
        console.log('Fragment load aborted due to emergency');
        setIsStalling(true);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        // Tính toán tốc độ mạng
        const loadTime = data.stats.total / 1000; // Convert to seconds
        
        if (loadTime > 0 && data.frag.byteLength > 0) {
          const speed = (data.frag.byteLength * 8) / (loadTime * 1000000); // Mbps
          setNetworkSpeed(speed);
          
          // Kiểm tra xem tốc độ có đủ cho chất lượng hiện tại không
          const currentLevel = hls.currentLevel;
          if (currentLevel >= 0 && hls.levels[currentLevel]) {
            const requiredBitrate = hls.levels[currentLevel].bitrate;
            const availableBitrate = speed * 1000000;
            
            // Chỉ hiển thị buffering nếu tốc độ mạng thấp hơn đáng kể so với yêu cầu
            if (availableBitrate < requiredBitrate * 0.6) {
              setIsStalling(true);
            } else {
              setIsStalling(false);
            }
          }
        }
      });

      // Xử lý buffer stalling thực sự
      hls.on(Hls.Events.BUFFER_STALLED, () => {
        console.log('Buffer genuinely stalled');
        setIsStalling(true);
      });

      hls.on(Hls.Events.BUFFER_FLUSHED, () => {
        setIsStalling(false);
      });

      // Error handling - chỉ hiển thị buffering khi có lỗi thực sự
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log('HLS Error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Lỗi mạng khi tải tệp HLS, đang thử lại...');
              setIsStalling(true);
              
              // Retry logic
              setTimeout(() => {
                hls.startLoad();
                setTimeout(() => setIsStalling(false), 2000);
              }, 1000);
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Lỗi phương tiện khi phát HLS, đang khôi phục...');
              setIsStalling(true);
              hls.recoverMediaError();
              setTimeout(() => setIsStalling(false), 2000);
              break;
              
            default:
              console.error('Lỗi không thể khôi phục khi phát HLS');
              hls.destroy();
              toast.error('Không thể phát video, vui lòng thử lại');
              break;
          }
        } else {
          // Non-fatal errors - chỉ hiển thị buffering trong trường hợp nghiêm trọng
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            setIsStalling(true);
            setTimeout(() => setIsStalling(false), 3000);
          }
        }
      });

      // Theo dõi trạng thái waiting của video element
      const handleWaiting = () => {
        setIsBuffering(true);
        console.log('Video waiting for data...');
      };

      const handleCanPlay = () => {
        setIsBuffering(false);
        console.log('Video can play');
      };

      const handleProgress = () => {
        if (videoRef.current) {
          const buffered = videoRef.current.buffered;
          const currentTime = videoRef.current.currentTime;
          
          if (buffered.length > 0) {
            for (let i = 0; i < buffered.length; i++) {
              if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
                const bufferEnd = buffered.end(i);
                const bufferAhead = bufferEnd - currentTime;
                setBufferProgress(Math.min(bufferAhead / 10, 1));
                
                // Nếu buffer ít hơn 3 giây, hiển thị loading
                if (bufferAhead < 3) {
                  setIsBuffering(true);
                } else {
                  setIsBuffering(false);
                }
                break;
              }
            }
          }
        }
      };

      videoRef.current.addEventListener('waiting', handleWaiting);
      videoRef.current.addEventListener('canplay', handleCanPlay);
      videoRef.current.addEventListener('progress', handleProgress);
      
      hlsRef.current = hls;

      // Cleanup function
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('waiting', handleWaiting);
          videoRef.current.removeEventListener('canplay', handleCanPlay);
          videoRef.current.removeEventListener('progress', handleProgress);
        }
      };
      
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Cho phép phát HLS trực tiếp (Safari)
      videoRef.current.src = hlsUrl;
    } else {
      toast.error('Trình duyệt của bạn không hỗ trợ phát video HLS');
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video]);

  // Function để thay đổi chất lượng video
  const handleQualityChange = (qualityIndex) => {
    if (hlsRef.current) {
      if (qualityIndex === -1) {
        // Auto quality
        hlsRef.current.currentLevel = -1;
        setCurrentQuality('auto');
        toast.info('Đã chuyển sang chất lượng tự động');
      } else {
        // Manual quality selection
        hlsRef.current.currentLevel = qualityIndex;
        const selectedQuality = availableQualities.find(q => q.index === qualityIndex);
        setCurrentQuality(selectedQuality?.name || 'auto');
        toast.info(`Đã chuyển sang chất lượng ${selectedQuality?.name}`);
      }
    }
    setShowQualityMenu(false);
  };

  // Network speed monitoring
  useEffect(() => {
    const monitorNetworkSpeed = () => {
      if (hlsRef.current && hlsRef.current.bandwidthEstimate) {
        const estimatedBandwidth = hlsRef.current.bandwidthEstimate / 1000000; // Convert to Mbps
        setNetworkSpeed(estimatedBandwidth);
      }
    };

    const speedMonitorInterval = setInterval(monitorNetworkSpeed, 2000);
    return () => clearInterval(speedMonitorInterval);
  }, []);

  // Adaptive quality logic based on network speed
  useEffect(() => {
    if (!hlsRef.current || currentQuality !== 'auto' || availableQualities.length <= 1) return;

    const adaptiveQualityCheck = setInterval(() => {
      if (networkSpeed > 0 && hlsRef.current) {
        const currentLevel = hlsRef.current.currentLevel;
        const levels = hlsRef.current.levels;
        
        if (levels && levels.length > 0) {
          // Tính toán chất lượng phù hợp dựa trên bandwidth
          const requiredBandwidth = levels[currentLevel]?.bitrate || 0;
          const availableBandwidth = networkSpeed * 1000000; // Convert to bps
          
          // Nếu bandwidth không đủ cho chất lượng hiện tại
          if (availableBandwidth < requiredBandwidth * 1.5) { // 1.5x buffer
            // Tìm chất lượng thấp hơn phù hợp
            for (let i = levels.length - 1; i >= 0; i--) {
              if (levels[i].bitrate <= availableBandwidth * 0.8) { // 0.8x safety margin
                if (i !== currentLevel) {
                  console.log(`Switching quality down: ${levels[currentLevel]?.height}p -> ${levels[i].height}p`);
                  hlsRef.current.currentLevel = i;
                }
                break;
              }
            }
          }
          // Nếu bandwidth dư thừa, có thể nâng chất lượng
          else if (availableBandwidth > requiredBandwidth * 2.5) { // 2.5x buffer before upgrading
            // Tìm chất lượng cao hơn phù hợp
            for (let i = 0; i < levels.length; i++) {
              if (levels[i].bitrate <= availableBandwidth * 0.7) { // 0.7x safety margin
                if (i !== currentLevel && i < currentLevel) {
                  console.log(`Switching quality up: ${levels[currentLevel]?.height}p -> ${levels[i].height}p`);
                  hlsRef.current.currentLevel = i;
                }
              }
            }
          }
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(adaptiveQualityCheck);
  }, [networkSpeed, currentQuality, availableQualities]);

  // Buffer management - only show buffering when truly necessary
  useEffect(() => {
    if (!videoRef.current) return;

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const buffered = videoRef.current.buffered;
        const currentTime = videoRef.current.currentTime;
        const currentTimestamp = Date.now();
        
        if (buffered.length > 0) {
          let bufferAhead = 0;
          
          // Find buffer range that contains current time
          for (let i = 0; i < buffered.length; i++) {
            if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
              bufferAhead = buffered.end(i) - currentTime;
              setBufferProgress(Math.min(bufferAhead / 10, 1));
              break;
            }
          }
          
          // Critical logic: only show buffering if video is genuinely stuck
          // Check if video position hasn't changed for a while AND buffer is critically low
          if (currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
            if (Math.abs(currentTime - lastBufferCheck) < 0.1 && bufferAhead < 0.5) {
              // Video hasn't progressed and buffer is very low
              if (currentTimestamp - lastBufferCheck > 2000) { // Wait 2 seconds before showing
                console.log('Video genuinely stuck - showing buffering');
                setIsBuffering(true);
              }
            } else {
              setIsBuffering(false);
              setLastBufferCheck(currentTime);
            }
          }
        }
      }
    };

    videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
    videoRef.current.addEventListener('waiting', handleWaiting);
    videoRef.current.addEventListener('canplay', handleCanPlay);
    videoRef.current.addEventListener('playing', handlePlaying);
    videoRef.current.addEventListener('loadstart', handleLoadStart);
    videoRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
    videoRef.current.addEventListener('progress', handleProgress);
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        videoRef.current.removeEventListener('waiting', handleWaiting);
        videoRef.current.removeEventListener('canplay', handleCanPlay);
        videoRef.current.removeEventListener('playing', handlePlaying);
        videoRef.current.removeEventListener('loadstart', handleLoadStart);
        videoRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
        videoRef.current.removeEventListener('progress', handleProgress);
      }
    };
  }, [lastBufferCheck]);
  
  // Action handlers
  const handleLike = async () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để thích video');
      return;
    }
    
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
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để lưu video');
      return;
    }
    
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
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để thêm vào xem sau');
      return;
    }
    
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
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để đăng ký kênh');
      return;
    }
    
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
  
  return (
    <div className="container py-4">
      {/* Player */}
      <div className="position-relative mb-4">
        <div className="ratio ratio-16x9 shadow rounded">
          <video
            ref={videoRef}
            controls
            playsInline
            className="embed-responsive-item"
          />
          
          {/* Buffering Indicator - Only show when truly needed */}
          {(isBuffering || isStalling) && (
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
                <div>
                  <div style={{ fontSize: '14px' }}>Đang tải...</div>
                  {networkSpeed > 0 && (
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      Tốc độ mạng: {networkSpeed.toFixed(1)} Mbps
                    </div>
                  )}
                </div>
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
                
                <Dropdown.Menu 
                  className="bg-dark border-0"
                  style={{ minWidth: '120px' }}
                >
                  {availableQualities.map((quality) => (
                    <Dropdown.Item
                      key={quality.index}
                      onClick={() => handleQualityChange(quality.index)}
                      className="text-light small"
                      active={
                        (currentQuality === 'auto' && quality.index === -1) ||
                        currentQuality === quality.name
                      }
                      style={{ 
                        backgroundColor: 'transparent',
                        fontSize: '12px'
                      }}
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

          {/* Minimal Buffer Progress Indicator */}
          {bufferProgress > 0 && bufferProgress < 0.9 && (
            <div 
              className="position-absolute"
              style={{ 
                bottom: '52px',
                left: '12px',
                right: '12px',
                height: '2px', 
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '1px',
                pointerEvents: 'none'
              }}
            >
              <div 
                className="h-100"
                style={{ 
                  width: `${bufferProgress * 100}%`,
                  backgroundColor: '#ff6b6b',
                  borderRadius: '1px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          )}
        </div>

        {/* Compact Video Info Panel - Only show when debugging */}
        {networkSpeed > 0 && process.env.NODE_ENV === 'development' && (
          <div 
            className="position-absolute"
            style={{
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '10px',
              borderRadius: '4px',
              padding: '4px 8px',
              opacity: 0.7,
              pointerEvents: 'none'
            }}
          >
            <div>{currentQuality} • {networkSpeed.toFixed(1)}Mbps • {(bufferProgress * 10).toFixed(1)}s</div>
          </div>
        )}
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
                    
                    {currentUser && currentUser.id !== uploader.id && (
                      <Button 
                        variant={isSubscribed ? "secondary" : "danger"}
                        onClick={handleSubscribe}
                        disabled={actionLoading.subscribe}
                      >
                        {isSubscribed ? 'Đã đăng ký' : 'Đăng ký'}
                      </Button>
                    )}
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
          {/* Related Videos / Recommendations */}
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
                <Alert variant="info">
                  <Link to={`/login?redirect=/video/${videoId}`}>Đăng nhập</Link> để thêm bình luận
                </Alert>
              )}
              
              {comments.length > 0 ? (
                <ListGroup variant="flush">
                  {comments.map(comment => (
                    <ListGroup.Item key={comment._id} className="border-bottom py-3 px-0">
                      <div className="d-flex">
                        <div className="me-3">
                          {comment.avatar ? (
                            <img 
                              src={comment.avatar} 
                              alt={comment.displayName} 
                              className="rounded-circle" 
                              width="40" 
                              height="40" 
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
                              style={{ width: '40px', height: '40px' }}
                            >
                              <FaUser size={20} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="d-flex align-items-center mb-1">
                            <strong>{comment.displayName}</strong>
                            <small className="text-secondary ms-2">
                              {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                            </small>
                          </div>
                          <p className="mb-1">{comment.content}</p>
                          <div>
                            <Button variant="link" size="sm" className="p-0 me-3 text-secondary">
                              <FaThumbsUp className="me-1" />
                              {comment.likes}
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-secondary">
                              <FaThumbsDown className="me-1" />
                              {comment.dislikes}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-3">
                  <p className="text-secondary">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
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