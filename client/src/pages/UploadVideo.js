// UploadVideo.js
import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Card, Alert, ProgressBar, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaUpload, FaVideo } from 'react-icons/fa';

import { uploadVideo, getVideoStatus } from '../api';

const CATEGORIES = [
  'Giáo dục',
  'Giải trí',
  'Âm nhạc',
  'Thể thao',
  'Tin tức',
  'Trò chơi',
  'Khoa học & Công nghệ',
  'Du lịch',
  'Đời sống',
  'Thời trang',
  'Khác'
];

const UploadVideo = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Khác');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusCheckInterval = useRef(null);
  
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Kiểm tra định dạng file
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Định dạng video không được hỗ trợ. Hãy sử dụng MP4.');
        setFile(null);
        e.target.value = null;
        return;
      }
      
      // Kiểm tra kích thước file (giới hạn 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('Kích thước file quá lớn. Giới hạn là 500MB.');
        setFile(null);
        e.target.value = null;
        return;
      }
      
      setFile(selectedFile);
      setError('');
      
      // Tự động lấy tên file làm tiêu đề nếu chưa nhập
      if (!title) {
        // Loại bỏ phần mở rộng và thay thế ký tự gạch ngang/gạch dưới bằng khoảng trắng
        const fileNameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
        const formattedTitle = fileNameWithoutExt.replace(/[_-]/g, ' ');
        setTitle(formattedTitle);
      }
    }
  };

  const checkVideoStatus = async () => {
    if (!uploadedVideoId) return;
    
    try {
      const response = await getVideoStatus(uploadedVideoId);
      const { statusInfo } = response.data;
      
      setProcessingProgress(statusInfo.progress);
      setProcessingStep(statusInfo.currentStep);
      
      if (statusInfo.status === 'ready') {
        setProcessingComplete(true);
        clearInterval(statusCheckInterval.current);
        toast.success('Video đã sẵn sàng để xem!');
      } else if (statusInfo.status === 'error') {
        setProcessingError(statusInfo.error || 'Đã xảy ra lỗi khi xử lý video');
        clearInterval(statusCheckInterval.current);
        toast.error('Xử lý video thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra trạng thái video:', err);
    }
  };
  
  // Bắt đầu kiểm tra khi có ID video đã tải lên
  useEffect(() => {
    if (uploadedVideoId && !processingComplete) {
      // Kiểm tra ngay lập tức
      checkVideoStatus();
      
      // Thiết lập kiểm tra định kỳ (3 giây/lần)
      statusCheckInterval.current = setInterval(checkVideoStatus, 3000);
    }
    
    // Dọn dẹp interval khi component unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [uploadedVideoId, processingComplete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Vui lòng chọn một video để tải lên');
      return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('tags', tags);
    formData.append('visibility', visibility);
    formData.append('video', file);
    
    setUploading(true);
    setError('');
    setUploadProgress(0);
    
    try {
      const response = await uploadVideo(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      
      setSuccess('Video đã được tải lên thành công và đang được xử lý');
      toast.success('Video đã được tải lên thành công!');
      
      // Chuyển hướng đến trang video của người dùng
      setTimeout(() => {
        navigate('/my-videos');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải lên video');
      toast.error('Tải lên thất bại');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Tải lên video mới</h2>
      
      <Card className="mb-4">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={7}>
                <Form.Group className="mb-3">
                  <Form.Label>Tiêu đề</Form.Label>
                  <Form.Control
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề video"
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Mô tả</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả video (tùy chọn)"
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Danh mục</Form.Label>
                      <Form.Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quyền riêng tư</Form.Label>
                      <Form.Select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        <option value="public">Công khai</option>
                        <option value="private">Riêng tư</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Thẻ gắn</Form.Label>
                  <Form.Control
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Nhập các thẻ, phân cách bằng dấu phẩy"
                  />
                  <Form.Text className="text-muted">
                    Ví dụ: giáo dục, học tập, lập trình
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={5}>
                <Card className="h-100">
                  <Card.Body className="d-flex flex-column justify-content-center align-items-center">
                    <div className="mb-4 text-center">
                      {file ? (
                        <div>
                          <FaVideo size={60} className="text-success mb-3" />
                          <h5>{file.name}</h5>
                          <p className="text-secondary">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <FaUpload size={60} className="text-primary mb-3" />
                          <h5>Chọn video để tải lên</h5>
                          <p className="text-secondary">Hỗ trợ định dạng MP4</p>
                        </div>
                      )}
                    </div>
                    
                    <Form.Group className="w-100">
                      <Form.Control
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="d-none"
                        id="video-upload"
                        required={!file}
                      />
                      <div className="d-grid">
                        <Button
                          variant={file ? "outline-success" : "outline-primary"}
                          onClick={() => document.getElementById('video-upload').click()}
                        >
                          {file ? "Chọn video khác" : "Chọn video"}
                        </Button>
                      </div>
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {uploading && (
              <div className="mt-4">
                <p className="mb-2">Đang tải lên: {uploadProgress}%</p>
                <ProgressBar 
                  now={uploadProgress} 
                  label={`${uploadProgress}%`} 
                  variant="success"
                  className="mb-3" 
                />
                <p className="text-secondary small">
                  Vui lòng không đóng trang này cho đến khi tải lên hoàn tất.
                </p>
              </div>
            )}
            
            <div className="d-flex justify-content-between mt-4">
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/my-videos')}
                disabled={uploading}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={uploading || !file}
              >
                {uploading ? 'Đang tải lên...' : 'Tải lên video'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default UploadVideo;