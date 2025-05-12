// VideoPlayer.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, Button, Alert, Spinner, Form, ListGroup } from 'react-bootstrap';
import Hls from 'hls.js';
import { FaThumbsUp, FaThumbsDown, FaUser, FaEye, FaCalendarAlt, FaComment } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getVideo, getHLSUrl, getVideoComments, addComment } from '../api';
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
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin video');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideoData();
  }, [videoId]);
  
  // Thiết lập HLS player
  useEffect(() => {
    if (!video || !video.status === 'ready' || !videoRef.current) return;
    
    // Hủy instance HLS cũ nếu có
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    
    const contentPath = video.contentPath.endsWith('/') ? video.contentPath.slice(0, -1) : video.contentPath;
    const hlsUrl = getHLSUrl(contentPath + '/master.m3u8');
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play().catch(e => console.error('Không thể tự động phát video:', e));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Lỗi mạng khi tải tệp HLS');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Lỗi phương tiện khi phát HLS');
              hls.recoverMediaError();
              break;
            default:
              console.error('Lỗi không thể khôi phục khi phát HLS');
              hls.destroy();
              break;
          }
        }
      });
      
      hlsRef.current = hls;
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
  
  // Định dạng thời gian
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
    <div>
      {/* Player */}
      <div className="ratio ratio-16x9 mb-4 shadow rounded">
        <video
          ref={videoRef}
          controls
          playsInline
          className="embed-responsive-item"
        />
      </div>
      
      <Row className="mb-4">
        <Col>
          <h2>{video.title}</h2>
          
          <div className="d-flex align-items-center mb-3">
            <FaEye className="me-1 text-secondary" />
            <span className="me-3 text-secondary">{video.stats.views} lượt xem</span>
            
            <FaCalendarAlt className="me-1 text-secondary" />
            <span className="me-3 text-secondary">
              {video.publishedAt ? formatPublishedTime(video.publishedAt) : 'Chưa xuất bản'}
            </span>
            
            <span className="ms-auto">
              <span className="me-3">
                <FaThumbsUp className="me-1" />
                {video.stats.likes}
              </span>
              <span>
                <FaThumbsDown className="me-1" />
                {video.stats.dislikes}
              </span>
            </span>
          </div>
          
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
                  className="badge bg-secondary me-1"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          
          <hr />
          
          {/* Thông tin người đăng */}
          {uploader && (
            <div className="d-flex align-items-center mb-4">
              <div className="me-3">
                {uploader.avatar ? (
                  <img 
                    src={uploader.avatar} 
                    alt={uploader.displayName} 
                    className="rounded-circle" 
                    width="50" 
                    height="50" 
                  />
                ) : (
                  <div 
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
                    style={{ width: '50px', height: '50px' }}
                  >
                    <FaUser />
                  </div>
                )}
              </div>
              <div>
                <h5 className="m-0">{uploader.displayName}</h5>
                <small className="text-secondary">{uploader.subscriberCount} người đăng ký</small>
              </div>
              {currentUser && currentUser.id !== uploader.id && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="ms-auto"
                >
                  Đăng ký
                </Button>
              )}
            </div>
          )}
          
          {/* Mô tả video */}
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Mô tả</Card.Title>
              <Card.Text style={{ whiteSpace: 'pre-line' }}>
                {video.description || 'Không có mô tả cho video này.'}
              </Card.Text>
            </Card.Body>
          </Card>
          
          {/* Phần bình luận */}
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