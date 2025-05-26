// NavbarComponent.js - Updated với hamburger menu
import React, { useState, useContext } from 'react';
import { Navbar, Container, Nav, Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaUpload, FaSignOutAlt, FaYoutube, FaCog, FaBars } from 'react-icons/fa';
import { toast } from 'react-toastify';

import AuthContext from '../context/AuthContext';

const NavbarComponent = ({ onToggleSidebar }) => {
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
    <Navbar bg="dark" variant="dark" expand="lg" className="sticky-top" style={{ height: '56px' }}>
      <Container fluid className="px-5">
        <div className="d-flex align-items-center">
          {/* Hamburger Menu Button */}
          <Button
            variant="link"
            className="text-white p-2 me-3 d-flex align-items-center justify-content-left"
            onClick={onToggleSidebar}
            style={{ 
              width: '50px', 
              height: '50px',
              border: 'none',
              borderRadius: '50%'
            }}
          >
            <FaBars size={16} />
          </Button>
          
          {/* Logo */}
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center me-1">
            <FaYoutube className="me-1" size={35} />
            <span className="d-none d-md-inline">HLS Youtube</span>
            <span className="d-md-none">HLS</span>
          </Navbar.Brand>
        </div>
        
        {/* Search Bar - Centered */}
        <div className="flex-grow-1 d-flex justify-content-center">
          <Form 
            className="d-flex" 
            style={{ width: '100%', maxWidth: '700px', borderRadius: '30px' }} 
            onSubmit={handleSearch}
          >
            <InputGroup>
              <Form.Control 
                type="search" 
                placeholder="Tìm kiếm video..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white text-black border-secondary"
                style={{
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  borderRight: 'none'
                }}
              />
              <Button 
                variant="outline-light" 
                type="submit"
                className="d-flex align-items-center justify-content-center"
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: 'none',
                  minWidth: '64px'
                }}
              >
                <FaSearch />
              </Button>
            </InputGroup>
          </Form>
        </div>
        
        {/* Right Side Actions */}
        <div className="d-flex align-items-center ms-3">
          {currentUser ? (
            <>
              {/* Upload Button */}
              <Button 
                as={Link} 
                to="/upload" 
                variant="link" 
                className="text-white p-2 me-2 d-flex align-items-center justify-content-center"
                style={{ 
                  width: '40px', 
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%'
                }}
                title="Tải lên video"
              >
                <FaUpload size={20} />
              </Button>
              
              {/* User Dropdown */}
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant="link" 
                  id="dropdown-user" 
                  className="p-0 d-flex align-items-center border-0"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.displayName} 
                      className="rounded-circle" 
                      width="45" 
                      height="45" 
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                      style={{ width: '40px', height: '40px' }}
                    >
                      <FaUser size={20} color="white" />
                    </div>
                  )}
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="dropdown-menu-end">
                  <Dropdown.Header>
                    <div className="d-flex align-items-center">
                      {currentUser.avatar ? (
                        <img 
                          src={currentUser.avatar} 
                          alt={currentUser.displayName} 
                          className="rounded-circle me-2" 
                          width="40" 
                          height="40" 
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2" 
                          style={{ width: '40px', height: '40px' }}
                        >
                          <FaUser size={20} color="white" />
                        </div>
                      )}
                      <div>
                        <div className="fw-bold">{currentUser.displayName}</div>
                        <small className="text-muted">@{currentUser.username}</small>
                      </div>
                    </div>
                  </Dropdown.Header>
                  
                  <Dropdown.Divider />
                  
                  <Dropdown.Item as={Link} to="/my-videos">
                    <FaYoutube className="me-2" />
                    Video của tôi
                  </Dropdown.Item>
                  
                  <Dropdown.Item as={Link} to="/settings">
                    <FaCog className="me-2" />
                    Cài đặt
                  </Dropdown.Item>
                  
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
              <Nav.Link 
                as={Link} 
                to="/login" 
                className="text-white me-2 px-3 py-2"
              >
                Đăng nhập
              </Nav.Link>
              <Button 
                as={Link} 
                to="/register" 
                variant="primary" 
                className="px-3 py-2"
              >
                Đăng ký
              </Button>
            </>
          )}
        </div>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;