// LoadingSpinner.js - Reusable loading spinner component
import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Đang tải...', 
  fullScreen = false,
  variant = 'primary',
  className = ''
}) => {
  const { theme } = useTheme();
  
  const sizeMap = {
    small: { width: '1rem', height: '1rem' },
    medium: { width: '2rem', height: '2rem' },
    large: { width: '3rem', height: '3rem' }
  };
  
  const spinnerSize = sizeMap[size] || sizeMap.medium;
  
  const SpinnerComponent = (
    <div className={`text-center ${className}`}>
      <Spinner 
        animation="border" 
        variant={variant}
        style={spinnerSize}
        role="status"
      />
      {message && (
        <div 
          className="mt-2"
          style={{ 
            color: theme.colors.textSecondary,
            fontSize: size === 'small' ? '12px' : '14px'
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div 
        className="d-flex justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999
        }}
      >
        <div 
          className="p-4 rounded"
          style={{ backgroundColor: theme.colors.surface }}
        >
          {SpinnerComponent}
        </div>
      </div>
    );
  }
  
  return SpinnerComponent;
};

export default LoadingSpinner;