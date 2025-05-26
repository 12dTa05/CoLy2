// Enhanced Comment System với advanced features

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Button, Form, Dropdown, Modal, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaUser, 
  FaThumbsUp, 
  FaThumbsDown, 
  FaReply, 
  FaEllipsisV,
  FaHeart,
  FaSmile,
  FaSadTear,
  FaAngry,
  FaFlag,
  FaEdit,
  FaTrash,
  FaPin,
  FaSort,
  FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';

import AuthContext from '../context/AuthContext';
import { 
  addComment, 
  getVideoComments, 
  updateComment, 
  deleteComment,
  likeComment,
  unlikeComment,
  reportComment,
  pinComment,
  unpinComment
} from '../api';

// Enhanced Comment Item với reactions và moderation
const CommentItem = ({ 
  comment, 
  videoId, 
  onReplyAdded, 
  onCommentUpdate,
  onCommentDelete,
  level = 0,
  isVideoOwner = false 
}) => {
  const { currentUser } = useContext(AuthContext);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [commentStats, setCommentStats] = useState({
    likes: comment.likes || 0,
    dislikes: comment.dislikes || 0,
    reactions: comment.reactions || {}
  });

  // Reaction types
  const reactionTypes = [
    { type: 'like', icon: FaThumbsUp, label: 'Thích' },
    { type: 'love', icon: FaHeart, label: 'Yêu thích' },
    { type: 'laugh', icon: FaSmile, label: 'Haha' },
    { type: 'sad', icon: FaSadTear, label: 'Buồn' },
    { type: 'angry', icon: FaAngry, label: 'Tức giận' }
  ];

  // Check if user is comment owner
  const isCommentOwner = currentUser && currentUser.id === comment.userId;
  const canModerate = isVideoOwner || isCommentOwner;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle comment reactions
  const handleReaction = async (reactionType) => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để thể hiện cảm xúc');
      return;
    }

    try {
      if (userReaction === reactionType) {
        // Remove reaction
        await unlikeComment(comment._id);
        setUserReaction(null);
        setCommentStats(prev => ({
          ...prev,
          reactions: {
            ...prev.reactions,
            [reactionType]: Math.max(0, (prev.reactions[reactionType] || 0) - 1)
          }
        }));
      } else {
        // Add or change reaction
        await likeComment(comment._id, reactionType);
        
        // Update stats
        setCommentStats(prev => {
          const newReactions = { ...prev.reactions };
          
          // Remove old reaction count
          if (userReaction) {
            newReactions[userReaction] = Math.max(0, (newReactions[userReaction] || 0) - 1);
          }
          
          // Add new reaction count
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          
          return {
            ...prev,
            reactions: newReactions
          };
        });
        
        setUserReaction(reactionType);
      }
    } catch (err) {
      toast.error('Lỗi khi thể hiện cảm xúc');
    }
  };

  // Handle submit reply
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      const response = await addComment(videoId, replyContent, comment._id);
      
      setShowReplyForm(false);
      setReplyContent('');
      
      if (onReplyAdded) {
        onReplyAdded(response.data.comment);
      }
      
      toast.success('Đã trả lời bình luận');
    } catch (err) {
      toast.error('Lỗi khi trả lời bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit comment
  const handleEditComment = async (e) => {
    e.preventDefault();
    
    if (!editContent.trim() || editContent === comment.content) {
      setShowEditForm(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateComment(comment._id, editContent);
      
      if (onCommentUpdate) {
        onCommentUpdate(comment._id, editContent);
      }
      
      setShowEditForm(false);
      toast.success('Đã cập nhật bình luận');
    } catch (err) {
      toast.error('Lỗi khi cập nhật bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    
    try {
      await deleteComment(comment._id);
      
      if (onCommentDelete) {
        onCommentDelete(comment._id);
      }
      
      toast.success('Đã xóa bình luận');
    } catch (err) {
      toast.error('Lỗi khi xóa bình luận');
    }
  };

  // Handle pin comment
  const handlePinComment = async () => {
    try {
      if (comment.isPinned) {
        await unpinComment(comment._id);
        toast.success('Đã bỏ ghim bình luận');
      } else {
        await pinComment(comment._id);
        toast.success('Đã ghim bình luận');
      }
      
      if (onCommentUpdate) {
        onCommentUpdate(comment._id, comment.content, { isPinned: !comment.isPinned });
      }
    } catch (err) {
      toast.error('Lỗi khi ghim bình luận');
    }
  };

  // Handle report comment
  const handleReportComment = async (reason) => {
    try {
      await reportComment(comment._id, reason);
      setShowReportModal(false);
      toast.success('Đã báo cáo bình luận');
    } catch (err) {
      toast.error('Lỗi khi báo cáo bình luận');
    }
  };

  const maxLevel = 3; // Maximum nesting level
  const shouldShowReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`comment-item ${level > 0 ? 'comment-reply' : ''} ${comment.isPinned ? 'pinned-comment' : ''}`}>
      {comment.isPinned && (
        <div className="pinned-indicator">
          <FaPin className="me-1" />
          <small>Bình luận đã ghim</small>
        </div>
      )}
      
      <div className="d-flex">
        <div className="comment-avatar me-3">
          {comment.avatar ? (
            <img 
              src={comment.avatar} 
              alt={comment.displayName} 
              className="rounded-circle" 
              width={level > 0 ? "32" : "40"} 
              height={level > 0 ? "32" : "40"} 
            />
          ) : (
            <div 
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
              style={{ width: level > 0 ? '32px' : '40px', height: level > 0 ? '32px' : '40px' }}
            >
              <FaUser size={level > 0 ? 16 : 20} />
            </div>
          )}
        </div>
        
        <div className="comment-content flex-grow-1">
          {/* Comment Header */}
          <div className="comment-header d-flex align-items-center mb-1">
            <Link 
              to={`/channel/${comment.userId}`}
              className="comment-author fw-bold text-decoration-none text-reset me-2"
            >
              {comment.displayName}
              {comment.isVerified && (
                <span className="verified-badge ms-1">✓</span>
              )}
            </Link>
            
            <small className="comment-date text-secondary">
              {formatDate(comment.createdAt)}
              {comment.updatedAt !== comment.createdAt && (
                <span className="edited-indicator ms-1">(đã chỉnh sửa)</span>
              )}
            </small>
            
            {/* Comment Actions Menu */}
            <div className="comment-actions ms-auto">
              <Dropdown>
                <Dropdown.Toggle 
                  variant="link" 
                  size="sm" 
                  className="comment-menu-toggle p-1 text-muted"
                >
                  <FaEllipsisV size={12} />
                </Dropdown.Toggle>
                
                <Dropdown.Menu align="end">
                  {isCommentOwner && (
                    <>
                      <Dropdown.Item onClick={() => setShowEditForm(true)}>
                        <FaEdit className="me-2" />
                        Chỉnh sửa
                      </Dropdown.Item>
                      <Dropdown.Item onClick={handleDeleteComment} className="text-danger">
                        <FaTrash className="me-2" />
                        Xóa
                      </Dropdown.Item>
                    </>
                  )}
                  
                  {isVideoOwner && (
                    <Dropdown.Item onClick={handlePinComment}>
                      <FaPin className="me-2" />
                      {comment.isPinned ? 'Bỏ ghim' : 'Ghim bình luận'}
                    </Dropdown.Item>
                  )}
                  
                  {currentUser && !isCommentOwner && (
                    <Dropdown.Item onClick={() => setShowReportModal(true)}>
                      <FaFlag className="me-2" />
                      Báo cáo
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
          
          {/* Comment Text */}
          {showEditForm ? (
            <Form onSubmit={handleEditComment} className="mb-3">
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                />
              </Form.Group>
              <div className="d-flex justify-content-end">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => setShowEditForm(false)}
                >
                  Hủy
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </Form>
          ) : (
            <p className="comment-text mb-2">{comment.content}</p>
          )}
          
          {/* Reaction Bar */}
          <div className="comment-reactions d-flex align-items-center mb-2">
            {reactionTypes.map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant="link"
                size="sm"
                className={`reaction-button p-1 me-2 ${userReaction === type ? 'active' : ''}`}
                onClick={() => handleReaction(type)}
                title={label}
              >
                <Icon className="me-1" size={14} />
                {commentStats.reactions[type] || 0}
              </Button>
            ))}
            
            {currentUser && level < maxLevel && (
              <Button 
                variant="link" 
                size="sm" 
                className="reply-button p-1 ms-2 text-muted"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <FaReply className="me-1" size={12} />
                Trả lời
              </Button>
            )}
          </div>
          
          {/* Reply Form */}
          {showReplyForm && currentUser && (
            <Form onSubmit={handleSubmitReply} className="mb-3">
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder={`Trả lời @${comment.displayName}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  required
                />
              </Form.Group>
              <div className="d-flex justify-content-end">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => setShowReplyForm(false)}
                >
                  Hủy
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Trả lời'}
                </Button>
              </div>
            </Form>
          )}
          
          {/* Replies */}
          {shouldShowReplies && (
            <div className="comment-replies mt-3">
              {!showReplies ? (
                <Button 
                  variant="link" 
                  className="show-replies-button p-0 text-primary"
                  onClick={() => setShowReplies(true)}
                >
                  <FaReply className="me-1" size={12} />
                  Xem {comment.replies.length} phản hồi
                </Button>
              ) : (
                <>
                  <Button 
                    variant="link" 
                    className="hide-replies-button p-0 text-primary mb-3"
                    onClick={() => setShowReplies(false)}
                  >
                    Ẩn phản hồi
                  </Button>
                  
                  <div className="replies-container">
                    {comment.replies.map(reply => (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        videoId={videoId}
                        onReplyAdded={onReplyAdded}
                        onCommentUpdate={onCommentUpdate}
                        onCommentDelete={onCommentDelete}
                        level={level + 1}
                        isVideoOwner={isVideoOwner}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Report Modal */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Báo cáo bình luận</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Tại sao bạn muốn báo cáo bình luận này?</p>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-danger" 
              onClick={() => handleReportComment('spam')}
            >
              Spam hoặc gây hiểu lầm
            </Button>
            <Button 
              variant="outline-danger" 
              onClick={() => handleReportComment('harassment')}
            >
              Quấy rối hoặc bắt nạt
            </Button>
            <Button 
              variant="outline-danger" 
              onClick={() => handleReportComment('hate')}
            >
              Ngôn từ thù hận
            </Button>
            <Button 
              variant="outline-danger" 
              onClick={() => handleReportComment('inappropriate')}
            >
              Nội dung không phù hợp
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

// Enhanced Comments Section
export const EnhancedCommentsSection = ({ 
  videoId, 
  currentUser, 
  isVideoOwner = false,
  initialComments = [] 
}) => {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'popular'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'pinned', 'replies'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [videoId, sortBy, filterBy]);

  const loadComments = async (reset = true) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await getVideoComments(videoId, currentPage, 20, {
        sort: sortBy,
        filter: filterBy
      });
      
      const newComments = response.data.comments;
      
      if (reset) {
        setComments(newComments);
        setPage(2);
      } else {
        setComments(prev => [...prev, ...newComments]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(newComments.length === 20);
    } catch (err) {
      toast.error('Lỗi khi tải bình luận');
    } finally {
      setLoading(false);
    }
  };

  // Submit new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để bình luận');
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      const response = await addComment(videoId, newComment);
      
      setComments(prev => [response.data.comment, ...prev]);
      setNewComment('');
      toast.success('Đã thêm bình luận');
    } catch (err) {
      toast.error('Lỗi khi thêm bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment updates
  const handleCommentUpdate = (commentId, newContent, metadata = {}) => {
    setComments(prev => prev.map(comment => 
      comment._id === commentId 
        ? { ...comment, content: newContent, ...metadata }
        : comment
    ));
  };

  // Handle comment deletion
  const handleCommentDelete = (commentId) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
  };

  // Handle reply added
  const handleReplyAdded = (newReply) => {
    setComments(prev => prev.map(comment => 
      comment._id === newReply.parentId
        ? { 
            ...comment, 
            replies: [...(comment.replies || []), newReply] 
          }
        : comment
    ));
  };

  // Sort and filter comments
  const processedComments = useMemo(() => {
    let filtered = [...comments];
    
    // Apply filters
    switch (filterBy) {
      case 'pinned':
        filtered = filtered.filter(comment => comment.isPinned);
        break;
      case 'replies':
        filtered = filtered.filter(comment => comment.replies && comment.replies.length > 0);
        break;
      default:
        break;
    }
    
    return filtered;
  }, [comments, filterBy]);

  return (
    <div className="enhanced-comments-section">
      {/* Comments Header */}
      <div className="comments-header d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">
          Bình luận ({comments.length})
        </h5>
        
        <div className="comments-controls d-flex align-items-center">
          {/* Sort Options */}
          <Dropdown className="me-2">
            <Dropdown.Toggle 
              variant="outline-secondary" 
              size="sm"
              className="d-flex align-items-center"
            >
              <FaSort className="me-1" />
              Sắp xếp
            </Dropdown.Toggle>
            
            <Dropdown.Menu>
              <Dropdown.Item 
                active={sortBy === 'newest'}
                onClick={() => setSortBy('newest')}
              >
                Mới nhất
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'oldest'}
                onClick={() => setSortBy('oldest')}
              >
                Cũ nhất
              </Dropdown.Item>
              <Dropdown.Item 
                active={sortBy === 'popular'}
                onClick={() => setSortBy('popular')}
              >
                Phổ biến nhất
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          
          {/* Filter Options */}
          <Dropdown>
            <Dropdown.Toggle 
              variant="outline-secondary" 
              size="sm"
              className="d-flex align-items-center"
            >
              <FaFilter className="me-1" />
              Lọc
            </Dropdown.Toggle>
            
            <Dropdown.Menu>
              <Dropdown.Item 
                active={filterBy === 'all'}
                onClick={() => setFilterBy('all')}
              >
                Tất cả
              </Dropdown.Item>
              <Dropdown.Item 
                active={filterBy === 'pinned'}
                onClick={() => setFilterBy('pinned')}
              >
                Đã ghim
              </Dropdown.Item>
              <Dropdown.Item 
                active={filterBy === 'replies'}
                onClick={() => setFilterBy('replies')}
              >
                Có phản hồi
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
      
      {/* Add Comment Form */}
      {currentUser ? (
        <Form onSubmit={handleSubmitComment} className="mb-4">
          <div className="d-flex">
            <div className="comment-avatar me-3">
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.displayName} 
                  className="rounded-circle" 
                  width="40" 
                  height="40" 
                />
              ) : (
                <div 
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
                  style={{ width: '40px', height: '40px' }}
                >
                  <FaUser size={20} />
                </div>
              )}
            </div>
            
            <div className="flex-grow-1">
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Thêm bình luận công khai..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </Form.Group>
              
              <div className="d-flex justify-content-end">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => setNewComment('')}
                  disabled={!newComment.trim()}
                >
                  Hủy
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? 'Đang gửi...' : 'Bình luận'}
                </Button>
              </div>
            </div>
          </div>
        </Form>
      ) : (
        <Alert variant="info" className="mb-4">
          <div className="d-flex align-items-center justify-content-between">
            <span>Đăng nhập để thêm bình luận</span>
            <Button variant="primary" size="sm">
              Đăng nhập
            </Button>
          </div>
        </Alert>
      )}
      
      {/* Comments List */}
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : processedComments.length > 0 ? (
          <>
            {processedComments.map(comment => (
              <CommentItem
                key={comment._id}
                comment={comment}
                videoId={videoId}
                onReplyAdded={handleReplyAdded}
                onCommentUpdate={handleCommentUpdate}
                onCommentDelete={handleCommentDelete}
                isVideoOwner={isVideoOwner}
              />
            ))}
            
            {hasMore && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline-primary"
                  onClick={() => loadComments(false)}
                  disabled={loading}
                >
                  {loading ? 'Đang tải...' : 'Xem thêm bình luận'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted">
            <p>Chưa có bình luận nào.</p>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .comment-item {
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .comment-item.comment-reply {
          margin-left: 48px;
          border-left: 2px solid #f0f0f0;
          padding-left: 16px;
        }
        
        .comment-item.pinned-comment {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .pinned-indicator {
          color: #6c757d;
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .comment-menu-toggle {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .comment-item:hover .comment-menu-toggle {
          opacity: 1;
        }
        
        .reaction-button {
          color: #6c757d !important;
          transition: color 0.2s ease;
        }
        
        .reaction-button:hover {
          color: #007bff !important;
        }
        
        .reaction-button.active {
          color: #007bff !important;
          font-weight: bold;
        }
        
        .verified-badge {
          color: #007bff;
          font-weight: bold;
        }
        
        .edited-indicator {
          font-style: italic;
        }
        
        .replies-container {
          border-left: 2px solid #f0f0f0;
          margin-left: 16px;
          padding-left: 16px;
        }
      `}</style>
    </div>
  );
};

export default CommentItem;