// SearchResults.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Alert, Spinner, Dropdown } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { searchVideos } from '../api';
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

const DURATIONS = [
  { value: '', label: 'Bất kỳ' },
  { value: 'short', label: 'Ngắn (< 4 phút)' },
  { value: 'medium', label: 'Trung bình (4-20 phút)' },
  { value: 'long', label: 'Dài (> 20 phút)' }
];

const UPLOAD_DATES = [
  { value: '', label: 'Bất kỳ' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'date', label: 'Mới nhất' },
  { value: 'views', label: 'Lượt xem' }
];

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Trích xuất tham số tìm kiếm từ URL
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const duration = searchParams.get('duration') || '';
  const date = searchParams.get('date') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(query);
  
  // Tải kết quả tìm kiếm
  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        setLoading(true);
        
        // Xây dựng tham số tìm kiếm
        const searchParams = {
          query,
          page,
          limit: 12
        };
        
        if (category && category !== 'Tất cả') {
          searchParams.category = category;
        }
        
        if (duration) {
          searchParams.duration = duration;
        }
        
        if (date) {
          searchParams.date = date;
        }
        
        if (sort) {
          searchParams.sort = sort;
        }
        
        const response = await searchVideos(searchParams);
        setVideos(response.data.videos);
        setTotalResults(response.data.total);
        setTotalPages(response.data.pages);
      } catch (err) {
        console.error('Search error:', err);
        setError('Không thể tải kết quả tìm kiếm');
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSearchResults();
  }, [query, category, duration, date, sort, page]);
  
  // Xử lý submit form tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchInput.trim()) {
      setSearchParams({
        q: searchInput,
        ...(category && category !== 'Tất cả' ? { category } : {}),
        ...(duration ? { duration } : {}),
        ...(date ? { date } : {}),
        ...(sort !== 'relevance' ? { sort } : {}),
        page: '1'
      });
    }
  };
  
  // Cập nhật các bộ lọc
  const updateFilter = (type, value) => {
    setSearchParams({
      ...(query ? { q: query } : {}),
      ...(type === 'category' ? (value !== 'Tất cả' ? { category: value } : {}) : (category && category !== 'Tất cả' ? { category } : {})),
      ...(type === 'duration' ? (value ? { duration: value } : {}) : (duration ? { duration } : {})),
      ...(type === 'date' ? (value ? { date: value } : {}) : (date ? { date } : {})),
      ...(type === 'sort' ? (value !== 'relevance' ? { sort: value } : {}) : (sort !== 'relevance' ? { sort } : {})),
      page: '1'
    });
  };
  
  // Xử lý phân trang
  const handlePageChange = (newPage) => {
    setSearchParams({
      ...(query ? { q: query } : {}),
      ...(category && category !== 'Tất cả' ? { category } : {}),
      ...(duration ? { duration } : {}),
      ...(date ? { date } : {}),
      ...(sort !== 'relevance' ? { sort } : {}),
      page: newPage.toString()
    });
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
          onClick={() => handlePageChange(page - 1)}
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
          onClick={() => handlePageChange(i)}
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
          onClick={() => handlePageChange(page + 1)}
        >
          Sau &raquo;
        </Button>
      );
    }
    
    return items;
  };
  
  return (
    <div>
      {/* Thanh tìm kiếm */}
      {/* <Form onSubmit={handleSearch} className="mb-4">
        <InputGroup>
          <Form.Control
            placeholder="Tìm kiếm video..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button variant="primary" type="submit">
            <FaSearch /> Tìm kiếm
          </Button>
        </InputGroup>
      </Form> */}
      
      {/* Bộ lọc */}
      <Card className="mb-2">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center">
            <div className="me-4 mb-2">
              <FaFilter className="me-2" />
              <strong>Bộ lọc:</strong>
            </div>
            
            {/* Danh mục */}
            <Dropdown className="me-3 mb-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-category">
                Danh mục: {category || 'Tất cả'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {CATEGORIES.map(cat => (
                  <Dropdown.Item 
                    key={cat} 
                    active={category === cat}
                    onClick={() => updateFilter('category', cat)}
                  >
                    {cat}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Thời lượng */}
            <Dropdown className="me-3 mb-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-duration">
                Thời lượng: {DURATIONS.find(d => d.value === duration)?.label || 'Bất kỳ'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {DURATIONS.map(dur => (
                  <Dropdown.Item 
                    key={dur.value} 
                    active={duration === dur.value}
                    onClick={() => updateFilter('duration', dur.value)}
                  >
                    {dur.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Ngày đăng */}
            <Dropdown className="me-3 mb-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-date">
                Ngày đăng: {UPLOAD_DATES.find(d => d.value === date)?.label || 'Bất kỳ'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {UPLOAD_DATES.map(d => (
                  <Dropdown.Item 
                    key={d.value} 
                    active={date === d.value}
                    onClick={() => updateFilter('date', d.value)}
                  >
                    {d.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Sắp xếp */}
            <Dropdown className="mb-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
                <FaSortAmountDown className="me-2" />
                {SORT_OPTIONS.find(s => s.value === sort)?.label || 'Liên quan nhất'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {SORT_OPTIONS.map(s => (
                  <Dropdown.Item 
                    key={s.value} 
                    active={sort === s.value}
                    onClick={() => updateFilter('sort', s.value)}
                  >
                    {s.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Card.Body>
      </Card>
      
      {/* Tiêu đề kết quả */}
      <h4 className="mb-3">
        {query 
          ? `Kết quả tìm kiếm cho "${query}"`
          : category && category !== 'Tất cả'
            ? `Danh mục: ${category}`
            : 'Tất cả video'
        }
        <small className="text-muted ms-2">({totalResults} kết quả)</small>
      </h4>
      
      {/* Hiển thị lỗi */}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Hiển thị khi không có kết quả */}
      {!loading && videos.length === 0 && (
        <Alert variant="info">
          Không tìm thấy video nào phù hợp với tiêu chí tìm kiếm. Hãy thử các từ khóa khác hoặc điều chỉnh bộ lọc.
        </Alert>
      )}
      
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

export default SearchResults;