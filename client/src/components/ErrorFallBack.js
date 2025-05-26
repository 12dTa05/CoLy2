// ErrorFallback.js - Error boundary fallback component
import React from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const { theme } = useTheme();
  
  const handleReload = () => {
    window.location.reload();
  };
  
  const handleGoHome = () => {
    window.location.href = '/';
  };
  
  return (
    <div 
      className="d-flex justify-content-center align-items-center min-vh-100 p-4"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Card 
        className="text-center shadow-lg"
        style={{ 
          maxWidth: '600px',
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <Card.Body className="p-5">
          <div className="mb-4">
            <FaExclamationTriangle 
              size={64} 
              className="text-warning mb-3" 
            />
            <h2 style={{ color: theme.colors.text }}>
              Đã xảy ra lỗi không mong muốn
            </h2>
          </div>
          
          <Alert variant="danger" className="text-start mb-4">
            <Alert.Heading>Chi tiết lỗi:</Alert.Heading>
            <p className="mb-0">
              {error?.message || 'Lỗi không xác định'}
            </p>
            {process.env.NODE_ENV === 'development' && error?.stack && (
              <details className="mt-3">
                <summary>Stack trace (Development only)</summary>
                <pre className="mt-2 small text-muted">
                  {error.stack}
                </pre>
              </details>
            )}
          </Alert>
          
          <div style={{ color: theme.colors.textSecondary }} className="mb-4">
            <p>
              Chúng tôi xin lỗi vì sự bất tiện này. Vui lòng thử một trong các tùy chọn dưới đây 
              để tiếp tục sử dụng ứng dụng.
            </p>
          </div>
          
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
            <Button 
              variant="primary" 
              onClick={resetErrorBoundary}
              className="d-flex align-items-center justify-content-center"
            >
              <FaRedo className="me-2" />
              Thử lại
            </Button>
            
            <Button 
              variant="outline-secondary" 
              onClick={handleReload}
              className="d-flex align-items-center justify-content-center"
            >
              <FaRedo className="me-2" />
              Tải lại trang
            </Button>
            
            <Button 
              variant="outline-primary" 
              onClick={handleGoHome}
              className="d-flex align-items-center justify-content-center"
            >
              <FaHome className="me-2" />
              Về trang chủ
            </Button>
          </div>
          
          <div className="mt-4 pt-3 border-top" style={{ borderColor: theme.colors.border }}>
            <small style={{ color: theme.colors.textSecondary }}>
              Nếu lỗi vẫn tiếp tục xảy ra, vui lòng liên hệ với bộ phận hỗ trợ kỹ thuật.
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ErrorFallback;