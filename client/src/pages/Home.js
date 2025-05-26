// Home.js - Updated home page with optimized video grid and trending content
import React, { useState } from 'react';
import { Button, Nav, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaFire, FaVideo, FaPlus } from 'react-icons/fa';
import VideoGrid from '../components/VideoGrid';
import { useTheme } from '../context/ThemeContext';

const CATEGORY_FILTERS = [
  { value: '', label: 'Tất cả', color: '#065fd4' },
  { value: 'Âm nhạc', label: 'Âm nhạc', color: '#ff4081' },
  { value: 'Trò chơi', label: 'Gaming', color: '#4caf50' },
  { value: 'Tin tức', label: 'Tin tức', color: '#ff9800' },
  { value: 'Thể thao', label: 'Thể thao', color: '#f44336' },
  { value: 'Giải trí', label: 'Giải trí', color: '#e91e63' },
  { value: 'Giáo dục', label: 'Giáo dục', color: '#9c27b0' },
  { value: 'Khoa học & Công nghệ', label: 'Khoa học', color: '#2196f3' },
  { value: 'Du lịch', label: 'Du lịch', color: '#00bcd4' },
  { value: 'Đời sống', label: 'Đời sống', color: '#795548' },
  { value: 'Thời trang', label: 'Thời trang', color: '#607d8b' },
  { value: 'Nấu ăn', label: 'Nấu ăn', color: '#ff5722' }
];

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('latest'); // 'latest', 'trending', 'recommended'
  const { theme } = useTheme();
  
  // Get API endpoint based on view mode
  const getApiEndpoint = () => {
    switch (viewMode) {
      case 'trending':
        return 'http://localhost:8000/api/videos/trending';
      case 'recommended':
        return 'http://localhost:8000/api/videos/recommended';
      default:
        return 'http://localhost:8000/api/videos/optimized';
    }
  };
  
  // Get API parameters
  const getApiParams = () => {
    const params = {
      sort: viewMode === 'latest' ? 'recent' : viewMode
    };
    
    if (selectedCategory) {
      params.category = selectedCategory;
    }
    
    return params;
  };
  
  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedCategory(''); // Reset category when changing view mode
  };
  
  return (
    <div style={{ backgroundColor: theme.colors.background, minHeight: '100vh' }}>
      {/* Category Filter Bar */}
      <div 
        className="category-bar sticky-top"
        style={{
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: '12px 24px',
          zIndex: 1000
        }}
      >
        <div className="d-flex overflow-auto">
          <div className="d-flex flex-nowrap gap-2">
            {/* View Mode Toggles */}
            <div className="d-flex me-4">
              <Button
                variant={viewMode === 'latest' ? 'primary' : 'outline-secondary'}
                size="sm"
                className="me-2 flex-shrink-0"
                onClick={() => handleViewModeChange('latest')}
                style={{
                  borderRadius: '20px',
                  fontWeight: viewMode === 'latest' ? '500' : '400',
                  whiteSpace: 'nowrap',
                  padding: '6px 16px'
                }}
              >
                <FaVideo className="me-1" size={12} />
                Mới nhất
              </Button>
              
              <Button
                variant={viewMode === 'trending' ? 'danger' : 'outline-secondary'}
                size="sm"
                className="me-2 flex-shrink-0"
                onClick={() => handleViewModeChange('trending')}
                style={{
                  borderRadius: '20px',
                  fontWeight: viewMode === 'trending' ? '500' : '400',
                  whiteSpace: 'nowrap',
                  padding: '6px 16px'
                }}
              >
                <FaFire className="me-1" size={12} />
                Thịnh hành
              </Button>
            </div>
            
            {/* Category Filters */}
            {CATEGORY_FILTERS.map((category, index) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "dark" : "outline-secondary"}
                size="sm"
                className={`flex-shrink-0 ${index === 0 ? 'ms-0' : ''}`}
                onClick={() => handleCategorySelect(category.value)}
                style={{
                  borderRadius: '20px',
                  fontWeight: selectedCategory === category.value ? '500' : '400',
                  whiteSpace: 'nowrap',
                  padding: '6px 16px',
                  backgroundColor: selectedCategory === category.value ? category.color : 'transparent',
                  borderColor: selectedCategory === category.value ? category.color : theme.colors.border,
                  color: selectedCategory === category.value ? 'white' : theme.colors.text
                }}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Welcome Section for New Users */}
      <div className="container-fluid" style={{ padding: '24px' }}>
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 
                className="mb-2"
                style={{ color: theme.colors.text, fontWeight: '400' }}
              >
                {viewMode === 'trending' ? 'Video thịnh hành' : 
                 viewMode === 'recommended' ? 'Đề xuất cho bạn' : 
                 'Video mới nhất'}
                {selectedCategory && (
                  <span style={{ color: theme.colors.textSecondary }}>
                    {' '} • {CATEGORY_FILTERS.find(c => c.value === selectedCategory)?.label}
                  </span>
                )}
              </h2>
              <p style={{ color: theme.colors.textSecondary, margin: 0 }}>
                {viewMode === 'trending' 
                  ? 'Khám phá những video được xem nhiều nhất hiện tại'
                  : viewMode === 'recommended'
                  ? 'Video được đề xuất dựa trên sở thích của bạn'
                  : 'Những video mới được đăng tải gần đây'
                }
              </p>
            </div>
            
            {/* Upload CTA for authenticated users */}
            <div className="d-none d-md-block">
              <Link to="/upload" className="btn btn-primary d-flex align-items-center">
                <FaPlus className="me-2" />
                Tải lên video
              </Link>
            </div>
          </div>
        </div>
        
        {/* Video Grid */}
        <VideoGrid
          apiEndpoint={getApiEndpoint()}
          apiParams={getApiParams()}
          columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
          enableInfiniteScroll={true}
          pageSize={30}
          cacheKey={`home_${viewMode}_${selectedCategory}`}
        />
        
        {/* Empty State for No Videos */}
        <div className="mt-5">
          <Alert variant="info" className="text-center">
            <div className="mb-3">
              <FaVideo size={48} style={{ color: theme.colors.textSecondary }} />
            </div>
            <h5>Chào mừng đến với HLS Youtube!</h5>
            <p className="mb-3">
              Khám phá hàng nghìn video chất lượng cao từ cộng đồng sáng tạo. 
              Tìm kiếm nội dung yêu thích hoặc bắt đầu chia sẻ video của bạn.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <Link to="/search" className="btn btn-outline-primary">
                Tìm kiếm video
              </Link>
              <Link to="/register" className="btn btn-primary">
                Tạo tài khoản
              </Link>
            </div>
          </Alert>
        </div>
      </div>
      
      {/* Performance Information for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="position-fixed bottom-0 start-0 p-3"
          style={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            fontSize: '12px',
            zIndex: 999
          }}
        >
          <div>Mode: {viewMode}</div>
          <div>Category: {selectedCategory || 'All'}</div>
          <div>Endpoint: {getApiEndpoint()}</div>
        </div>
      )}
    </div>
  );
};

export default Home;