// Register.js
import React, { useState, useEffect, useContext } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaUserPlus, FaUser, FaEnvelope, FaLock, FaUserCircle } from 'react-icons/fa';

import AuthContext from '../context/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams] = useSearchParams();
  
  const { register, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Lấy đường dẫn chuyển hướng sau khi đăng ký (nếu có)
  const redirectPath = searchParams.get('redirect') || '/';
  
  // Nếu đã đăng nhập, chuyển hướng ngay
  useEffect(() => {
    if (currentUser) {
      navigate(redirectPath);
    }
  }, [currentUser, navigate, redirectPath]);
  
  // Xử lý đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu nhập
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin đăng ký');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }
    
    setError('');
    
    try {
      // Đặt tên hiển thị mặc định nếu không nhập
      const finalDisplayName = displayName.trim() || username;
      
      const result = await register(username, email, password, finalDisplayName);
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      setSuccess('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
      
      // Chuyển hướng đến trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate(`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`);
      }, 2000);
    } catch (err) {
      setError('Đã xảy ra lỗi khi đăng ký');
      console.error('Register error:', err);
    }
  };
  
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-sm border-0 my-5">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Đăng ký tài khoản</h2>
                <p className="text-muted">Tạo tài khoản để sử dụng dịch vụ</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaUser className="me-2" />
                    Tên đăng nhập
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Tên đăng nhập phải duy nhất và không chứa ký tự đặc biệt
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaEnvelope className="me-2" />
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaUserCircle className="me-2" />
                    Tên hiển thị (tùy chọn)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nhập tên hiển thị"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Tên được hiển thị cho người dùng khác. Nếu để trống, tên đăng nhập sẽ được sử dụng.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaLock className="me-2" />
                    Mật khẩu
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Mật khẩu phải có ít nhất 6 ký tự
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>
                    <FaLock className="me-2" />
                    Xác nhận mật khẩu
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    className="mb-3"
                    disabled={!!success}
                  >
                    <FaUserPlus className="me-2" />
                    Đăng ký
                  </Button>
                </div>
              </Form>
              
              <div className="text-center mt-3">
                <p>
                  Đã có tài khoản?{' '}
                  <Link 
                    to={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                    className="text-decoration-none"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;