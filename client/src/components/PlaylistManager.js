// PlaylistManager.js - Complete playlist management system
import React, { useState, useEffect, useContext } from 'react';
import { 
  Modal, Button, Form, Card, Row, Col, Dropdown, Alert, 
  Spinner, ListGroup, Badge 
} from 'react-bootstrap';
import { 
  FaPlus, FaEdit, FaTrash, FaPlay, FaEllipsisV, 
  FaLock, FaGlobe, FaEyeSlash 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PlaylistManager = ({ videoId = null, onAddToPlaylist = null }) => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private'
  });
  const [submitting, setSubmitting] = useState(false);
  
  const { currentUser } = useContext(AuthContext);
  const { theme } = useTheme();
  
  const API_BASE = 'http://localhost:8000/api';
  
  // Fetch user playlists
  const fetchPlaylists = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/users/${currentUser.id}/playlists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setPlaylists(data.playlists);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách playlist');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPlaylists();
  }, [currentUser]);
  
  // Create new playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tên playlist');
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setPlaylists([data.playlist, ...playlists]);
        setShowCreateModal(false);
        setFormData({ title: '', description: '', visibility: 'private' });
        toast.success('Đã tạo playlist thành công');
        
        // Auto add video if provided
        if (videoId && onAddToPlaylist) {
          await addVideoToPlaylist(data.playlist._id, videoId);
        }
      } else {
        toast.error(data.message || 'Lỗi khi tạo playlist');
      }
    } catch (error) {
      toast.error('Lỗi khi tạo playlist');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Add video to playlist
  const addVideoToPlaylist = async (playlistId, videoIdToAdd) => {
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId: videoIdToAdd })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Đã thêm video vào playlist');
        if (onAddToPlaylist) {
          onAddToPlaylist(playlistId);
        }
        // Update playlist video count
        setPlaylists(playlists.map(p => 
          p._id === playlistId 
            ? { ...p, videoCount: p.videoCount + 1 }
            : p
        ));
      } else {
        toast.error(data.message || 'Lỗi khi thêm video');
      }
    } catch (error) {
      toast.error('Lỗi khi thêm video vào playlist');
    }
  };
  
  // Delete playlist
  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Bạn có chắc muốn xóa playlist này?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setPlaylists(playlists.filter(p => p._id !== playlistId));
        toast.success('Đã xóa playlist');
      } else {
        toast.error(data.message || 'Lỗi khi xóa playlist');
      }
    } catch (error) {
      toast.error('Lỗi khi xóa playlist');
    }
  };
  
  // Get visibility icon
  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public':
        return <FaGlobe className="text-success" title="Công khai" />;
      case 'unlisted':
        return <FaEyeSlash className="text-warning" title="Không công khai" />;
      default:
        return <FaLock className="text-secondary" title="Riêng tư" />;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  
  if (!currentUser) {
    return (
      <Alert variant="info" className="text-center">
        <h5>Đăng nhập để quản lý playlist</h5>
        <p>Bạn cần đăng nhập để tạo và quản lý playlist của mình.</p>
        <Link to="/login" className="btn btn-primary">
          Đăng nhập
        </Link>
      </Alert>
    );
  }
  
  return (
    <div style={{ backgroundColor: theme.colors.background, minHeight: '100vh' }}>
      <div className="container py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 style={{ color: theme.colors.text }}>Playlist của tôi</h2>
            <p style={{ color: theme.colors.textSecondary }}>
              Quản lý và tổ chức video yêu thích của bạn
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateModal(true)}
            className="d-flex align-items-center"
          >
            <FaPlus className="me-2" />
            Tạo playlist mới
          </Button>
        </div>
        
        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
              Đang tải playlist...
            </p>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && playlists.length === 0 && (
          <div className="text-center py-5">
            <FaPlay size={48} style={{ color: theme.colors.textSecondary }} className="mb-3" />
            <h4 style={{ color: theme.colors.text }}>Chưa có playlist nào</h4>
            <p style={{ color: theme.colors.textSecondary }} className="mb-4">
              Tạo playlist đầu tiên để tổ chức video yêu thích của bạn
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <FaPlus className="me-2" />
              Tạo playlist đầu tiên
            </Button>
          </div>
        )}
        
        {/* Playlist grid */}
        {!loading && playlists.length > 0 && (
          <Row className="g-4">
            {playlists.map(playlist => (
              <Col key={playlist._id} xs={12} sm={6} md={4} lg={3}>
                <Card 
                  className="h-100 playlist-card"
                  style={{ 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border 
                  }}
                >
                  {/* Thumbnail */}
                  <div 
                    className="position-relative"
                    style={{ aspectRatio: '16/9', backgroundColor: theme.colors.surfaceVariant }}
                  >
                    {playlist.thumbnailVideoId ? (
                      <img 
                        src={`${API_BASE}/thumbnails/${playlist.thumbnailVideoId}.jpg`}
                        alt={playlist.title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100">
                        <FaPlay size={24} style={{ color: theme.colors.textSecondary }} />
                      </div>
                    )}
                    
                    {/* Video count overlay */}
                    <div 
                      className="position-absolute bottom-0 end-0 m-2 px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        color: 'white',
                        fontSize: '12px'
                      }}
                    >
                      {playlist.videoCount} video
                    </div>
                  </div>
                  
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 
                        className="card-title mb-0"
                        style={{ 
                          color: theme.colors.text,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {playlist.title}
                      </h6>
                      
                      <div className="d-flex align-items-center">
                        {getVisibilityIcon(playlist.visibility)}
                        <Dropdown className="ms-2">
                          <Dropdown.Toggle 
                            variant="link" 
                            className="p-0 border-0"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            <FaEllipsisV size={12} />
                          </Dropdown.Toggle>
                          
                          <Dropdown.Menu>
                            <Dropdown.Item 
                              as={Link} 
                              to={`/playlist/${playlist._id}`}
                            >
                              <FaPlay className="me-2" />
                              Xem playlist
                            </Dropdown.Item>
                            <Dropdown.Item 
                              onClick={() => {
                                setEditingPlaylist(playlist);
                                setFormData({
                                  title: playlist.title,
                                  description: playlist.description || '',
                                  visibility: playlist.visibility
                                });
                                setShowEditModal(true);
                              }}
                            >
                              <FaEdit className="me-2" />
                              Chỉnh sửa
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item 
                              className="text-danger"
                              onClick={() => handleDeletePlaylist(playlist._id)}
                            >
                              <FaTrash className="me-2" />
                              Xóa playlist
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </div>
                    
                    {playlist.description && (
                      <p 
                        className="text-muted small mb-2"
                        style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {playlist.description}
                      </p>
                    )}
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <small style={{ color: theme.colors.textSecondary }}>
                        {formatDate(playlist.updatedAt)}
                      </small>
                      
                      {videoId && (
                        <Button 
                          variant="outline-primary"
                          size="sm"
                          onClick={() => addVideoToPlaylist(playlist._id, videoId)}
                        >
                          Thêm video
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
      
      {/* Create Playlist Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)}
        centered
      >
        <Modal.Header 
          closeButton
          style={{ 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text
          }}
        >
          <Modal.Title>Tạo playlist mới</Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleCreatePlaylist}>
          <Modal.Body style={{ backgroundColor: theme.colors.surface }}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: theme.colors.text }}>
                Tên playlist *
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Nhập tên playlist"
                maxLength={150}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label style={{ color: theme.colors.text }}>
                Mô tả
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Mô tả playlist (tùy chọn)"
                maxLength={5000}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label style={{ color: theme.colors.text }}>
                Quyền riêng tư
              </Form.Label>
              <Form.Select
                value={formData.visibility}
                onChange={(e) => setFormData({...formData, visibility: e.target.value})}
              >
                <option value="private">Riêng tư</option>
                <option value="unlisted">Không công khai</option>
                <option value="public">Công khai</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          
          <Modal.Footer 
            style={{ 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border 
            }}
          >
            <Button 
              variant="secondary" 
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang tạo...
                </>
              ) : (
                'Tạo playlist'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default PlaylistManager;