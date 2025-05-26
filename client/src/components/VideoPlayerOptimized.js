// VideoPlayerOptimized.js - High-performance video player with advanced features
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, Button, Dropdown, Spinner, Alert } from 'react-bootstrap';
import Hls from 'hls.js';
import { 
  FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, 
  FaCompress, FaCog, FaForward, FaBackward, FaRedo 
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const VideoPlayerOptimized = ({ 
  videoId, 
  src, 
  poster, 
  onTimeUpdate, 
  onEnded, 
  onProgress,
  autoPlay = false,
  controls = true,
  className = "",
  style = {}
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Quality and performance states
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferHealth, setBufferHealth] = useState(0);
  
  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const { theme } = useTheme();
  
  // Memoized HLS configuration
  const hlsConfig = useMemo(() => ({
    maxLoadingDelay: 4,
    maxBufferLength: 30,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    enableWorker: true,
    startFragPrefetch: true,
    capLevelToPlayerSize: true,
    adaptOnStartOnly: false,
    startLevel: -1, // Auto
    debug: false
  }), []);
  
  // Initialize HLS player
  const initializeHLS = useCallback(() => {
    if (!src || !videoRef.current) return;
    
    // Cleanup existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (Hls.isSupported()) {
      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      
      // Handle manifest parsing
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsLoading(false);
        
        const qualities = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`,
          bandwidth: level.bandwidth
        }));
        
        setAvailableQualities([
          { index: -1, name: 'Auto', bandwidth: 0 },
          ...qualities.sort((a, b) => b.height - a.height)
        ]);
        
        if (autoPlay) {
          videoRef.current?.play().catch(console.warn);
        }
      });
      
      // Network performance monitoring
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const loadTime = data.stats.total / 1000;
        if (loadTime > 0 && data.frag.byteLength > 0) {
          const speed = (data.frag.byteLength * 8) / (loadTime * 1000000);
          setNetworkSpeed(speed);
        }
      });
      
      // Buffer monitoring
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (videoRef.current) {
          const buffered = videoRef.current.buffered;
          const currentTime = videoRef.current.currentTime;
          
          if (buffered.length > 0) {
            for (let i = 0; i < buffered.length; i++) {
              if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
                const bufferEnd = buffered.end(i);
                const healthPercent = Math.min(((bufferEnd - currentTime) / 10) * 100, 100);
                setBufferHealth(healthPercent);
                break;
              }
            }
          }
        }
      });
      
      // Error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError('Không thể phát video. Vui lòng thử lại.');
              break;
          }
        }
      });
      
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
      setIsLoading(false);
    } else {
      setError('Trình duyệt không hỗ trợ phát video HLS');
    }
  }, [src, hlsConfig, autoPlay]);
  
  // Video event handlers
  const handleLoadStart = useCallback(() => setIsLoading(true), []);
  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setIsBuffering(false);
  }, []);
  const handleWaiting = useCallback(() => setIsBuffering(true), []);
  const handlePlaying = useCallback(() => setIsBuffering(false), []);
  
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);
  
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);
  
  const handleProgress = useCallback(() => {
    if (videoRef.current) {
      const buffered = videoRef.current.buffered;
      const duration = videoRef.current.duration;
      
      if (buffered.length > 0 && duration > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        const progressPercent = (bufferedEnd / duration) * 100;
        onProgress?.(progressPercent);
      }
    }
  }, [onProgress]);
  
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);
  
  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  }, [isPlaying]);
  
  const handleVolumeChange = useCallback((newVolume) => {
    if (!videoRef.current) return;
    
    const volume = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = volume;
    setVolume(volume);
    setIsMuted(volume === 0);
  }, []);
  
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);
  
  const seekTo = useCallback((time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, time));
  }, [duration]);
  
  const skipTime = useCallback((seconds) => {
    seekTo(currentTime + seconds);
  }, [currentTime, seekTo]);
  
  const changePlaybackRate = useCallback((rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);
  
  const changeQuality = useCallback((qualityIndex) => {
    if (!hlsRef.current) return;
    
    if (qualityIndex === -1) {
      hlsRef.current.currentLevel = -1;
      setCurrentQuality('Auto');
    } else {
      hlsRef.current.currentLevel = qualityIndex;
      const quality = availableQualities.find(q => q.index === qualityIndex);
      setCurrentQuality(quality?.name || 'Auto');
    }
  }, [availableQualities]);
  
  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
    }
  }, [isFullscreen]);
  
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (!videoRef.current) return;
    
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    
    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'arrowleft':
      case 'j':
        e.preventDefault();
        skipTime(-10);
        break;
      case 'arrowright':
      case 'l':
        e.preventDefault();
        skipTime(10);
        break;
      case 'arrowup':
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
        break;
      case 'arrowdown':
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        const percent = parseInt(e.key) / 10;
        seekTo(duration * percent);
        break;
      case '?':
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        break;
    }
  }, [togglePlayPause, skipTime, handleVolumeChange, volume, toggleMute, toggleFullscreen, seekTo, duration, showShortcuts]);
  
  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);
  
  // Format time display
  const formatTime = useCallback((time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  // Effects
  useEffect(() => {
    initializeHLS();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializeHLS]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <h5>Lỗi phát video</h5>
        <p>{error}</p>
        <Button variant="primary" onClick={() => {
          setError(null);
          initializeHLS();
        }}>
          <FaRedo className="me-2" />
          Thử lại
        </Button>
      </Alert>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`video-player-container position-relative ${className}`}
      style={{
        backgroundColor: '#000',
        borderRadius: isFullscreen ? '0' : '8px',
        overflow: 'hidden',
        ...style
      }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-100 h-100"
        poster={poster}
        playsInline
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onClick={togglePlayPause}
        style={{ display: 'block' }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="position-absolute top-50 start-50 translate-middle">
          <Spinner animation="border" variant="light" />
        </div>
      )}
      
      {/* Buffering indicator */}
      {isBuffering && !isLoading && (
        <div className="position-absolute top-50 start-50 translate-middle">
          <Spinner animation="border" variant="light" size="sm" />
          <div className="text-white mt-2 small">Đang tải...</div>
        </div>
      )}
      
      {/* Controls overlay */}
      {controls && (
        <div 
          className={`position-absolute bottom-0 start-0 end-0 p-3 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Progress bar */}
          <div 
            ref={progressRef}
            className="progress mb-3"
            style={{ height: '4px', cursor: 'pointer' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seekTo(duration * percent);
            }}
          >
            <div 
              className="progress-bar bg-danger"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Buffer indicator */}
            <div 
              className="position-absolute top-0 bg-white"
              style={{ 
                width: `${bufferHealth}%`,
                height: '100%',
                opacity: 0.3
              }}
            />
          </div>
          
          {/* Control buttons */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              {/* Play/Pause */}
              <Button 
                variant="link" 
                className="text-white p-1 me-2"
                onClick={togglePlayPause}
              >
                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
              </Button>
              
              {/* Skip backward */}
              <Button 
                variant="link" 
                className="text-white p-1 me-2"
                onClick={() => skipTime(-10)}
              >
                <FaBackward size={16} />
              </Button>
              
              {/* Skip forward */}
              <Button 
                variant="link" 
                className="text-white p-1 me-3"
                onClick={() => skipTime(10)}
              >
                <FaForward size={16} />
              </Button>
              
              {/* Volume controls */}
              <div className="d-flex align-items-center me-3">
                <Button 
                  variant="link" 
                  className="text-white p-1 me-2"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                </Button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="form-range"
                  style={{ width: '80px' }}
                />
              </div>
              
              {/* Time display */}
              <span className="text-white small">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="d-flex align-items-center">
              {/* Playback speed */}
              <Dropdown className="me-2">
                <Dropdown.Toggle 
                  variant="link" 
                  className="text-white small p-1"
                  style={{ fontSize: '12px' }}
                >
                  {playbackRate}x
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <Dropdown.Item 
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      active={playbackRate === rate}
                    >
                      {rate}x
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              
              {/* Quality selector */}
              {availableQualities.length > 1 && (
                <Dropdown className="me-2">
                  <Dropdown.Toggle 
                    variant="link" 
                    className="text-white p-1"
                  >
                    <FaCog size={16} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header>Chất lượng</Dropdown.Header>
                    {availableQualities.map(quality => (
                      <Dropdown.Item
                        key={quality.index}
                        onClick={() => changeQuality(quality.index)}
                        active={currentQuality === quality.name}
                      >
                        {quality.name}
                        {quality.bandwidth > 0 && (
                          <small className="text-muted ms-2">
                            ({Math.round(quality.bandwidth / 1000)}k)
                          </small>
                        )}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              )}
              
              {/* Fullscreen */}
              <Button 
                variant="link" 
                className="text-white p-1"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
              </Button>
            </div>
          </div>
          
          {/* Network status */}
          {networkSpeed > 0 && (
            <div className="position-absolute top-0 end-0 p-2">
              <small className="text-white-50">
                {networkSpeed.toFixed(1)} Mbps
                {currentQuality !== 'Auto' && (
                  <span className="ms-2 badge bg-secondary">{currentQuality}</span>
                )}
              </small>
            </div>
          )}
        </div>
      )}
      
      {/* Keyboard shortcuts help */}
      {showShortcuts && (
        <div 
          className="position-absolute top-50 start-50 translate-middle"
          style={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '300px'
          }}
        >
          <h6>Phím tắt</h6>
          <div className="small">
            <div><kbd>Space/K</kbd> - Phát/Tạm dừng</div>
            <div><kbd>←/J</kbd> - Lùi 10s</div>
            <div><kbd>→/L</kbd> - Tiến 10s</div>
            <div><kbd>↑/↓</kbd> - Âm lượng</div>
            <div><kbd>M</kbd> - Tắt/Bật âm</div>
            <div><kbd>F</kbd> - Toàn màn hình</div>
            <div><kbd>0-9</kbd> - Nhảy đến %</div>
            <div><kbd>?</kbd> - Hiện/Ẩn trợ giúp</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerOptimized;