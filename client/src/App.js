// App.js - Complete main application with all optimized features
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import CSS
import './styles/sidebar.css';
import './styles/dark-theme.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import NavbarComponent from './components/NavbarComponent';
import Sidebar from './components/SideBar';
import PrivateRoute from './components/PrivateRoute';
import NotificationSystem from './components/NotificationSystem';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorFallback from './components/ErrorFallback';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const MyVideos = lazy(() => import('./pages/MyVideos'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const UploadVideo = lazy(() => import('./pages/UploadVideo'));
const VideoPlayer = lazy(() => import('./pages/VideoPlayer'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const History = lazy(() => import('./pages/History'));
const SavedVideos = lazy(() => import('./pages/SavedVideos'));
const WatchLater = lazy(() => import('./pages/WatchLater'));
const LikedVideos = lazy(() => import('./pages/LikedVideos'));
const ChannelPage = lazy(() => import('./pages/ChannelPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));
const PlaylistManager = lazy(() => import('./components/PlaylistManager'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Performance monitoring
const performanceMonitor = {
  startTime: Date.now(),
  navigationTimes: [],
  
  recordNavigation: (path) => {
    const endTime = Date.now();
    const duration = endTime - performanceMonitor.startTime;
    performanceMonitor.navigationTimes.push({
      path,
      duration,
      timestamp: endTime
    });
    performanceMonitor.startTime = endTime;
    
    // Log slow navigations
    if (duration > 1000) {
      console.warn(`Slow navigation to ${path}: ${duration}ms`);
    }
  },
  
  getStats: () => ({
    averageNavigationTime: performanceMonitor.navigationTimes.reduce((sum, nav) => sum + nav.duration, 0) / performanceMonitor.navigationTimes.length,
    slowestNavigation: Math.max(...performanceMonitor.navigationTimes.map(nav => nav.duration)),
    totalNavigations: performanceMonitor.navigationTimes.length
  })
};

// Service Worker registration for PWA features
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Network status monitoring
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Detect connection type if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, connectionType };
};

// Main App Component
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState(null);
  
  const { isOnline, connectionType } = useNetworkStatus();
  
  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Register service worker
        registerServiceWorker();
        
        // Check API health
        const { api } = await import('./utils/apiClient');
        const isHealthy = await api.healthCheck();
        
        if (!isHealthy && isOnline) {
          console.warn('API health check failed');
        }
        
        // Load user preferences
        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState !== null) {
          setSidebarCollapsed(JSON.parse(savedSidebarState));
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization failed:', error);
        setAppError('Không thể khởi tạo ứng dụng. Vui lòng tải lại trang.');
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, [isOnline]);
  
  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width <= 1312) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
      
      if (width <= 792) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    if (window.innerWidth <= 792) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };
  
  // Navigation performance tracking
  useEffect(() => {
    const path = window.location.pathname;
    performanceMonitor.recordNavigation(path);
  }, []);
  
  // Global error handler
  const handleGlobalError = (error, errorInfo) => {
    console.error('Global error:', error, errorInfo);
    
    // Send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Integration with error tracking service like Sentry
      console.log('Error would be sent to monitoring service');
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-3 text-muted">Đang khởi tạo ứng dụng...</p>
        </div>
      </div>
    );
  }
  
  // App error state
  if (appError) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Lỗi khởi tạo ứng dụng</h4>
            <p>{appError}</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleGlobalError}
      onReset={() => window.location.reload()}
    >
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="d-flex flex-column min-vh-100">
              {/* Offline notification */}
              {!isOnline && (
                <div className="alert alert-warning mb-0 text-center" role="alert">
                  <strong>Không có kết nối internet.</strong> Một số tính năng có thể bị hạn chế.
                </div>
              )}
              
              {/* Slow connection warning */}
              {isOnline && connectionType === 'slow-2g' && (
                <div className="alert alert-info mb-0 text-center" role="alert">
                  <strong>Kết nối chậm được phát hiện.</strong> Video có thể tải chậm hơn bình thường.
                </div>
              )}
              
              {/* Navbar */}
              <NavbarComponent 
                onToggleSidebar={toggleSidebar}
                NotificationComponent={NotificationSystem}
              />
              
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/video/:videoId" element={<VideoPlayer />} />
                        <Route path="/channel/:channelId" element={<ChannelPage />} />
                        <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
                        
                        {/* Protected Routes */}
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
                        <Route path="/playlists" element={
                          <PrivateRoute>
                            <PlaylistManager />
                          </PrivateRoute>
                        } />
                        <Route path="/analytics" element={
                          <PrivateRoute>
                            <AnalyticsDashboard />
                          </PrivateRoute>
                        } />
                        <Route path="/notifications" element={
                          <PrivateRoute>
                            <NotificationsPage />
                          </PrivateRoute>
                        } />
                        <Route path="/settings" element={
                          <PrivateRoute>
                            <SettingsPage />
                          </PrivateRoute>
                        } />
                        
                        {/* Placeholder routes for future features */}
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
                        
                        {/* 404 Redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </div>
                </main>
              </div>
            </div>
          </Router>
          
          {/* Toast Notifications */}
          <ToastContainer 
            position="top-right" 
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
          
          {/* Performance monitoring in development */}
          {process.env.NODE_ENV === 'development' && (
            <div 
              style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '12px',
                zIndex: 9999
              }}
            >
              <div>Network: {connectionType}</div>
              <div>Online: {isOnline ? 'Yes' : 'No'}</div>
              <div>Navigations: {performanceMonitor.navigationTimes.length}</div>
              {performanceMonitor.navigationTimes.length > 0 && (
                <div>
                  Avg: {Math.round(performanceMonitor.getStats().averageNavigationTime)}ms
                </div>
              )}
            </div>
          )}
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;