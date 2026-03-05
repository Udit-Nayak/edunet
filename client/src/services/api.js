import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  googleAuth: (firebaseToken) => API.post('/auth/google', { firebaseToken }),
  getMe: () => API.get('/auth/me'),
  getUserById: (userId) => API.get(`/auth/user/${userId}`),
  logout: () => API.post('/auth/logout'),
  updateProfile: (data) => API.put('/auth/profile', data),
  updateUsername: (username) => API.put('/auth/username', { username }),
};

export const uploadAPI = {
  getSignedUrl: (bucket, fileName) =>
    API.post('/upload/signed-url', { bucket, fileName }),
  deleteFile: (bucket, filePath) =>
    API.delete('/upload/file', { data: { bucket, filePath } }),
  getMyFiles: (bucket) =>
    API.get(`/upload/my-files/${bucket}`),
};

export const postAPI = {
  createPost: (data) => API.post('/posts', data),
  getPosts: (params) => API.get('/posts', { params }),
  getPostById: (id, params) => API.get(`/posts/${id}`, { params }),
  updatePost: (id, data) => API.put(`/posts/${id}`, data),
  deletePost: (id) => API.delete(`/posts/${id}`),
  upvotePost: (id) => API.post(`/posts/${id}/upvote`),
  downvotePost: (id) => API.post(`/posts/${id}/downvote`),
  getPostsByTag: (tag, params) => API.get(`/posts/tag/${tag}`, { params }),
  getUserPosts: (userId, params) => API.get(`/posts/user/${userId}`, { params }),
  savePost: (id) => API.post(`/posts/${id}/save`),
  getSavedPosts: (params) => API.get('/posts/saved', { params }),
  checkPostSaved: (id) => API.get(`/posts/${id}/is-saved`),
  getMyDrafts: () => API.get('/posts/drafts/my-drafts'),
  getDraftById: (id) => API.get(`/posts/drafts/${id}`),
  cleanupOldDrafts: () => API.delete('/posts/drafts/cleanup'),
  getHybridFeed: (params) => API.get('/posts/hybrid-feed', { params }),
  getSimilarPosts: (id, params) => API.get(`/posts/${id}/similar`, { params }),
};

export const answerAPI = {
  createAnswer: (data) => API.post('/answers', data),
  getAnswersByPost: (postId, params) => API.get(`/answers/post/${postId}`, { params }),
  updateAnswer: (id, data) => API.put(`/answers/${id}`, data),
  deleteAnswer: (id) => API.delete(`/answers/${id}`),
  upvoteAnswer: (id) => API.post(`/answers/${id}/upvote`),
  downvoteAnswer: (id) => API.post(`/answers/${id}/downvote`),
  acceptAnswer: (id) => API.post(`/answers/${id}/accept`),
};

export const commentAPI = {
  createComment: (data) => API.post('/comments', data),
  getCommentsByPost: (postId, params) => API.get(`/comments/post/${postId}`, { params }),
  getCommentsByAnswer: (answerId, params) => API.get(`/comments/answer/${answerId}`, { params }),
  updateComment: (id, data) => API.put(`/comments/${id}`, data),
  deleteComment: (id) => API.delete(`/comments/${id}`),
  upvoteComment: (id) => API.post(`/comments/${id}/upvote`),
};

export const notificationAPI = {
  getNotifications: (params) => API.get('/notifications', { params }),
  getUnreadCount: () => API.get('/notifications/unread-count'),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put('/notifications/read-all'),
  deleteNotification: (id) => API.delete(`/notifications/${id}`),
};


export const searchAPI = {
  search: (params) => API.get('/search', { params }),
  getSuggestions: (query) => API.get('/search/suggestions', { params: { q: query } }),
  getTrending: () => API.get('/search/trending'),
  getPopularTags: (limit = 20) => API.get('/search/popular-tags', { params: { limit } }),
  trackSearch: (query) => API.post('/search/track', { query }),
};

// Phase 9: Continuous Learning API
export const learningAPI = {
  // Interaction tracking
  recordInteraction: (data) => API.post('/learning/interactions', data),
  recordBatchInteractions: (interactions) => API.post('/learning/interactions/batch', { interactions }),
  getUserEngagementMetrics: (days) => API.get('/learning/interactions/user/metrics', { params: { days } }),
  getPostPerformanceMetrics: (postId, days) => API.get(`/learning/interactions/post/${postId}/metrics`, { params: { days } }),
  
  // A/B testing
  getModelAssignment: () => API.get('/learning/ab-test/assignment'),
  getABTestStatus: () => API.get('/learning/ab-test/status'),
  
  // Training data stats (admin)
  getTrainingStats: (days) => API.get('/learning/training/stats', { params: { days } })
};


export default API;