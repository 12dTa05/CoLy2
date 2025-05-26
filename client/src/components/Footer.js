// Footer.js
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaVideo, FaGithub, FaHeart } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-5 py-4 bg-dark text-white">
      <Container>
        <Row className="align-items-center">
          <Col md={4} className="text-center text-md-start mb-3 mb-md-0">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start">
              <FaVideo className="me-2" size={24} />
              <h5 className="mb-0">Nam Anh</h5>
            </div>
            <p className="mb-0 mt-2 small">
              HLS Video Player
            </p>
          </Col>
          
          <Col md={4} className="text-center mb-3 mb-md-0">
            {/* <div>
              <Link to="/" className="text-white text-decoration-none mx-2">Trang chủ</Link>
              <span className="text-secondary">|</span>
              <Link to="/search" className="text-white text-decoration-none mx-2">Tìm kiếm</Link>
              <span className="text-secondary">|</span>
              <Link to="/upload" className="text-white text-decoration-none mx-2">Tải lên</Link>
            </div>
            <p className="mt-2 mb-0 small text-secondary">
              &copy; {currentYear} HLS Video Player 
            </p> */}
          </Col>
          
          <Col md={4} className="text-center text-md-end">
            <p className="mb-0 small">
              <a 
                href="https://github.com/12dTa05/CoLy2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white text-decoration-none"
              >
                <FaGithub className="me-1" /> GitHub
              </a>
            </p>
            <p className="mb-0 mt-2 small text-secondary">
              Made with <FaHeart className="text-danger mx-1" size={12} /> for your project
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;