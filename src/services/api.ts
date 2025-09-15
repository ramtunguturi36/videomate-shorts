import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://videomate-shorts-api.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(res => res.data),
  
  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }).then(res => res.data),
  
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then(res => res.data),
  
  getCurrentUser: () =>
    api.get('/auth/me').then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data),
  
  googleAuth: () =>
    window.location.href = `${API_BASE_URL}/auth/google`,
};

// User API
export const userAPI = {
  getProfile: () =>
    api.get('/user/profile').then(res => res.data),
  
  updateProfile: (data: { name?: string; email?: string }) =>
    api.put('/user/profile', data).then(res => res.data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/user/change-password', { currentPassword, newPassword }).then(res => res.data),
  
  getPurchases: () =>
    api.get('/user/purchases').then(res => res.data),
  
  addPurchase: (productId: string, productName: string, amount: number) =>
    api.post('/user/purchases', { productId, productName, amount }).then(res => res.data),
  
  getSubscription: () =>
    api.get('/user/subscription').then(res => res.data),
  
  updateSubscription: (plan?: string, isActive?: boolean) =>
    api.put('/user/subscription', { plan, isActive }).then(res => res.data),
};

// Admin API
export const adminAPI = {
  // User Management
  getUsers: (page = 1, limit = 10) =>
    api.get(`/admin/users?page=${page}&limit=${limit}`).then(res => res.data),
  
  getUser: (id: string) =>
    api.get(`/admin/users/${id}`).then(res => res.data),
  
  updateUser: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data).then(res => res.data),
  
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then(res => res.data),
  
  // Dashboard
  getDashboardStats: () =>
    api.get('/admin/dashboard/stats').then(res => res.data),
  
  getDashboardData: (params: any) =>
    api.get('/admin/analytics/dashboard', { params }).then(res => res.data),
  
  getRealTimeStats: () =>
    api.get('/admin/analytics/realtime').then(res => res.data),
  
  // Purchases
  getPurchases: (page = 1, limit = 20) =>
    api.get(`/admin/purchases?page=${page}&limit=${limit}`).then(res => res.data),
  
  // Content Management
  getContent: (type: string, params: any) =>
    api.get(`/admin/content/${type}`, { params }).then(res => res.data),
  
  getContentDetails: (type: string, id: string) =>
    api.get(`/admin/content/${type}/${id}`).then(res => res.data),
  
  updateContent: (type: string, id: string, data: any) =>
    api.put(`/admin/content/${type}/${id}`, data).then(res => res.data),
  
  deleteContent: (type: string, id: string) =>
    api.delete(`/admin/content/${type}/${id}`).then(res => res.data),
  
  uploadContent: (type: string, data: any) =>
    api.post(`/admin/content/${type}/upload`, data).then(res => res.data),
  
  // Folder Management
  getFolders: () =>
    api.get('/admin/content/folders').then(res => res.data),
  
  createFolder: (data: any) =>
    api.post('/admin/content/folders', data).then(res => res.data),
  
  moveContent: (data: any) =>
    api.put('/admin/content/folders/move', data).then(res => res.data),
  
  deleteFolder: (folderName: string) =>
    api.delete(`/admin/content/folders/${folderName}`).then(res => res.data),
  
  // Analytics
  getRevenueAnalytics: (params: any) =>
    api.get('/admin/analytics/revenue', { params }).then(res => res.data),
  
  getContentAnalytics: (params: any) =>
    api.get('/admin/analytics/content', { params }).then(res => res.data),
  
  getUserAnalytics: (params: any) =>
    api.get('/admin/analytics/users', { params }).then(res => res.data),
  
  getSupportAnalytics: (params: any) =>
    api.get('/admin/analytics/support', { params }).then(res => res.data),
  
  getFolderAnalytics: () =>
    api.get('/admin/analytics/folders').then(res => res.data),
  
  getPerformanceMetrics: (params: any) =>
    api.get('/admin/analytics/performance', { params }).then(res => res.data),
  
  exportAnalytics: (data: any) =>
    api.post('/admin/analytics/export', data).then(res => res.data),
  
  // Transaction Monitoring
  getTransactionMonitoring: (params: any) =>
    api.get('/admin/transactions/monitoring', { params }).then(res => res.data),
  
  getTransactionDetails: (transactionId: string) =>
    api.get(`/admin/transactions/${transactionId}`).then(res => res.data),
  
  updateTransactionStatus: (transactionId: string, data: any) =>
    api.put(`/admin/transactions/${transactionId}/status`, data).then(res => res.data),
  
  refundTransaction: (transactionId: string, data: any) =>
    api.post(`/admin/transactions/${transactionId}/refund`, data).then(res => res.data),
  
  getTransactionStats: (params: any) =>
    api.get('/admin/transactions/stats/overview', { params }).then(res => res.data),
  
  getUserTransactionHistory: (userId: string, params: any) =>
    api.get(`/admin/transactions/user/${userId}`, { params }).then(res => res.data),
  
  exportTransactions: (data: any) =>
    api.post('/admin/transactions/export', data).then(res => res.data),
  
  // Subscription Plans Management
  getSubscriptionPlans: (params?: any) =>
    api.get('/admin/subscription-plans', { params }).then(res => res.data),
  
  getSubscriptionPlan: (id: string) =>
    api.get(`/admin/subscription-plans/${id}`).then(res => res.data),
  
  createSubscriptionPlan: (data: any) =>
    api.post('/admin/subscription-plans', data).then(res => res.data),
  
  updateSubscriptionPlan: (id: string, data: any) =>
    api.put(`/admin/subscription-plans/${id}`, data).then(res => res.data),
  
  deleteSubscriptionPlan: (id: string) =>
    api.delete(`/admin/subscription-plans/${id}`).then(res => res.data),
  
  initializeDefaultPlans: () =>
    api.post('/admin/subscription-plans/initialize-defaults').then(res => res.data),
  
  getPlanStats: () =>
    api.get('/admin/subscription-plans/stats/overview').then(res => res.data),
};

// Files API
export const filesAPI = {
  // Folder management
  createFolder: (data: any) =>
    api.post('/files/folders', data).then(res => res.data),
  
  getFolderTree: () =>
    api.get('/files/folders/tree').then(res => res.data),
  
  getFolderContents: (path: string) =>
    api.get(`/files/folders/${path}`).then(res => res.data),
  
  deleteFolder: (path: string) =>
    api.delete(`/files/folders/${path}`).then(res => res.data),
  
  // File management
  uploadFiles: (formData: FormData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  getFiles: (params: any) =>
    api.get('/files/files', { params }).then(res => res.data),
  
  searchFiles: (params: any) =>
    api.get('/files/files/search', { params }).then(res => res.data),
  
  getFileDetails: (id: string) =>
    api.get(`/files/files/${id}`).then(res => res.data),
  
  deleteFile: (id: string) =>
    api.delete(`/files/files/${id}`).then(res => res.data),
};

// Feed API
export const feedAPI = {
  getVideos: (params: any) =>
    api.get('/feed/videos', { params }).then(res => res.data),
  
  getVideo: (id: string) =>
    api.get(`/feed/video/${id}`).then(res => res.data),
  
  createPurchaseOrder: (imageId: string) =>
    api.post('/payments/create-order', { imageId }).then(res => res.data),
  
  verifyPayment: (orderId: string, paymentId: string, signature: string, purchaseId: string) =>
    api.post('/payments/verify-payment', { orderId, paymentId, signature, purchaseId }).then(res => res.data),
  
  getPurchases: (page = 1, limit = 20) =>
    api.get(`/feed/purchases?page=${page}&limit=${limit}`).then(res => res.data),
  
  checkPurchase: (fileId: string) =>
    api.get(`/feed/purchase/check/${fileId}`).then(res => res.data),
};

// Payment API
export const paymentAPI = {
  createOrder: (imageId: string) =>
    api.post('/payments/create-order', { imageId }).then(res => res.data),
  
  verifyPayment: (orderId: string, paymentId: string, signature: string, purchaseId: string) =>
    api.post('/payments/verify-payment', { orderId, paymentId, signature, purchaseId }).then(res => res.data),
  
  getImageAccess: (imageId: string) =>
    api.get(`/payments/access-image/${imageId}`).then(res => res.data),
  
  getPurchaseStatus: (imageId: string) =>
    api.get(`/payments/purchase-status/${imageId}`).then(res => res.data),
  
  getPurchaseHistory: (page = 1, limit = 20, status?: string) =>
    api.get(`/payments/purchase-history?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`).then(res => res.data),
  
  getSubscriptionPlans: () =>
    api.get('/payments/subscription-plans').then(res => res.data),
  
  createSubscription: (planId: string) =>
    api.post('/payments/create-subscription', { planId }).then(res => res.data),
  
  cancelSubscription: () =>
    api.post('/payments/cancel-subscription').then(res => res.data),
  
  getAccessSummary: () =>
    api.get('/payments/access-summary').then(res => res.data),
};

// Issues API
export const issuesAPI = {
  createIssue: (data: any) =>
    api.post('/issues/create', data).then(res => res.data),
  
  getUserIssues: (params: any) =>
    api.get('/issues/my-issues', { params }).then(res => res.data),
  
  getIssueDetails: (issueId: string) =>
    api.get(`/issues/${issueId}`).then(res => res.data),
  
  addNote: (issueId: string, content: string) =>
    api.post(`/issues/${issueId}/notes`, { content }).then(res => res.data),
  
  // Admin endpoints
  getAllIssues: (params: any) =>
    api.get('/issues/admin/all', { params }).then(res => res.data),
  
  getIssueStats: (params: any) =>
    api.get('/issues/admin/stats', { params }).then(res => res.data),
  
  getAdminIssueDetails: (issueId: string) =>
    api.get(`/issues/admin/${issueId}`).then(res => res.data),
  
  updateIssueStatus: (issueId: string, data: any) =>
    api.put(`/issues/admin/${issueId}/status`, data).then(res => res.data),
  
  assignIssue: (issueId: string, data: any) =>
    api.put(`/issues/admin/${issueId}/assign`, data).then(res => res.data),
  
  addInternalNote: (issueId: string, data: any) =>
    api.post(`/issues/admin/${issueId}/notes`, data).then(res => res.data),
  
  resolveIssue: (issueId: string, data: any) =>
    api.put(`/issues/admin/${issueId}/resolve`, data).then(res => res.data),
  
  reopenIssue: (issueId: string, data: any) =>
    api.put(`/issues/admin/${issueId}/reopen`, data).then(res => res.data),
};

// Contact API
export const contactAPI = {
  submit: (data: any) =>
    api.post('/contact/submit', data).then(res => res.data),
  
  submitAuthenticated: (data: any) =>
    api.post('/contact/submit-authenticated', data).then(res => res.data),
  
  getUserMessages: (params: any) =>
    api.get('/contact/my-messages', { params }).then(res => res.data),
  
  getMessageDetails: (messageId: string) =>
    api.get(`/contact/${messageId}`).then(res => res.data),
  
  // Admin endpoints
  getAllMessages: (params: any) =>
    api.get('/contact/admin/all', { params }).then(res => res.data),
  
  getMessageStats: (params: any) =>
    api.get('/contact/admin/stats', { params }).then(res => res.data),
  
  getAdminMessageDetails: (messageId: string) =>
    api.get(`/contact/admin/${messageId}`).then(res => res.data),
  
  updateMessageStatus: (messageId: string, data: any) =>
    api.put(`/contact/admin/${messageId}/status`, data).then(res => res.data),
  
  respondToMessage: (messageId: string, data: any) =>
    api.put(`/contact/admin/${messageId}/respond`, data).then(res => res.data),
  
  addInternalNote: (messageId: string, data: any) =>
    api.post(`/contact/admin/${messageId}/notes`, data).then(res => res.data),
  
  setFollowUp: (messageId: string, data: any) =>
    api.put(`/contact/admin/${messageId}/follow-up`, data).then(res => res.data),
  
  resolveMessage: (messageId: string) =>
    api.put(`/contact/admin/${messageId}/resolve`).then(res => res.data),
  
  closeMessage: (messageId: string, data: any) =>
    api.put(`/contact/admin/${messageId}/close`, data).then(res => res.data),
  
  reopenMessage: (messageId: string, data: any) =>
    api.put(`/contact/admin/${messageId}/reopen`, data).then(res => res.data),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (params: any) =>
    api.get('/notifications', { params }).then(res => res.data),
  
  getNotificationCounts: () =>
    api.get('/notifications/counts').then(res => res.data),
  
  markAsRead: (notificationIds: string[]) =>
    api.put('/notifications/mark-read', { notificationIds }).then(res => res.data),
  
  markAllAsRead: () =>
    api.put('/notifications/mark-all-read').then(res => res.data),
  
  archiveNotifications: (notificationIds: string[]) =>
    api.put('/notifications/archive', { notificationIds }).then(res => res.data),
  
  getNotificationDetails: (notificationId: string) =>
    api.get(`/notifications/${notificationId}`).then(res => res.data),
  
  deleteNotification: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`).then(res => res.data),
};


export default api;
