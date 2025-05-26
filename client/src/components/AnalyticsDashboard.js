// AnalyticsDashboard.js - Comprehensive analytics and insights dashboard
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  Row, Col, Card, Button, Form, Dropdown, Spinner, Alert, Table, Badge 
} from 'react-bootstrap';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  FaEye, FaThumbsUp, FaComment, FaUserPlus, FaVideo, FaClock,
  FaDownload, FaShare, FaTrendingUp, FaTrendingDown, FaCalendarAlt,
  FaGlobe, FaUsers, FaPlay, FaHeart
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [topVideos, setTopVideos] = useState([]);
  const [demographicsData, setDemographicsData] = useState([]);
  const [trafficSources, setTrafficSources] = useState([]);
  
  const { currentUser } = useContext(AuthContext);
  const { theme } = useTheme();
  
  const API_BASE = 'http://localhost:8000/api';
  
  // Color scheme for charts
  const colors = {
    primary: '#3ea6ff',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    secondary: '#6c757d'
  };
  
  // Date range options
  const dateRangeOptions = [
    { value: '7', label: '7 ngày qua' },
    { value: '30', label: '30 ngày qua' },
    { value: '90', label: '3 tháng qua' },
    { value: '365', label: '1 năm qua' }
  ];
  
  // Metric options for chart
  const metricOptions = [
    { value: 'views', label: 'Lượt xem', icon: FaEye, color: colors.primary },
    { value: 'likes', label: 'Lượt thích', icon: FaThumbsUp, color: colors.danger },
    { value: 'comments', label: 'Bình luận', icon: FaComment, color: colors.info },
    { value: 'subscribers', label: 'Người đăng ký', icon: FaUserPlus, color: colors.success },
    { value: 'watchTime', label: 'Thời gian xem', icon: FaClock, color: colors.warning }
  ];
  
  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/analytics/dashboard?days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
        setTopVideos(data.analytics.topVideos || []);
        setDemographicsData(data.analytics.demographics || []);
        setTrafficSources(data.analytics.trafficSources || []);
      } else {
        setError(data.message || 'Lỗi khi tải dữ liệu phân tích');
      }
    } catch (err) {
      setError('Không thể tải dữ liệu phân tích');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch detailed chart data
  const fetchChartData = async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/chart?metric=${selectedMetric}&days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalytics(prev => ({
          ...prev,
          chartData: data.chartData
        }));
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };
  
  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };
  
  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Export analytics data
  const exportData = async (format = 'csv') => {
    try {
      const response = await fetch(`${API_BASE}/analytics/export?format=${format}&days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${dateRange}days.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Đã xuất dữ liệu thành công');
      } else {
        toast.error('Lỗi khi xuất dữ liệu');
      }
    } catch (err) {
      toast.error('Lỗi khi xuất dữ liệu');
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const selectedMetricOption = metricOptions.find(m => m.value === selectedMetric);
      
      return (
        <div className="custom-tooltip p-3 rounded shadow" style={{ 
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.text
        }}>
          <p className="label mb-1"><strong>{label}</strong></p>
          <p className="value mb-0" style={{ color: selectedMetricOption?.color }}>
            <selectedMetricOption.icon className="me-2" />
            {selectedMetricOption?.label}: {formatNumber(payload[0].value)}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Memoized chart data
  const chartData = useMemo(() => {
    return analytics?.chartData || [];
  }, [analytics?.chartData]);
  
  // Effects
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, currentUser]);
  
  useEffect(() => {
    if (analytics) {
      fetchChartData();
    }
  }, [selectedMetric, dateRange]);
  
  if (!currentUser) {
    return (
      <Alert variant="info" className="text-center">
        <h5>Đăng nhập để xem phân tích</h5>
        <p>Bạn cần đăng nhập để xem dữ liệu phân tích kênh của mình.</p>
      </Alert>
    );
  }
  
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
          Đang tải dữ liệu phân tích...
        </p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <h5>Lỗi tải dữ liệu</h5>
        <p>{error}</p>
        <Button variant="primary" onClick={() => fetchAnalytics()}>
          Thử lại
        </Button>
      </Alert>
    );
  }
  
  const summary = analytics?.summary || {};
  const prevSummary = analytics?.previousPeriod || {};
  
  return (
    <div style={{ backgroundColor: theme.colors.background, minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 style={{ color: theme.colors.text }}>Phân tích kênh</h2>
            <p style={{ color: theme.colors.textSecondary }}>
              Theo dõi hiệu suất và xu hướng kênh của bạn
            </p>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <Form.Select
              size="sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: 'auto' }}
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            
            <Dropdown>
              <Dropdown.Toggle variant="outline-primary" size="sm">
                <FaDownload className="me-2" />
                Xuất dữ liệu
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => exportData('csv')}>
                  Xuất CSV
                </Dropdown.Item>
                <Dropdown.Item onClick={() => exportData('xlsx')}>
                  Xuất Excel
                </Dropdown.Item>
                <Dropdown.Item onClick={() => exportData('pdf')}>
                  Xuất PDF
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        
        {/* Summary Cards */}
        <Row className="g-4 mb-4">
          {[
            {
              title: 'Tổng lượt xem',
              value: summary.totalViews || 0,
              previous: prevSummary.totalViews || 0,
              icon: FaEye,
              color: colors.primary,
              format: 'number'
            },
            {
              title: 'Thời gian xem',
              value: summary.totalWatchTime || 0,
              previous: prevSummary.totalWatchTime || 0,
              icon: FaClock,
              color: colors.warning,
              format: 'duration'
            },
            {
              title: 'Lượt thích',
              value: summary.totalLikes || 0,
              previous: prevSummary.totalLikes || 0,
              icon: FaThumbsUp,
              color: colors.danger,
              format: 'number'
            },
            {
              title: 'Bình luận',
              value: summary.totalComments || 0,
              previous: prevSummary.totalComments || 0,
              icon: FaComment,
              color: colors.info,
              format: 'number'
            },
            {
              title: 'Người đăng ký mới',
              value: summary.subscribersGained || 0,
              previous: prevSummary.subscribersGained || 0,
              icon: FaUserPlus,
              color: colors.success,
              format: 'number'
            }
          ].map((metric, index) => {
            const change = calculateChange(metric.value, metric.previous);
            const isPositive = change >= 0;
            
            return (
              <Col key={index} xs={12} sm={6} lg={4} xl={2}>
                <Card 
                  className="analytics-card h-100"
                  style={{ 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border
                  }}
                >
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <metric.icon 
                        size={24} 
                        style={{ color: metric.color }}
                      />
                      <div className={`text-${isPositive ? 'success' : 'danger'} small`}>
                        {isPositive ? <FaTrendingUp /> : <FaTrendingDown />}
                        <span className="ms-1">
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="analytics-metric" style={{ color: theme.colors.text }}>
                      <div className="h4 mb-1">
                        {metric.format === 'duration' 
                          ? formatDuration(metric.value)
                          : formatNumber(metric.value)
                        }
                      </div>
                      <div 
                        className="analytics-metric-label small"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {metric.title}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
        
        {/* Main Chart */}
        <Row className="g-4 mb-4">
          <Col xs={12}>
            <Card style={{ 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0" style={{ color: theme.colors.text }}>
                  Xu hướng theo thời gian
                </h5>
                <Form.Select
                  size="sm"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  {metricOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: theme.colors.textSecondary, fontSize: 12 }}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke={metricOptions.find(m => m.value === selectedMetric)?.color}
                      fill={metricOptions.find(m => m.value === selectedMetric)?.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Secondary Charts and Tables */}
        <Row className="g-4">
          {/* Top Videos */}
          <Col xs={12} lg={8}>
            <Card style={{ 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}>
              <Card.Header>
                <h5 className="mb-0" style={{ color: theme.colors.text }}>
                  <FaVideo className="me-2" />
                  Top video có hiệu suất tốt nhất
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th style={{ color: theme.colors.text }}>Video</th>
                      <th style={{ color: theme.colors.text }}>Lượt xem</th>
                      <th style={{ color: theme.colors.text }}>Thích</th>
                      <th style={{ color: theme.colors.text }}>Bình luận</th>
                      <th style={{ color: theme.colors.text }}>Ngày đăng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVideos.slice(0, 10).map((video, index) => (
                      <tr key={video._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={index < 3 ? 'warning' : 'secondary'} 
                              className="me-2"
                            >
                              #{index + 1}
                            </Badge>
                            <div>
                              <div 
                                className="fw-medium"
                                style={{ 
                                  color: theme.colors.text,
                                  fontSize: '14px',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {video.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: theme.colors.text }}>
                          {formatNumber(video.stats?.views || 0)}
                        </td>
                        <td style={{ color: theme.colors.text }}>
                          {formatNumber(video.stats?.likes || 0)}
                        </td>
                        <td style={{ color: theme.colors.text }}>
                          {formatNumber(video.stats?.commentCount || 0)}
                        </td>
                        <td style={{ color: theme.colors.textSecondary }}>
                          {new Date(video.publishedAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Traffic Sources */}
          <Col xs={12} lg={4}>
            <Card style={{ 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}>
              <Card.Header>
                <h5 className="mb-0" style={{ color: theme.colors.text }}>
                  <FaGlobe className="me-2" />
                  Nguồn lưu lượng
                </h5>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={Object.values(colors)[index % Object.values(colors).length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;