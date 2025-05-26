// Sidebar.js
import React, { useContext } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaPlay, 
  // FaSubscript, 
  FaVideo, 
  FaHistory, 
  FaBookmark, 
  FaClock, 
  FaThumbsUp,
  FaFire,
  FaMusic,
  FaGamepad,
  FaNewspaper,
  FaTrophy,
  FaLightbulb,
  FaUser,
  FaCog
} from 'react-icons/fa';

import { BiSolidVideos } from "react-icons/bi";

import AuthContext from '../context/AuthContext';

const Sidebar = ({ isOpen, isCollapsed }) => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  // Kiểm tra route active
  const isActive = (path) => location.pathname === path;

  // Danh sách menu chính
  const mainMenuItems = [
    { path: '/', icon: FaHome, label: 'Trang chủ' },
    // { path: '/shorts', icon: FaPlay, label: 'Shorts' },
    { path: '/subscriptions', icon: BiSolidVideos, label: 'Kênh đăng ký' }
  ];

  // Danh sách menu cho người dùng đã đăng nhập
  const userMenuItems = currentUser ? [
    { path: '/my-videos', icon: FaVideo, label: 'Video của tôi' },
    { path: '/history', icon: FaHistory, label: 'Lịch sử' },
    { path: '/saved', icon: FaBookmark, label: 'Video đã lưu' },
    { path: '/watch-later', icon: FaClock, label: 'Xem sau' },
    { path: '/liked', icon: FaThumbsUp, label: 'Video đã thích' }
  ] : [];

  // Danh sách khám phá
  const exploreMenuItems = [
    { path: '/trending', icon: FaFire, label: 'Thịnh hành' },
    { path: '/music', icon: FaMusic, label: 'Âm nhạc' },
    { path: '/gaming', icon: FaGamepad, label: 'Trò chơi' },
    { path: '/news', icon: FaNewspaper, label: 'Tin tức' },
    { path: '/sports', icon: FaTrophy, label: 'Thể thao' },
    { path: '/learning', icon: FaLightbulb, label: 'Học tập' }
  ];

  // Render menu item
  const renderMenuItem = (item, index) => (
    <Nav.Link
      key={index}
      as={Link}
      to={item.path}
      className={`sidebar-item d-flex align-items-center py-2 px-3 text-decoration-none ${
        isActive(item.path) ? 'active' : ''
      }`}
    >
      <item.icon className={`sidebar-icon ${isCollapsed ? '' : 'me-3'}`} size={28} />
      <span className="sidebar-label">{item.label}</span>
    </Nav.Link>
  );

  const collapsedMenuItems = [
    { path: '/', icon: FaHome, label: 'Trang chủ' },
    { path: '/subscriptions', icon: BiSolidVideos, label: 'Kênh đăng ký' },
    { path: '/my-videos', icon: FaVideo, label: 'Video của tôi' }
  ];


  return (
    <div 
      className={`sidebar bg-white border-end position-fixed ${isOpen ? 'show' : 'hide'} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '90px' : '240px',
        height: 'calc(100vh - 56px)',
        top: '80px',
        left: 0,
        zIndex: 1000,
        overflowY: 'auto',
        transition: 'width 0.2s ease'
      }}
    >
      <Nav className="flex-column">
        {isCollapsed ? (
          <div className="sidebar-section">
            {collapsedMenuItems.map(renderMenuItem)}
          </div>
        ) : (
          <>
            {/* Menu chính */}
            <div className="sidebar-section">
              {mainMenuItems.map(renderMenuItem)}
            </div>

            {!isCollapsed && <hr className="my-2 mx-2" />}

            {/* Menu người dùng (khi đã đăng nhập) */}
            {currentUser && userMenuItems.length > 0 && (
              <>
                <div className="sidebar-section">
                  {!isCollapsed && (
                    <div className="px-3 py-2">
                      <small className="text-muted fw-bold">BẠN</small>
                    </div>
                  )}
                  {userMenuItems.map(renderMenuItem)}
                </div>
                {!isCollapsed && <hr className="my-2 mx-3" />}
              </>
            )}

            {/* Menu khám phá */}
            <div className="sidebar-section">
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <small className="text-muted fw-bold">KHÁM PHÁ</small>
                </div>
              )}
              {exploreMenuItems.map(renderMenuItem)}
            </div>

            {!isCollapsed && <hr className="my-2 mx-3" />}

            {/* Kênh đăng ký (khi đã đăng nhập) */}
            {currentUser && !isCollapsed && (
              <div className="sidebar-section">
                <div className="px-3 py-2">
                  <small className="text-muted fw-bold">KÊNH ĐĂNG KÝ</small>
                </div>
                <div className="px-3 py-2 text-center">
                  <small className="text-muted">Chưa có kênh đăng ký nào</small>
                </div>
              </div>
            )}

            {/* Settings (khi đã đăng nhập) */}
            {currentUser && !isCollapsed && (
              <>
                <hr className="my-2 mx-3" />
                <div className="sidebar-section">
                  <Nav.Link
                    as={Link}
                    to="/settings"
                    className={`sidebar-item d-flex align-items-center py-2 px-3 text-decoration-none ${
                      isActive('/settings') ? 'active' : ''
                    }`}
                  >
                    <FaCog className="sidebar-icon me-3" size={20} />
                    <span className="sidebar-label">Cài đặt</span>
                  </Nav.Link>
                </div>
              </>
            )}
          </>
        )}
      </Nav>
    </div>
  );
};

export default Sidebar;