// VideoGrid.js - Optimized video grid with infinite scroll and virtual loading
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useInView } from 'react-intersection-observer';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';
import { useTheme } from '../context/ThemeContext';

const VideoGrid = ({ 
  apiEndpoint, 
  apiParams = {}, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  enableInfiniteScroll = true,
  pageSize = 24,
  cacheKey = null
}) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const { theme } = useTheme();
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  const cache = useRef(new Map());
  const abortController = useRef(null);
  
  // Generate cache key
  const getCacheKey = useCallback(() => {
    if (cacheKey) return cacheKey;
    return `${apiEndpoint}_${JSON.stringify(apiParams)}_${page}`;
  }, [apiEndpoint, apiParams, page, cacheKey]);
  
  // Fetch videos with caching
  const fetchVideos = useCallback(async (pageNum = 1, append = false) => {
    const currentCacheKey = getCacheKey();
    
    // Check cache first
    if (cache.current.has(currentCacheKey) && pageNum === 1) {
      const cachedData = cache.current.get(currentCacheKey);
      setVideos(cachedData.videos);
      setTotalPages(cachedData.totalPages);
      setHasMore(cachedData.hasMore);
      setLoading(false);
      return;
    }
    
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }
      
      const params = new URLSearchParams({
        page: pageNum,
        limit: pageSize,
        ...apiParams
      });
      
      const response = await fetch(`${apiEndpoint}?${params}`, {
        signal: abortController.current.signal,
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newVideos = data.videos || [];
        const updatedVideos = append ? [...videos, ...newVideos] : newVideos;
        
        setVideos(updatedVideos);
        setTotalPages(data.pages || 1);
        setHasMore(data.hasNext !== false && pageNum < (data.pages || 1));
        
        // Cache results for first page
        if (pageNum === 1) {
          cache.current.set(currentCacheKey, {
            videos: newVideos,
            totalPages: data.pages || 1,
            hasMore: data.hasNext !== false
          });
          
          // Limit cache size
          if (cache.current.size > 10) {
            const firstKey = cache.current.keys().next().value;
            cache.current.delete(firstKey);
          }
        }
      } else {
        setError(data.message || 'Không thể tải video');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Lỗi khi tải video. Vui lòng thử lại.');
        console.error('Fetch error:', err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiEndpoint, apiParams, pageSize, videos, getCacheKey]);
  
  // Load more videos when in view
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore, page, totalPages]);
  
  // Effect for infinite scroll
  useEffect(() => {
    if (inView && enableInfiniteScroll) {
      loadMore();
    }
  }, [inView, loadMore, enableInfiniteScroll]);
  
  // Effect for loading more videos
  useEffect(() => {
    if (page > 1) {
      fetchVideos(page, true);
    }
  }, [page, fetchVideos]);
  
  // Effect for initial load and parameter changes
  useEffect(() => {
    setPage(1);
    setVideos([]);
    setHasMore(true);
    fetchVideos(1, false);
  }, [apiEndpoint, JSON.stringify(apiParams)]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);
  
  // Retry function
  const handleRetry = () => {
    setError('');
    setPage(1);
    fetchVideos(1, false);
  };
  
  // Render skeleton loaders
  const renderSkeletons = (count = 8) => {
    return Array(count).fill(0).map((_, index) => (
      <Col 
        key={`skeleton-${index}`}
        xs={columns.xs || 12}
        sm={columns.sm || 6}
        md={columns.md || 4}
        lg={columns.lg || 3}
        xl={columns.xl || 2}
        className="mb-4"
      >
        <VideoCardSkeleton />
      </Col>
    ));
  };
  
  if (loading && videos.length === 0) {
    return (
      <div style={{ backgroundColor: theme.colors.background, minHeight: '400px' }}>
        <Row className="g-4">
          {renderSkeletons()}
        </Row>
      </div>
    );
  }
  
  if (error && videos.length === 0) {
    return (
      <div style={{ backgroundColor: theme.colors.background }}>
        <Alert variant="danger" className="text-center">
          <h5>Không thể tải video</h5>
          <p>{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={handleRetry}
          >
            Thử lại
          </button>
        </Alert>
      </div>
    );
  }
  
  if (videos.length === 0 && !loading) {
    return (
      <div style={{ backgroundColor: theme.colors.background }}>
        <Alert variant="info" className="text-center">
          <h5>Không có video nào</h5>
          <p>Không tìm thấy video nào phù hợp với tiêu chí tìm kiếm.</p>
        </Alert>
      </div>
    );
  }
  
  return (
    <div 
      className="video-grid"
      style={{ backgroundColor: theme.colors.background, minHeight: '100vh' }}
    >
      <Row className="g-4">
        {videos.map((video, index) => (
          <Col 
            key={`${video._id}-${index}`}
            xs={columns.xs || 12}
            sm={columns.sm || 6}
            md={columns.md || 4}
            lg={columns.lg || 3}
            xl={columns.xl || 2}
            className="mb-4"
          >
            <VideoCard 
              video={video} 
              priority={index < 8} // Prioritize loading for first 8 videos
              lazy={index >= 8}
            />
          </Col>
        ))}
        
        {/* Loading more skeletons */}
        {loadingMore && renderSkeletons(4)}
      </Row>
      
      {/* Infinite scroll trigger */}
      {enableInfiniteScroll && hasMore && !loadingMore && (
        <div ref={loadMoreRef} className="d-flex justify-content-center py-4">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      
      {/* Load more button for manual loading */}
      {!enableInfiniteScroll && hasMore && !loadingMore && (
        <div className="d-flex justify-content-center py-4">
          <button 
            className="btn btn-primary btn-lg"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang tải...
              </>
            ) : (
              'Tải thêm video'
            )}
          </button>
        </div>
      )}
      
      {/* End of results */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center py-4">
          <p style={{ color: theme.colors.textSecondary }}>
            Đã hiển thị tất cả {videos.length} video
          </p>
        </div>
      )}
      
      {/* Error banner for loading more */}
      {error && videos.length > 0 && (
        <div className="text-center py-3">
          <Alert variant="warning" className="d-inline-block">
            Lỗi khi tải thêm video. 
            <button 
              className="btn btn-link btn-sm ms-2"
              onClick={() => fetchVideos(page, true)}
            >
              Thử lại
            </button>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;