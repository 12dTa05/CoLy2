// api.js - Client API Service
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// Cấu hình axios
const api = axios.create({
  baseURL: API_URL,
});

// Thêm interceptor để gửi token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const register = (username, email, password, displayName) => {
  return api.post('/register', { username, email, password, displayName });
};

export const login = (usernameOrEmail, password) => {
  return api.post('/login', { username: usernameOrEmail, password });
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Video API
export const uploadVideo = (formData, onUploadProgress) => {
  return api.post('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

export const getVideoStatus = (videoId) => {
  return api.get(`/videos/${videoId}/status`);
};

export const getMyVideos = (page = 1, limit = 10) => {
  return api.get(`/videos/my?page=${page}&limit=${limit}`);
};

export const getPublicVideos = (page = 1, limit = 10) => {
  return api.get(`/videos/public?page=${page}&limit=${limit}`);
};

export const getVideo = (videoId) => {
  return api.get(`/videos/${videoId}`);
};

export const searchVideos = (params) => {
  const { query, category, sort, duration, date, page, limit } = params;
  let url = '/search?';
  
  if (query) url += `q=${encodeURIComponent(query)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (sort) url += `sort=${sort}&`;
  if (duration) url += `duration=${duration}&`;
  if (date) url += `date=${date}&`;
  
  url += `page=${page || 1}&limit=${limit || 10}`;
  
  return api.get(url);
};

// Comment API
export const getVideoComments = (videoId, page = 1, limit = 10) => {
  return api.get(`/videos/${videoId}/comments?page=${page}&limit=${limit}`);
};

export const addComment = (videoId, content, parentId = null) => {
  return api.post(`/videos/${videoId}/comments`, { content, parentId });
};

// SUBSCRIPTION API
export const subscribeToChannel = (channelId) => {
  return api.post(`/channels/${channelId}/subscribe`);
};

export const unsubscribeFromChannel = (channelId) => {
  return api.delete(`/channels/${channelId}/unsubscribe`);
};

export const getSubscriptions = (page = 1, limit = 20) => {
  return api.get(`/subscriptions?page=${page}&limit=${limit}`);
};

export const getSubscriptionVideos = (page = 1, limit = 20) => {
  return api.get(`/subscriptions/videos?page=${page}&limit=${limit}`);
};

// WATCH HISTORY API
export const getWatchHistory = (page = 1, limit = 20) => {
  return api.get(`/history?page=${page}&limit=${limit}`);
};

export const clearWatchHistory = () => {
  return api.delete('/history');
};

// SAVED VIDEOS API
export const saveVideo = (videoId) => {
  return api.post(`/videos/${videoId}/save`);
};

export const unsaveVideo = (videoId) => {
  return api.delete(`/videos/${videoId}/unsave`);
};

export const getSavedVideos = (page = 1, limit = 20) => {
  return api.get(`/saved-videos?page=${page}&limit=${limit}`);
};

// WATCH LATER API
export const addToWatchLater = (videoId) => {
  return api.post(`/videos/${videoId}/watch-later`);
};

export const removeFromWatchLater = (videoId) => {
  return api.delete(`/videos/${videoId}/watch-later`);
};

export const getWatchLaterVideos = (page = 1, limit = 20) => {
  return api.get(`/watch-later?page=${page}&limit=${limit}`);
};

// LIKED VIDEOS API
export const likeVideo = (videoId) => {
  return api.post(`/videos/${videoId}/like`);
};

export const unlikeVideo = (videoId) => {
  return api.delete(`/videos/${videoId}/unlike`);
};

export const getLikedVideos = (page = 1, limit = 20) => {
  return api.get(`/liked-videos?page=${page}&limit=${limit}`);
};

// UTILITY FUNCTIONS
export const checkVideoStatus = async (videoId, userId) => {
  try {
    const [savedStatus, watchLaterStatus, likedStatus] = await Promise.all([
      api.get(`/videos/${videoId}/save-status`).catch(() => ({ data: { saved: false } })),
      api.get(`/videos/${videoId}/watch-later-status`).catch(() => ({ data: { inWatchLater: false } })),
      api.get(`/videos/${videoId}/like-status`).catch(() => ({ data: { liked: false } }))
    ]);
    
    return {
      saved: savedStatus.data.saved,
      inWatchLater: watchLaterStatus.data.inWatchLater,
      liked: likedStatus.data.liked
    };
  } catch (error) {
    return {
      saved: false,
      inWatchLater: false,
      liked: false
    };
  }
};

// CHANNEL API
export const getChannelInfo = (channelId) => {
  return api.get(`/channels/${channelId}`);
};

export const getChannelVideos = (channelId, page = 1, limit = 20) => {
  return api.get(`/channels/${channelId}/videos?page=${page}&limit=${limit}`);
};

// Helpers
export const getHLSUrl = (videoPath) => {
  return `http://localhost:8000/${videoPath}`;
};

export const getThumbnailUrl = (thumbnailPath) => {
  return `http://localhost:8000/${thumbnailPath}`;
};

export default api;