// Login.js
import React, { useState, useEffect, useContext } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaSignInAlt, FaUser, FaLock } from 'react-icons/fa';

import AuthContext from '../context/AuthContext';

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  
  const { login, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Lấy đường dẫn chuyển hướng sau khi đăng nhập (nếu có)
  const redirectPath = searchParams.get('redirect') || '/';
  
  // Nếu đã đăng nhập, chuyển hướng ngay
  useEffect(() => {
    if (currentUser) {
      navigate(redirectPath);
    }
  }, [currentUser, navigate, redirectPath]);
  
  // Xử lý đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!usernameOrEmail.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập/email và mật khẩu');
      return;
    }
    
    setError('');
    
    try {
      const result = await login(usernameOrEmail, password);
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      // Chuyển hướng sau khi đăng nhập thành công
      navigate(redirectPath);
    } catch (err) {
      setError('Đã xảy ra lỗi khi đăng nhập');
      console.error('Login error:', err);
    }
  };
  
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-sm border-0 my-5">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Đăng nhập</h2>
                <p className="text-muted">Vui lòng đăng nhập để tiếp tục</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaUser className="me-2" />
                    Tên đăng nhập hoặc Email
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nhập tên đăng nhập hoặc email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
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
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    className="mb-3"
                  >
                    <FaSignInAlt className="me-2" />
                    Đăng nhập
                  </Button>
                </div>
              </Form>
              
              <div className="text-center mt-3">
                <p>
                  Chưa có tài khoản?{' '}
                  <Link 
                    to={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                    className="text-decoration-none"
                  >
                    Đăng ký ngay
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

export default Login;