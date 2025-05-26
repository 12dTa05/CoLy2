// AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../api';

// Tạo context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Kiểm tra người dùng từ localStorage khi component được tải
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);
  
  // Hàm đăng nhập
  const login = async (usernameOrEmail, password) => {
    try {
      setLoading(true);
      const response = await apiLogin(usernameOrEmail, password);
      const { access_token, user } = response.data;
      
      // Lưu token và thông tin người dùng
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setCurrentUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập thất bại'
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Hàm đăng ký
  const register = async (username, email, password, displayName) => {
    try {
      setLoading(true);
      const response = await apiRegister(username, email, password, displayName);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng ký thất bại'
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Hàm đăng xuất
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };
  
  // Giá trị context
  const value = {
    currentUser,
    loading,
    login,
    register,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;