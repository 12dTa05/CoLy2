// Home.js - Updated với YouTube-style layout
import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getPublicVideos } from '../api';
import VideoCard from '../components/VideoCard';

// const CATEGORIES = [
//   'Tất cả',
//   'Âm nhạc',
//   'Trò chơi', 
//   'Tin tức',
//   'Thể thao',
//   'Giải trí',
//   'Giáo dục',
//   'Khoa học & Công nghệ',
//   'Du lịch',
//   'Đời sống',
//   'Thời trang',
//   'Phim ảnh',
//   'Lịch sử',
//   'Nấu ăn',
//   'Sức khỏe'
// ];

const Home = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  
  // Lấy query từ URL nếu có
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);
  
  // Tải danh sách video công khai
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await getPublicVideos(page, 24); // Tăng số lượng video để phù hợp với grid
        setVideos(response.data.videos);
        setTotalPages(response.data.pages);
      } catch (err) {
        setError('Không thể tải danh sách video');
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [page]);
  
  // // Xử lý chọn danh mục
  // const handleCategorySelect = (category) => {
  //   setSelectedCategory(category);
  //   if (category === 'Tất cả') {
  //     navigate('/');
  //   } else {
  //     navigate(`/search?category=${encodeURIComponent(category)}`);
  //   }
  // };
  
  // Hàm tạo mảng phân trang
  const getPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;
    
    // Tính toán khoảng trang muốn hiển thị
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Điều chỉnh lại startPage nếu không đủ trang ở phía sau
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Thêm nút trang trước
    if (page > 1) {
      items.push(
        <Button 
          key="prev" 
          variant="outline-primary" 
          size="sm"
          className="me-2"
          onClick={() => setPage(page - 1)}
        >
          &laquo; Trước
        </Button>
      );
    }
    
    // Thêm các nút số trang
    for (let i = startPage; i <= endPage; i++) {
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
    
    // Thêm nút trang sau
    if (page < totalPages) {
      items.push(
        <Button
          key="next"
          variant="outline-primary"
          size="sm"
          onClick={() => setPage(page + 1)}
        >
          Sau &raquo;
        </Button>
      );
    }
    
    return items;
  };
  
  // Hiển thị trạng thái loading
  if (loading && page === 1) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }
  
  // Hiển thị lỗi
  if (error && videos.length === 0) {
    return (
      <div className="container py-4">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }
  
  // Hiển thị khi không có video
  if (!loading && videos.length === 0) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <Alert variant="info" className="d-inline-block">
            Chưa có video nào được đăng tải. Hãy là người đầu tiên 
            <Link to="/upload" className="ms-1">tải lên video</Link>!
          </Alert>
        </div>
      </div>
    );
  }
  
  return (
    <div className="home-page">
      {/* Category Bar - Sticky */}
      {/* <div 
        className="category-bar bg-white border-bottom"
        style={{
          position: 'sticky',
          top: '56px',
          zIndex: 1000,
          padding: '12px 24px'
        }}
      >
        <div className="d-flex overflow-auto">
          <div className="d-flex flex-nowrap">
            {CATEGORIES.map((category, index) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "dark" : "outline-secondary"}
                size="sm"
                className={`me-2 flex-shrink-0 ${index === 0 ? 'ms-0' : ''}`}
                onClick={() => handleCategorySelect(category)}
                style={{
                  borderRadius: '8px',
                  fontWeight: selectedCategory === category ? '500' : '400',
                  whiteSpace: 'nowrap',
                  padding: '6px 12px'
                }}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div> */}
      
      {/* Video Grid */}
      <div className="video-grid" style={{ padding: '24px' }}>
        <Row className="g-4">
          {videos.map(video => (
            <Col 
              key={video._id}
              xs={4}
              sm={4}
              md={4}
              lg={3}
              xl={3}
              xxl={3}
            >
              <VideoCard video={video} />
            </Col>
          ))}
        </Row>
        
        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-5 pt-4">
            {getPaginationItems()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;