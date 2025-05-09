// App.js - Main React App Component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import NavbarComponent from './components/NavbarComponent';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import MyVideos from './pages/MyVideos';
import Login from './pages/Login';
import Register from './pages/Register';
import UploadVideo from './pages/UploadVideo';
import VideoPlayer from './pages/VideoPlayer';
import SearchResults from './pages/SearchResults';

// API & Context
import { getCurrentUser } from './api';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập khi tải trang
    getCurrentUser();
    setIsLoading(false);
  }, []);
  
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
          <NavbarComponent />
          <Container className="flex-grow-1 py-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/video/:videoId" element={<VideoPlayer />} />
              
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
              
              {/* Chuyển hướng đến trang chủ cho các URL không hợp lệ */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Container>
          <Footer />
        </div>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;