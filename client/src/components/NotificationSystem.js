// NotificationSystem.js - Real-time notification management
import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Dropdown, Badge, ListGroup, Button, Card, Modal, Form, Alert 
} from 'react-bootstrap';
import { 
  FaBell, FaVideo, FaHeart, FaComment, FaUserPlus, FaCheck, 
  FaTimes, FaCog, FaTrash, FaEye, FaEyeSlash 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newVideos: true,
    newComments: true,
    newSubscribers: true,
    videoLikes: true,
    mentions: true
  });
  
  const { currentUser } = useContext(AuthContext);
  const { theme } = useTheme();
  const wsRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const API_BASE = 'http://localhost:8000/api';
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (error) {
      toast.error('Lỗi khi cập nhật thông báo');
    }
  };
  
  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const deletedNotification = notifications.find(n => n._id === notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Lỗi khi xóa thông báo');
    }
  };
  
  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) return;
    
    try {
      await fetch(`${API_BASE}/notifications/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Đã xóa tất cả thông báo');
    } catch (error) {
      toast.error('Lỗi khi xóa thông báo');
    }
  };
  
  // Update notification settings
  const updateSettings = async () => {
    try {
      await fetch(`${API_BASE}/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      setShowSettings(false);
      toast.success('Đã cập nhật cài đặt thông báo');
    } catch (error) {
      toast.error('Lỗi khi cập nhật cài đặt');
    }
  };
  
  // Initialize WebSocket connection for real-time notifications
  const initializeWebSocket = () => {
    if (!currentUser || wsRef.current) return;
    
    const wsUrl = `ws://localhost:8000/ws/notifications?token=${localStorage.getItem('token')}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Notification WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      
      // Add new notification to the beginning of the list
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep only 50 notifications
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted' && settings.pushNotifications) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
      
      // Show toast notification
      toast.info(notification.message, {
        onClick: () => {
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }
      });
    };
    
    wsRef.current.onclose = () => {
      console.log('Notification WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(initializeWebSocket, 5000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };
  
  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  };
  
  // Format notification time
  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };
  
  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_video':
        return <FaVideo className="text-primary" />;
      case 'new_comment':
        return <FaComment className="text-info" />;
      case 'video_like':
        return <FaHeart className="text-danger" />;
      case 'new_subscriber':
        return <FaUserPlus className="text-success" />;
      default:
        return <FaBell className="text-secondary" />;
    }
  };
  
  // Effects
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      initializeWebSocket();
      requestNotificationPermission();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentUser]);
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser) return;
      
      try {
        const response = await fetch(`${API_BASE}/notifications/settings`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };
    
    loadSettings();
  }, [currentUser]);
  
  if (!currentUser) return null;
  
  return (
    <>
      <Dropdown 
        show={showDropdown} 
        onToggle={setShowDropdown}
        ref={dropdownRef}
      >
        <Dropdown.Toggle 
          variant="link" 
          className="text-white p-2 position-relative border-0"
          style={{ backgroundColor: 'transparent' }}
        >
          <FaBell size={20} />
          {unreadCount > 0 && (
            <Badge 
              bg="danger" 
              className="position-absolute top-0 start-100 translate-middle rounded-pill"
              style={{ fontSize: '10px' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Dropdown.Toggle>
        
        <Dropdown.Menu 
          align="end"
          className="notification-dropdown"
          style={{ 
            width: '380px',
            maxHeight: '500px',
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            boxShadow: theme.colors.shadow
          }}
        >
          {/* Header */}
          <div 
            className="d-flex justify-content-between align-items-center p-3 border-bottom"
            style={{ borderColor: theme.colors.border }}
          >
            <h6 className="mb-0" style={{ color: theme.colors.text }}>
              Thông báo
            </h6>
            <div>
              <Button 
                variant="link" 
                size="sm" 
                className="p-1 me-2"
                onClick={() => setShowSettings(true)}
                title="Cài đặt thông báo"
              >
                <FaCog size={14} style={{ color: theme.colors.textSecondary }} />
              </Button>
              {unreadCount > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-1"
                  onClick={markAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <FaCheck size={14} style={{ color: theme.colors.textSecondary }} />
                </Button>
              )}
            </div>
          </div>
          
          {/* Notifications list */}
          <div 
            className="notification-list"
            style={{ maxHeight: '350px', overflowY: 'auto' }}
          >
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border spinner-border-sm" />
                <div className="mt-2 small" style={{ color: theme.colors.textSecondary }}>
                  Đang tải...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-4">
                <FaBell size={32} style={{ color: theme.colors.textSecondary }} className="mb-2" />
                <div style={{ color: theme.colors.text }}>Không có thông báo nào</div>
                <small style={{ color: theme.colors.textSecondary }}>
                  Thông báo mới sẽ xuất hiện tại đây
                </small>
              </div>
            ) : (
              <ListGroup variant="flush">
                {notifications.map(notification => (
                  <ListGroup.Item
                    key={notification._id}
                    className={`notification-item border-0 ${!notification.isRead ? 'unread' : ''}`}
                    style={{
                      backgroundColor: !notification.isRead 
                        ? theme.colors.surfaceVariant 
                        : 'transparent',
                      borderBottom: `1px solid ${theme.colors.border}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification._id);
                      }
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                      setShowDropdown(false);
                    }}
                  >
                    <div className="d-flex align-items-start p-2">
                      <div className="me-3 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-grow-1 min-w-0">
                        <div 
                          className="fw-medium"
                          style={{ 
                            color: theme.colors.text,
                            fontSize: '14px',
                            lineHeight: '1.3'
                          }}
                        >
                          {notification.title}
                        </div>
                        <div 
                          className="small mt-1"
                          style={{ 
                            color: theme.colors.textSecondary,
                            lineHeight: '1.3'
                          }}
                        >
                          {notification.message}
                        </div>
                        <div 
                          className="small mt-1"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {formatNotificationTime(notification.createdAt)}
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column">
                        {!notification.isRead && (
                          <div 
                            className="rounded-circle bg-primary"
                            style={{ width: '8px', height: '8px' }}
                          />
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                        >
                          <FaTimes size={10} style={{ color: theme.colors.textSecondary }} />
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div 
              className="p-2 border-top d-flex justify-content-between"
              style={{ borderColor: theme.colors.border }}
            >
              <Button 
                variant="link" 
                size="sm"
                onClick={clearAllNotifications}
                className="text-danger p-1"
              >
                <FaTrash className="me-1" />
                Xóa tất cả
              </Button>
              <Link 
                to="/notifications" 
                className="btn btn-link btn-sm p-1"
                style={{ color: theme.colors.primary }}
                onClick={() => setShowDropdown(false)}
              >
                Xem tất cả
              </Link>
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>
      
      {/* Settings Modal */}
      <Modal 
        show={showSettings} 
        onHide={() => setShowSettings(false)}
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
          <Modal.Title>Cài đặt thông báo</Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ backgroundColor: theme.colors.surface }}>
          <Form>
            <div className="mb-4">
              <h6 style={{ color: theme.colors.text }}>Phương thức thông báo</h6>
              
              <Form.Check
                type="switch"
                id="emailNotifications"
                label="Thông báo qua email"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({
                  ...settings,
                  emailNotifications: e.target.checked
                })}
                className="mb-2"
              />
              
              <Form.Check
                type="switch"
                id="pushNotifications"
                label="Thông báo đẩy trên trình duyệt"
                checked={settings.pushNotifications}
                onChange={(e) => setSettings({
                  ...settings,
                  pushNotifications: e.target.checked
                })}
              />
            </div>
            
            <div>
              <h6 style={{ color: theme.colors.text }}>Loại thông báo</h6>
              
              <Form.Check
                type="switch"
                id="newVideos"
                label="Video mới từ kênh đăng ký"
                checked={settings.newVideos}
                onChange={(e) => setSettings({
                  ...settings,
                  newVideos: e.target.checked
                })}
                className="mb-2"
              />
              
              <Form.Check
                type="switch"
                id="newComments"
                label="Bình luận mới trên video của tôi"
                checked={settings.newComments}
                onChange={(e) => setSettings({
                  ...settings,
                  newComments: e.target.checked
                })}
                className="mb-2"
              />
              
              <Form.Check
                type="switch"
                id="newSubscribers"
                label="Người đăng ký mới"
                checked={settings.newSubscribers}
                onChange={(e) => setSettings({
                  ...settings,
                  newSubscribers: e.target.checked
                })}
                className="mb-2"
              />
              
              <Form.Check
                type="switch"
                id="videoLikes"
                label="Lượt thích trên video của tôi"
                checked={settings.videoLikes}
                onChange={(e) => setSettings({
                  ...settings,
                  videoLikes: e.target.checked
                })}
                className="mb-2"
              />
              
              <Form.Check
                type="switch"
                id="mentions"
                label="Được nhắc đến trong bình luận"
                checked={settings.mentions}
                onChange={(e) => setSettings({
                  ...settings,
                  mentions: e.target.checked
                })}
              />
            </div>
          </Form>
        </Modal.Body>
        
        <Modal.Footer 
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }}
        >
          <Button 
            variant="secondary" 
            onClick={() => setShowSettings(false)}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={updateSettings}
          >
            Lưu cài đặt
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotificationSystem;