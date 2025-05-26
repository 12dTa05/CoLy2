// CommentItem.js
import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUser, FaThumbsUp, FaThumbsDown, FaReply } from 'react-icons/fa';
import { useContext } from 'react';

import AuthContext from '../context/AuthContext';
import { addComment } from '../api';

const CommentItem = ({ comment, videoId, onReplyAdded }) => {
 const { currentUser } = useContext(AuthContext);
 const [showReplyForm, setShowReplyForm] = useState(false);
 const [replyContent, setReplyContent] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [showReplies, setShowReplies] = useState(false);

 // Định dạng thời gian
 const formatDate = (dateString) => {
   const date = new Date(dateString);
   return date.toLocaleDateString('vi-VN', {
     year: 'numeric',
     month: 'short',
     day: 'numeric'
   });
 };

 // Xử lý gửi trả lời
 const handleSubmitReply = async (e) => {
   e.preventDefault();
   
   if (!replyContent.trim()) return;
   
   try {
     setIsSubmitting(true);
     const response = await addComment(videoId, replyContent, comment._id);
     
     // Đóng form và xóa nội dung
     setShowReplyForm(false);
     setReplyContent('');
     
     // Cập nhật danh sách trả lời trong parent component
     if (onReplyAdded) {
       onReplyAdded(response.data.comment);
     }
   } catch (err) {
     console.error('Reply error:', err);
   } finally {
     setIsSubmitting(false);
   }
 };

 return (
   <div className="mb-4">
     <div className="d-flex">
       <div className="me-3">
         {comment.avatar ? (
           <img 
             src={comment.avatar} 
             alt={comment.displayName} 
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
         <div className="d-flex align-items-center mb-1">
           <Link 
             to={`/user/${comment.userId}`}
             className="fw-bold text-decoration-none text-reset me-2"
           >
             {comment.displayName}
           </Link>
           <small className="text-secondary">
             {formatDate(comment.createdAt)}
           </small>
         </div>
         
         <p className="mb-2">{comment.content}</p>
         
         <div className="d-flex align-items-center mb-2">
           <Button variant="link" size="sm" className="p-0 me-3 text-secondary">
             <FaThumbsUp className="me-1" />
             {comment.likes}
           </Button>
           <Button variant="link" size="sm" className="p-0 me-3 text-secondary">
             <FaThumbsDown className="me-1" />
             {comment.dislikes}
           </Button>
           
           {currentUser && (
             <Button 
               variant="link" 
               size="sm" 
               className="p-0 text-secondary"
               onClick={() => setShowReplyForm(!showReplyForm)}
             >
               <FaReply className="me-1" />
               Trả lời
             </Button>
           )}
         </div>
         
         {/* Form trả lời bình luận */}
         {showReplyForm && currentUser && (
           <Form onSubmit={handleSubmitReply} className="mb-3">
             <Form.Group className="mb-2">
               <Form.Control
                 as="textarea"
                 rows={2}
                 placeholder="Viết phản hồi..."
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
         
         {/* Hiển thị các câu trả lời */}
         {comment.replies && comment.replies.length > 0 && (
           <div className="mt-3">
             {!showReplies ? (
               <Button 
                 variant="link" 
                 className="p-0 text-primary"
                 onClick={() => setShowReplies(true)}
               >
                 Xem {comment.replies.length} trả lời
               </Button>
             ) : (
               <>
                 <Button 
                   variant="link" 
                   className="p-0 text-primary mb-3"
                   onClick={() => setShowReplies(false)}
                 >
                   Ẩn trả lời
                 </Button>
                 <div className="ms-4 border-start ps-3">
                   {comment.replies.map(reply => (
                     <div key={reply._id} className="mb-3">
                       <div className="d-flex">
                         <div className="me-2">
                           {reply.avatar ? (
                             <img 
                               src={reply.avatar} 
                               alt={reply.displayName} 
                               className="rounded-circle" 
                               width="32" 
                               height="32" 
                             />
                           ) : (
                             <div 
                               className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" 
                               style={{ width: '32px', height: '32px' }}
                             >
                               <FaUser size={16} />
                             </div>
                           )}
                         </div>
                         <div>
                           <div className="d-flex align-items-center mb-1">
                             <Link 
                               to={`/user/${reply.userId}`}
                               className="fw-bold text-decoration-none text-reset me-2"
                             >
                               {reply.displayName}
                             </Link>
                             <small className="text-secondary">
                               {formatDate(reply.createdAt)}
                             </small>
                           </div>
                           <p className="mb-1">{reply.content}</p>
                           <div>
                             <Button variant="link" size="sm" className="p-0 me-2 text-secondary">
                               <FaThumbsUp className="me-1" />
                               {reply.likes}
                             </Button>
                             <Button variant="link" size="sm" className="p-0 text-secondary">
                               <FaThumbsDown className="me-1" />
                               {reply.dislikes}
                             </Button>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </>
             )}
           </div>
         )}
       </div>
     </div>
   </div>
 );
};

export default CommentItem;