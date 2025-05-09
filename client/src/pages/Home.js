// Home.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaEye, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getPublicVideos, getHLSUrl, getThumbnailUrl } from '../api';
import VideoCard from '../components/VideoCard';

const CATEGORIES = [
  'Tất cả',
  'Giáo dục',
  'Giải trí',
  'Âm nhạc',
  'Thể thao',
  'Tin tức',
  'Trò chơi',
  'Khoa học & Công nghệ',
  'Du lịch',
  'Đời sống',
  'Thời trang'
];

const Home = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lấy query từ URL nếu có
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);
  
  // Tải danh sách video công khai
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await getPublicVideos(page, 12);
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
  
  // Xử lý tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Xử lý chọn danh mục
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    if (category === 'Tất cả') {
      navigate('/');
    } else {
      navigate(`/search?category=${encodeURIComponent(category)}`);
    }
  };
  
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
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }
  
  // Hiển thị lỗi
  if (error && videos.length === 0) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  // Hiển thị khi không có video
  if (!loading && videos.length === 0) {
    return (
      <div className="text-center py-5">
        <Alert variant="info">
          Chưa có video nào được đăng tải. Hãy là người đầu tiên 
          <Link to="/upload" className="ms-1">tải lên video</Link>!
        </Alert>
      </div>
    );
  }
  
  return (
    <div>
      {/* Thanh tìm kiếm */}
      <Form onSubmit={handleSearch} className="mb-4">
        <InputGroup>
          <Form.Control
            placeholder="Tìm kiếm video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="primary" type="submit">
            <FaSearch /> Tìm kiếm
          </Button>
        </InputGroup>
      </Form>
      
      {/* Thanh danh mục */}
      <div className="d-flex flex-wrap mb-4">
        {CATEGORIES.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "primary" : "outline-secondary"}
            className="me-2 mb-2"
            onClick={() => handleCategorySelect(category)}
          >
            {category}
          </Button>
        ))}
      </div>
      
      {/* Danh sách video */}
      <Row xs={1} md={2} lg={3} xl={4} className="g-4 mb-4">
        {videos.map(video => (
          <Col key={video._id}>
            <VideoCard video={video} />
          </Col>
        ))}
      </Row>
      
      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          {getPaginationItems()}
        </div>
      )}
    </div>
  );
};

export default Home;