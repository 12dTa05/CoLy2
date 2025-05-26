// AdvancedSearch.js - Advanced search with filters and suggestions
import React, { useState, useEffect, useRef } from 'react';
import { 
  Form, Card, Row, Col, Button, Dropdown, InputGroup, Badge, Modal 
} from 'react-bootstrap';
import { 
  FaSearch, FaFilter, FaTimes, FaHistory, FaSave, FaAngleDown 
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const AdvancedSearch = ({ onSearch, initialQuery = '', showFilters = true }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [query, setQuery] = useState(initialQuery || searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || 'relevance',
    duration: searchParams.get('duration') || '',
    date: searchParams.get('date') || '',
    min_views: searchParams.get('min_views') || '',
    max_views: searchParams.get('max_views') || ''
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Search categories
  const categories = [
    'Tất cả', 'Giáo dục', 'Giải trí', 'Âm nhạc', 'Thể thao', 
    'Tin tức', 'Trò chơi', 'Khoa học & Công nghệ', 'Du lịch', 
    'Đời sống', 'Thời trang', 'Khác'
  ];
  
  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Liên quan nhất' },
    { value: 'date', label: 'Mới nhất' },
    { value: 'views', label: 'Lượt xem cao nhất' },
    { value: 'rating', label: 'Đánh giá cao nhất' }
  ];
  
  // Duration options
  const durationOptions = [
    { value: '', label: 'Bất kỳ' },
    { value: 'short', label: 'Ngắn (< 4 phút)' },
    { value: 'medium', label: 'Trung bình (4-20 phút)' },
    { value: 'long', label: 'Dài (> 20 phút)' }
  ];
  
  // Upload date options
  const dateOptions = [
    { value: '', label: 'Bất kỳ' },
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
    { value: 'year', label: 'Năm nay' }
  ];
  
  // Load search history and saved searches
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    setSearchHistory(history.slice(0, 10)); // Keep last 10 searches
    setSavedSearches(saved);
  }, []);
  
  // Fetch search suggestions
  const fetchSuggestions = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };
  
  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions) {
        fetchSuggestions(query);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, showSuggestions]);
  
  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };
  
  const performSearch = () => {
    if (!query.trim()) return;
    
    // Save to search history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    
    // Build search parameters
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'relevance') {
        params.set(key, value);
      }
    });
    
    // Update URL and trigger search
    if (onSearch) {
      onSearch({ query, ...filters });
    } else {
      navigate(`/search?${params.toString()}`);
    }
    
    setShowSuggestions(false);
    searchInputRef.current?.blur();
  };
  
  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    setFilters(newFilters);
    
    // Auto-search when filters change
    if (query.trim()) {
      setTimeout(() => {
        if (onSearch) {
          onSearch({ query, ...newFilters });
        }
      }, 100);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: '',
      sort: 'relevance',
      duration: '',
      date: '',
      min_views: '',
      max_views: ''
    });
  };
  
  // Save current search
  const saveCurrentSearch = () => {
    if (!saveSearchName.trim() || !query.trim()) return;
    
    const newSavedSearch = {
      id: Date.now(),
      name: saveSearchName,
      query,
      filters,
      createdAt: new Date().toISOString()
    };
    
    const newSavedSearches = [newSavedSearch, ...savedSearches].slice(0, 20);
    setSavedSearches(newSavedSearches);
    localStorage.setItem('savedSearches', JSON.stringify(newSavedSearches));
    
    setShowSaveModal(false);
    setSaveSearchName('');
  };
  
  // Load saved search
  const loadSavedSearch = (savedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    setShowSuggestions(false);
  };
  
  // Get active filter count
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value && value !== 'relevance').length;
  };
  
  return (
    <div style={{ backgroundColor: theme.colors.background }}>
      {/* Main search bar */}
      <Card 
        className="mb-3"
        style={{ 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border 
        }}
      >
        <Card.Body className="p-3">
          <Form onSubmit={handleSearch}>
            <div className="position-relative">
              <InputGroup size="lg">
                <Form.Control
                  ref={searchInputRef}
                  type="text"
                  placeholder="Tìm kiếm video, kênh hoặc chủ đề..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
                
                {query && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setQuery('');
                      searchInputRef.current?.focus();
                    }}
                  >
                    <FaTimes />
                  </Button>
                )}
                
                <Button variant="primary" type="submit">
                  <FaSearch />
                </Button>
                
                {showFilters && (
                  <Button
                    variant={getActiveFilterCount() > 0 ? "warning" : "outline-secondary"}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <FaFilter className="me-1" />
                    {getActiveFilterCount() > 0 && (
                      <Badge bg="light" text="dark" className="ms-1">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                )}
                
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary">
                    <FaAngleDown />
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    {searchHistory.length > 0 && (
                      <>
                        <Dropdown.Header>Tìm kiếm gần đây</Dropdown.Header>
                        {searchHistory.map((historyItem, index) => (
                          <Dropdown.Item
                            key={index}
                            onClick={() => {
                              setQuery(historyItem);
                              performSearch();
                            }}
                          >
                            <FaHistory className="me-2" />
                            {historyItem}
                          </Dropdown.Item>
                        ))}
                        <Dropdown.Divider />
                      </>
                    )}
                    
                    {savedSearches.length > 0 && (
                      <>
                        <Dropdown.Header>Tìm kiếm đã lưu</Dropdown.Header>
                        {savedSearches.slice(0, 5).map((savedSearch) => (
                          <Dropdown.Item
                            key={savedSearch.id}
                            onClick={() => loadSavedSearch(savedSearch)}
                          >
                            <FaSave className="me-2" />
                            {savedSearch.name}
                          </Dropdown.Item>
                        ))}
                        <Dropdown.Divider />
                      </>
                    )}
                    
                    <Dropdown.Item onClick={() => setShowSaveModal(true)}>
                      <FaSave className="me-2" />
                      Lưu tìm kiếm hiện tại
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </InputGroup>
              
              {/* Search suggestions */}
              {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
                <Card 
                  ref={suggestionsRef}
                  className="position-absolute w-100 mt-1"
                  style={{ 
                    zIndex: 1000,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                >
                  <Card.Body className="p-0">
                    {suggestions.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-muted small">Gợi ý tìm kiếm</div>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 suggestion-item"
                            style={{ 
                              cursor: 'pointer',
                              borderBottom: `1px solid ${theme.colors.border}`
                            }}
                            onClick={() => {
                              setQuery(suggestion);
                              setShowSuggestions(false);
                              performSearch();
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaSearch className="me-2 text-muted" />
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchHistory.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-muted small">Tìm kiếm gần đây</div>
                        {searchHistory.slice(0, 5).map((historyItem, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 suggestion-item"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setQuery(historyItem);
                              setShowSuggestions(false);
                              performSearch();
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaHistory className="me-2 text-muted" />
                            {historyItem}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Advanced filters */}
      {showFilters && showAdvancedFilters && (
        <Card 
          className="mb-3"
          style={{ 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border 
          }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0" style={{ color: theme.colors.text }}>
                Bộ lọc nâng cao
              </h6>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={clearFilters}
              >
                Xóa tất cả bộ lọc
              </Button>
            </div>
            
            <Row className="g-3">
              {/* Category filter */}
              <Col md={3}>
                <Form.Label style={{ color: theme.colors.text }}>Danh mục</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category === 'Tất cả' ? '' : category}>
                      {category}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              {/* Sort filter */}
              <Col md={3}>
                <Form.Label style={{ color: theme.colors.text }}>Sắp xếp theo</Form.Label>
                <Form.Select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              {/* Duration filter */}
              <Col md={3}>
                <Form.Label style={{ color: theme.colors.text }}>Thời lượng</Form.Label>
                <Form.Select
                  value={filters.duration}
                  onChange={(e) => handleFilterChange('duration', e.target.value)}
                >
                  {durationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              {/* Upload date filter */}
              <Col md={3}>
                <Form.Label style={{ color: theme.colors.text }}>Ngày đăng</Form.Label>
                <Form.Select
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                >
                  {dateOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              
              {/* View count range */}
              <Col md={6}>
                <Form.Label style={{ color: theme.colors.text }}>Phạm vi lượt xem</Form.Label>
                <Row>
                  <Col>
                    <Form.Control
                      type="number"
                      placeholder="Từ"
                      value={filters.min_views}
                      onChange={(e) => handleFilterChange('min_views', e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      type="number"
                      placeholder="Đến"
                      value={filters.max_views}
                      onChange={(e) => handleFilterChange('max_views', e.target.value)}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {/* Save search modal */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Lưu tìm kiếm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Tên tìm kiếm</Form.Label>
            <Form.Control
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Nhập tên cho tìm kiếm này"
              maxLength={50}
            />
          </Form.Group>
          <div className="mt-3">
            <small className="text-muted">
              Từ khóa: <strong>{query}</strong>
              {getActiveFilterCount() > 0 && (
                <span> - {getActiveFilterCount()} bộ lọc được áp dụng</span>
              )}
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={saveCurrentSearch}
            disabled={!saveSearchName.trim()}
          >
            Lưu tìm kiếm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdvancedSearch;