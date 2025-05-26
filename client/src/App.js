// App.js - Main React App Component với Sidebar Integration
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import CSS
import './styles/sidebar.css';

// Components
import NavbarComponent from './components/NavbarComponent';
import Sidebar from './components/SideBar';
import PrivateRoute from './components/PrivateRoute';
// import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import MyVideos from './pages/MyVideos';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadVideo from './pages/UploadVideo';
import VideoPlayer from './pages/VideoPlayer';
import SearchResults from './pages/SearchResults';
import Subscriptions from './pages/Subscriptions';
import History from './pages/History';
import SavedVideos from './pages/SavedVideos';
import WatchLater from './pages/WatchLater';
import LikedVideos from './pages/LikedVideos';
import ChannelPage from './pages/ChannelPage';

// API & Context
import { getCurrentUser } from './api';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check screen size để tự động collapse sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1312) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
      
      if (window.innerWidth <= 792) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập khi tải trang
    getCurrentUser();
    setIsLoading(false);
  }, []);
  
  // Function để toggle sidebar
  const toggleSidebar = () => {
    if (window.innerWidth <= 792) {
      // Trên mobile, chỉ toggle show/hide
      setSidebarOpen(!sidebarOpen);
    } else {
      // Trên desktop, toggle collapse state
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };
  
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }
  
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          {/* Navbar */}
          <NavbarComponent onToggleSidebar={toggleSidebar} />
          
          {/* Main Layout */}
          <div className="d-flex flex-grow-1">
            {/* Sidebar */}
            <Sidebar 
              isOpen={sidebarOpen} 
              isCollapsed={sidebarCollapsed} 
            />
            
            {/* Main Content Area */}
            <main 
              className={`main-content flex-grow-1 ${
                sidebarCollapsed ? 'sidebar-collapsed' : ''
              } ${!sidebarOpen ? 'sidebar-hidden' : ''}`}
              style={{
                marginLeft: window.innerWidth <= 792 ? 0 : 
                           sidebarCollapsed || window.innerWidth <= 1312 ? '72px' : '240px',
                transition: 'margin-left 0.2s ease',
                minHeight: 'calc(100vh - 56px)'
              }}
            >
              <div className="container-fluid p-0">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/video/:videoId" element={<VideoPlayer />} />
                  <Route path="/channel/:channelId" element={<ChannelPage />} />
                  
                  {/* Các route yêu cầu đăng nhập */}
                  <Route path="/my-videos" element={
                    <PrivateRoute>
                      <MyVideos />
                    </PrivateRoute>
                  } />
                  <Route path="/upload" element={
                    <PrivateRoute>
                      <UploadVideo />
                    </PrivateRoute>
                  } />
                  
                  {/* Placeholder routes cho các trang sidebar */}
                  <Route path="/shorts" element={
                    <div className="container py-4">
                      <h2>Shorts</h2>
                      <p>Chức năng Shorts đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/subscriptions" element={
                    <PrivateRoute>
                      <Subscriptions />
                    </PrivateRoute>
                  } />
                  <Route path="/history" element={
                    <PrivateRoute>
                      <History />
                    </PrivateRoute>
                  } />
                  <Route path="/saved" element={
                    <PrivateRoute>
                      <SavedVideos />
                    </PrivateRoute>
                  } />
                  <Route path="/watch-later" element={
                    <PrivateRoute>
                      <WatchLater />
                    </PrivateRoute>
                  } />
                  <Route path="/liked" element={
                    <PrivateRoute>
                      <LikedVideos />
                    </PrivateRoute>
                  } />
                  <Route path="/trending" element={
                    <div className="container py-4">
                      <h2>Thịnh hành</h2>
                      <p>Chức năng thịnh hành đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/music" element={
                    <div className="container py-4">
                      <h2>Âm nhạc</h2>
                      <p>Chức năng âm nhạc đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/gaming" element={
                    <div className="container py-4">
                      <h2>Trò chơi</h2>
                      <p>Chức năng trò chơi đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/news" element={
                    <div className="container py-4">
                      <h2>Tin tức</h2>
                      <p>Chức năng tin tức đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/sports" element={
                    <div className="container py-4">
                      <h2>Thể thao</h2>
                      <p>Chức năng thể thao đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/learning" element={
                    <div className="container py-4">
                      <h2>Học tập</h2>
                      <p>Chức năng học tập đang được phát triển...</p>
                    </div>
                  } />
                  <Route path="/settings" element={
                    <PrivateRoute>
                      <div className="container py-4">
                        <h2>Cài đặt</h2>
                        <p>Chức năng cài đặt đang được phát triển...</p>
                      </div>
                    </PrivateRoute>
                  } />
                  
                  {/* Chuyển hướng đến trang chủ cho các URL không hợp lệ */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
              
              {/* Footer */}
              {/* <Footer /> */}
            </main>
          </div>
        </div>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;