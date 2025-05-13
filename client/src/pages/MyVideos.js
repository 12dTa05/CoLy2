// MyVideos.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Tab, Tabs, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUpload, FaEye, FaClock, FaEllipsisV } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getMyVideos, getThumbnailUrl } from '../api';

const MyVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  
  // Tải danh sách video của người dùng
  useEffect(() => {
    const fetchMyVideos = async () => {
      try {
        setLoading(true);
        const response = await getMyVideos(page, 12);
        setVideos(response.data.videos);
        setTotalPages(response.data.pages);
      } catch (err) {
        setError('Không thể tải danh sách video của bạn');
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyVideos();
  }, [page]);
  
  // Lọc video theo trạng thái dựa vào tab đang active
  const filteredVideos = videos.filter(video => {
    if (activeTab === 'all') return true;
    if (activeTab === 'processing') return video.status === 'processing' || video.status === 'uploading';
    if (activeTab === 'ready') return video.status === 'ready';
    if (activeTab === 'public') return video.status === 'ready' && video.visibility === 'public';
    if (activeTab === 'private') return video.status === 'ready' && (video.visibility === 'private' || video.visibility === 'unlisted');
    
    return true;
  });
  
  // Định dạng thời lượng video
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
  
  // Định dạng ngày
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
  
  // Hiển thị lỗi
  if (error && videos.length === 0) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  // Hiển thị khi không có video
  if (!loading && videos.length === 0) {
    return (
      <div className="text-center py-5">
        <Alert variant="info" className="d-inline-block">
          <p>Bạn chưa có video nào. Hãy tải lên video đầu tiên của bạn!</p>
          <Button as={Link} to="/upload" variant="primary">
            <FaUpload className="me-2" />
            Tải lên video
          </Button>
        </Alert>
      </div>
    );
  }
  
  // Hàm tạo mảng phân trang
  const getPaginationItems = () => {
    const items = [];
    
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
    for (let i = 1; i <= totalPages; i++) {
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
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Video của tôi</h2>
        <Button as={Link} to="/upload" variant="primary">
          <FaUpload className="me-2" />
          Tải lên video
        </Button>
      </div>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="all" title="Tất cả">
          {filteredVideos.length === 0 && (
            <Alert variant="info" className="mt-3">Không có video nào trong danh mục này.</Alert>
          )}
        </Tab>
        <Tab eventKey="processing" title="Đang xử lý">
          {filteredVideos.length === 0 && (
            <Alert variant="info" className="mt-3">Không có video nào đang xử lý.</Alert>
          )}
        </Tab>
        {/* <Tab eventKey="ready" title="Đã sẵn sàng">
          {filteredVideos.length === 0 && (
            <Alert variant="info" className="mt-3">Không có video nào đã sẵn sàng.</Alert>
          )}
        </Tab> */}
        <Tab eventKey="public" title="Công khai">
          {filteredVideos.length === 0 && (
            <Alert variant="info" className="mt-3">Không có video nào được công khai.</Alert>
          )}
        </Tab>
        <Tab eventKey="private" title="Riêng tư">
          {filteredVideos.length === 0 && (
            <Alert variant="info" className="mt-3">Không có video nào ở chế độ riêng tư.</Alert>
          )}
        </Tab>
      </Tabs>
      
      {filteredVideos.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Video</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Lượt xem</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map(video => (
                <tr key={video._id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="position-relative me-3" style={{ width: '120px', minWidth: '120px' }}>
                        <Link to={`/video/${video._id}`}>
                          <img 
                            src={video.thumbnailPath ? getThumbnailUrl(video.thumbnailPath) : 'https://via.placeholder.com/120x68?text=No+Thumbnail'} 
                            alt={video.title}
                            className="img-fluid rounded"
                            style={{ width: '120px', height: '68px', objectFit: 'cover' }}
                          />
                          {video.duration > 0 && (
                            <div 
                              className="position-absolute bottom-0 end-0 bg-dark text-white px-1 m-1 rounded"
                              style={{ fontSize: '0.7rem' }}
                            >
                              {formatDuration(video.duration)}
                            </div>
                          )}
                        </Link>
                      </div>
                      <div>
                        <Link 
                          to={`/video/${video._id}`} 
                          className="text-decoration-none text-reset"
                        >
                          <h6 className="mb-1">{video.title}</h6>
                        </Link>
                        <small className="text-muted d-block">
                          {video.description
                            ? video.description.length > 60
                              ? video.description.substring(0, 60) + '...'
                              : video.description
                            : 'Không có mô tả'
                          }
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {video.status === 'uploading' && (
                      <span className="badge bg-info">Đang tải lên</span>
                    )}
                    {video.status === 'processing' && (
                      <span className="badge bg-warning text-dark">Đang xử lý</span>
                    )}
                    {video.status === 'error' && (
                      <span className="badge bg-danger">Lỗi</span>
                    )}
                    {video.status === 'ready' && (
                      <>
                        {/* <span className="badge bg-success mb-1 d-block">Đã sẵn sàng</span> */}
                        {video.visibility === 'public' && (
                          <span className="badge bg-primary">Công khai</span>
                        )}
                        {video.visibility === 'private' && (
                          <span className="badge bg-dark">Riêng tư</span>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {formatDate(video.createdAt)}
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <FaEye className="me-1 text-secondary" />
                      {video.stats.views}
                    </div>
                  </td>
                  <td>
                    <Dropdown>
                      <Dropdown.Toggle variant="light" size="sm" id={`dropdown-${video._id}`}>
                        <FaEllipsisV />
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        {/* <Dropdown.Item as={Link} to={`/video/${video._id}`}>Xem video</Dropdown.Item> */}
                        <Dropdown.Item disabled={video.status !== 'ready'}>Chỉnh sửa</Dropdown.Item>
                        <Dropdown.Item disabled={video.status !== 'ready'}>Sao chép liên kết</Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item className="text-danger">Xóa</Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          {getPaginationItems()}
        </div>
      )}
    </div>
  );
};

export default MyVideos;