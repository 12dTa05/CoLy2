import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getPublicVideos } from '../api';

const PublicVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await getPublicVideos();
        setVideos(response.data.videos);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải danh sách video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center my-5">
        <Alert variant="info">
          Chưa có video nào được đăng tải.
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Tất cả video</h2>
      
      <Row xs={1} md={2} lg={3} className="g-4">
        {videos.map(video => (
          <Col key={video._id}>
            <Card>
              <Card.Body>
                <Card.Title>{video.title}</Card.Title>
                <Card.Text>
                  {video.description ? video.description.substring(0, 100) + (video.description.length > 100 ? '...' : '') : 'Không có mô tả'}
                </Card.Text>
                <Card.Text>
                  <small className="text-muted">
                    Lượt xem: {video.views || 0}
                  </small>
                </Card.Text>
                <Button
                  as={Link}
                  to={`/video/${video._id}`}
                  variant="outline-primary"
                >
                  Xem video
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default PublicVideos;