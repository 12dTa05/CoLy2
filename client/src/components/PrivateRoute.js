// PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';

import AuthContext from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  const location = useLocation();
  
  // Hiển thị loading spinner khi đang kiểm tra trạng thái đăng nhập
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
        <p className="mt-2">Đang xác thực...</p>
      </div>
    );
  }
  
  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập với thông tin về trang đang truy cập
  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} />;
  }
  
  // Nếu đã đăng nhập, hiển thị nội dung được bảo vệ
  return children;
};

export default PrivateRoute;