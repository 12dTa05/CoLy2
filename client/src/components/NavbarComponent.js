// NavbarComponent.js
import React, { useState, useContext } from 'react';
import { Navbar, Container, Nav, Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaUpload, FaSignOutAlt, FaVideo, FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';

import AuthContext from '../context/AuthContext';

const NavbarComponent = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Xử lý đăng xuất
  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công');
    navigate('/');
  };
  
  // Xử lý tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };
  
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="sticky-top">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaVideo className="me-2" />
          <span>HLS Video Player</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          
          <Form className="d-flex mx-auto" style={{ width: '650px' }} onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control 
                type="search" 
                placeholder="Tìm kiếm video..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-dark text-white border-secondary"
              />
              <Button variant="outline-light" type="submit">
                <FaSearch />
              </Button>
            </InputGroup>
          </Form>
          
          <Nav>
            {currentUser ? (
              <>
                <Button 
                  as={Link} 
                  to="/upload" 
                  variant="outline-light" 
                  className="me-2 d-flex align-items-center"
                >
                  <FaUpload className="me-md-1" />
                  <span className="d-none d-md-inline">Tải lên</span>
                </Button>
                
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="link" 
                    id="dropdown-user" 
                    className="nav-link text-light p-0 d-flex align-items-center"
                  >
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.displayName} 
                        className="rounded-circle me-1" 
                        width="32" 
                        height="32" 
                      />
                    ) : (
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-1" style={{ width: '32px', height: '32px' }}>
                        <FaUser size={16} />
                      </div>
                    )}
                    <span className="d-none d-md-inline">{currentUser.displayName}</span>
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to="/my-videos">
                      <FaVideo className="me-2" />
                      Video của tôi
                    </Dropdown.Item>
                    {/* <Dropdown.Item as={Link} to="/settings">
                      <FaCog className="me-2" />
                      Cài đặt
                    </Dropdown.Item> */}
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>
                      <FaSignOutAlt className="me-2" />
                      Đăng xuất
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="me-2">Đăng nhập</Nav.Link>
                <Button as={Link} to="/register" variant="primary">Đăng ký</Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;