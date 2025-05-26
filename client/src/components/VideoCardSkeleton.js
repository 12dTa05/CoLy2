// VideoCardSkeleton.js - Loading skeleton for video cards
import React from 'react';
import { Card } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const VideoCardSkeleton = () => {
  const { theme } = useTheme();
  
  const skeletonStyle = {
    background: `linear-gradient(90deg, ${theme.colors.surfaceVariant} 25%, ${theme.colors.hover} 50%, ${theme.colors.surfaceVariant} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
    borderRadius: '4px'
  };
  
  return (
    <>
      <style>
        {`
          @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
      <Card 
        className="h-100 border-0"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Thumbnail skeleton */}
        <div 
          style={{
            ...skeletonStyle,
            aspectRatio: '16/9',
            width: '100%'
          }}
          className="rounded-top"
        />
        
        <Card.Body className="p-3">
          {/* Title skeleton */}
          <div 
            style={{
              ...skeletonStyle,
              height: '20px',
              width: '90%',
              marginBottom: '8px'
            }}
          />
          <div 
            style={{
              ...skeletonStyle,
              height: '20px',
              width: '70%',
              marginBottom: '12px'
            }}
          />
          
          {/* Channel name skeleton */}
          <div 
            style={{
              ...skeletonStyle,
              height: '16px',
              width: '60%',
              marginBottom: '6px'
            }}
          />
          
          {/* Stats skeleton */}
          <div className="d-flex">
            <div 
              style={{
                ...skeletonStyle,
                height: '14px',
                width: '50px',
                marginRight: '8px'
              }}
            />
            <div 
              style={{
                ...skeletonStyle,
                height: '14px',
                width: '80px'
              }}
            />
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default VideoCardSkeleton;