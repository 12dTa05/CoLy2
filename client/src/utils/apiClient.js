// apiClient.js - Optimized API client with caching, retry logic, and performance monitoring
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ApiClient {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    // Create axios instance
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add timestamp for performance monitoring
        config.startTime = Date.now();
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Calculate response time
        const duration = Date.now() - response.config.startTime;
        console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} completed in ${duration}ms`);
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = localStorage.getItem('token');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        
        // Retry logic for network errors
        if (this.shouldRetry(error) && originalRequest._retryCount < this.retryAttempts) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          await this.delay(this.retryDelay * originalRequest._retryCount);
          return this.instance(originalRequest);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Check if request should be retried
  shouldRetry(error) {
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT'
    );
  }
  
  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Generate cache key
  getCacheKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${url}?${JSON.stringify(sortedParams)}`;
  }
  
  // Check cache validity
  isCacheValid(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  }
  
  // Get from cache
  getFromCache(cacheKey) {
    const cacheEntry = this.cache.get(cacheKey);
    if (cacheEntry && this.isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    return null;
  }
  
  // Set cache
  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  // Clear cache
  clearCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  // Deduplicate concurrent requests
  async deduplicateRequest(cacheKey, requestFn) {
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }
    
    const promise = requestFn();
    this.requestQueue.set(cacheKey, promise);
    
    try {
      const result = await promise;
      this.requestQueue.delete(cacheKey);
      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      throw error;
    }
  }
  
  // GET request with caching
  async get(url, params = {}, options = {}) {
    const { useCache = true, ...axiosOptions } = options;
    const cacheKey = this.getCacheKey(url, params);
    
    // Check cache first
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Deduplicate concurrent requests
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.instance.get(url, {
          params,
          ...axiosOptions
        });
        
        // Cache successful responses
        if (useCache && response.status === 200) {
          this.setCache(cacheKey, response.data);
        }
        
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    });
  }
  
  // POST request
  async post(url, data = {}, options = {}) {
    try {
      const response = await this.instance.post(url, data, options);
      
      // Clear related cache entries
      this.clearCache(url.split('/')[1]);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // PUT request
  async put(url, data = {}, options = {}) {
    try {
      const response = await this.instance.put(url, data, options);
      
      // Clear related cache entries
      this.clearCache(url.split('/')[1]);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // DELETE request
  async delete(url, options = {}) {
    try {
      const response = await this.instance.delete(url, options);
      
      // Clear related cache entries
      this.clearCache(url.split('/')[1]);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // Upload with progress
  async upload(url, formData, onUploadProgress) {
    try {
      const response = await this.instance.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress,
        timeout: 300000 // 5 minutes for uploads
      });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // Batch requests
  async batch(requests) {
    try {
      const promises = requests.map(({ method, url, data, params, options }) => {
        switch (method.toLowerCase()) {
          case 'get':
            return this.get(url, params, options);
          case 'post':
            return this.post(url, data, options);
          case 'put':
            return this.put(url, data, options);
          case 'delete':
            return this.delete(url, options);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      });
      
      return Promise.allSettled(promises);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // Error handling
  handleError(error) {
    const apiError = {
      message: 'Đã xảy ra lỗi không xác định',
      status: null,
      code: null,
      details: null
    };
    
    if (error.response) {
      // Server responded with error status
      apiError.status = error.response.status;
      apiError.message = error.response.data?.message || `Lỗi ${error.response.status}`;
      apiError.details = error.response.data;
      
      switch (error.response.status) {
        case 400:
          apiError.message = 'Dữ liệu không hợp lệ';
          break;
        case 401:
          apiError.message = 'Phiên đăng nhập đã hết hạn';
          break;
        case 403:
          apiError.message = 'Bạn không có quyền thực hiện hành động này';
          break;
        case 404:
          apiError.message = 'Không tìm thấy dữ liệu';
          break;
        case 429:
          apiError.message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
          break;
        case 500:
          apiError.message = 'Lỗi máy chủ. Vui lòng thử lại sau';
          break;
      }
    } else if (error.request) {
      // Network error
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng';
    } else {
      // Other error
      apiError.message = error.message || 'Đã xảy ra lỗi không xác định';
    }
    
    return apiError;
  }
  
  // Token refresh
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });
    
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return accessToken;
  }
  
  // Health check
  async healthCheck() {
    try {
      await this.instance.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Get cache statistics
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      entries: [],
      totalSize: 0
    };
    
    for (const [key, value] of this.cache.entries()) {
      const entrySize = JSON.stringify(value).length;
      stats.totalSize += entrySize;
      stats.entries.push({
        key,
        size: entrySize,
        age: Date.now() - value.timestamp,
        valid: this.isCacheValid(value)
      });
    }
    
    return stats;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export specific API functions
export const api = {
  // Auth
  register: (data) => apiClient.post('/register', data),
  login: (data) => apiClient.post('/login', data),
  logout: () => apiClient.post('/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),
  
  // Videos
  getVideos: (params) => apiClient.get('/videos/optimized', params),
  getVideo: (id) => apiClient.get(`/videos/${id}`),
  uploadVideo: (formData, onProgress) => apiClient.upload('/videos/upload', formData, onProgress),
  getMyVideos: (params) => apiClient.get('/videos/my', params),
  getVideoStatus: (id) => apiClient.get(`/videos/${id}/status`),
  getTrendingVideos: (params) => apiClient.get('/videos/trending', params),
  getRecommendations: (videoId, params) => apiClient.get(`/videos/${videoId}/recommendations`, params),
  
  // Search
  search: (params) => apiClient.get('/search', params),
  advancedSearch: (params) => apiClient.get('/search/advanced', params),
  getSearchSuggestions: (query) => apiClient.get('/search/suggestions', { q: query }),
  
  // Comments
  getComments: (videoId, params) => apiClient.get(`/videos/${videoId}/comments`, params),
  addComment: (videoId, data) => apiClient.post(`/videos/${videoId}/comments`, data),
  
  // User interactions
  likeVideo: (videoId) => apiClient.post(`/videos/${videoId}/like`),
  unlikeVideo: (videoId) => apiClient.delete(`/videos/${videoId}/unlike`),
  saveVideo: (videoId) => apiClient.post(`/videos/${videoId}/save`),
  unsaveVideo: (videoId) => apiClient.delete(`/videos/${videoId}/unsave`),
  addToWatchLater: (videoId) => apiClient.post(`/videos/${videoId}/watch-later`),
  removeFromWatchLater: (videoId) => apiClient.delete(`/videos/${videoId}/watch-later`),
  
  // Subscriptions
  subscribe: (channelId) => apiClient.post(`/channels/${channelId}/subscribe`),
  unsubscribe: (channelId) => apiClient.delete(`/channels/${channelId}/unsubscribe`),
  getSubscriptions: (params) => apiClient.get('/subscriptions', params),
  getSubscriptionVideos: (params) => apiClient.get('/subscriptions/videos', params),
  
  // Playlists
  getPlaylists: (userId, params) => apiClient.get(`/users/${userId}/playlists`, params),
  getPlaylist: (id) => apiClient.get(`/playlists/${id}`),
  createPlaylist: (data) => apiClient.post('/playlists', data),
  updatePlaylist: (id, data) => apiClient.put(`/playlists/${id}`, data),
  deletePlaylist: (id) => apiClient.delete(`/playlists/${id}`),
  addVideoToPlaylist: (playlistId, videoId) => apiClient.post(`/playlists/${playlistId}/videos`, { videoId }),
  removeVideoFromPlaylist: (playlistId, videoId) => apiClient.delete(`/playlists/${playlistId}/videos/${videoId}`),
  
  // Channels
  getChannel: (id) => apiClient.get(`/channels/${id}`),
  getChannelVideos: (id, params) => apiClient.get(`/channels/${id}/videos`, params),
  
  // History and saved content
  getWatchHistory: (params) => apiClient.get('/history', params),
  clearWatchHistory: () => apiClient.delete('/history'),
  getSavedVideos: (params) => apiClient.get('/saved-videos', params),
  getWatchLaterVideos: (params) => apiClient.get('/watch-later', params),
  getLikedVideos: (params) => apiClient.get('/liked-videos', params),
  
  // Notifications
  getNotifications: (params) => apiClient.get('/notifications', params),
  markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => apiClient.put('/notifications/read-all'),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  clearAllNotifications: () => apiClient.delete('/notifications/clear'),
  getNotificationSettings: () => apiClient.get('/notifications/settings'),
  updateNotificationSettings: (settings) => apiClient.put('/notifications/settings', settings),
  
  // Analytics
  getAnalytics: (params) => apiClient.get('/analytics/dashboard', params),
  getChartData: (params) => apiClient.get('/analytics/chart', params),
  exportAnalytics: (params) => apiClient.get('/analytics/export', params),
  
  // Utility
  healthCheck: () => apiClient.healthCheck(),
  clearCache: (pattern) => apiClient.clearCache(pattern),
  getCacheStats: () => apiClient.getCacheStats()
};

export default apiClient;