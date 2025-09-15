import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Plus,
  Filter,
  Search,
  RefreshCw,
  Bell,
  BellOff
} from 'lucide-react';
import { issuesAPI, contactAPI, notificationAPI } from '../../services/api';
import IssueReportForm from './IssueReportForm';
import ContactForm from './ContactForm';
import toast from 'react-hot-toast';

interface SupportDashboardProps {
  isAuthenticated: boolean;
  userInfo?: {
    name: string;
    email: string;
  };
}

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  formattedStatus: string;
  formattedPriority: string;
  timeSinceCreation: string;
  transactionId?: string;
  amount?: number;
  assignedTo?: any;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  formattedStatus: string;
  formattedPriority: string;
  timeSinceCreation: string;
  responseTime?: string;
  response?: string;
  respondedAt?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  formattedType: string;
  status: string;
  isImportant: boolean;
  actionUrl?: string;
  actionText?: string;
  timeSinceCreation: string;
  readAt?: string;
  createdAt: string;
}

const SupportDashboard: React.FC<SupportDashboardProps> = ({
  isAuthenticated,
  userInfo
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'messages' | 'notifications'>('issues');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: ''
  });

  // Load data based on active tab
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [activeTab, filters, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'issues':
          const issuesResponse = await issuesAPI.getUserIssues({
            page: 1,
            limit: 50,
            ...filters
          });
          setIssues(issuesResponse.issues);
          break;
        case 'messages':
          const messagesResponse = await contactAPI.getUserMessages({
            page: 1,
            limit: 50,
            ...filters
          });
          setContactMessages(messagesResponse.messages);
          break;
        case 'notifications':
          const notificationsResponse = await notificationAPI.getNotifications({
            page: 1,
            limit: 50
          });
          setNotifications(notificationsResponse.notifications);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'new':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
      case 'read':
        return 'text-yellow-600 bg-yellow-100';
      case 'resolved':
      case 'responded':
        return 'text-green-600 bg-green-100';
      case 'closed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-blue-600 bg-blue-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead([notificationId]);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read', readAt: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          status: 'read', 
          readAt: new Date().toISOString() 
        }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Support Center</h2>
          <p className="text-gray-600 mb-6">
            Please log in to access your support tickets and contact history.
          </p>
          <button className="btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Support Center</h1>
          <p className="text-gray-600">Manage your issues, messages, and notifications</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'issues'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Issues</span>
          {issues.filter(issue => issue.status === 'open' || issue.status === 'in_progress').length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {issues.filter(issue => issue.status === 'open' || issue.status === 'in_progress').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'messages'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
          {contactMessages.filter(msg => msg.status === 'new' || msg.status === 'read').length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {contactMessages.filter(msg => msg.status === 'new' || msg.status === 'read').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'notifications'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          {notifications.filter(notif => notif.status === 'unread').length > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
              {notifications.filter(notif => notif.status === 'unread').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'notifications' && notifications.filter(n => n.status === 'unread').length > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BellOff className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
          {activeTab === 'issues' && (
            <button
              onClick={() => setShowIssueForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          )}
          <button
            onClick={() => setShowContactForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Contact Us</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {/* Issues Tab */}
            {activeTab === 'issues' && (
              <div className="divide-y divide-gray-200">
                {issues.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
                    <p className="text-gray-600 mb-4">You haven't reported any issues yet.</p>
                    <button
                      onClick={() => setShowIssueForm(true)}
                      className="btn-primary"
                    >
                      Report an Issue
                    </button>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div key={issue.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{issue.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                              {issue.formattedStatus}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                              {issue.formattedPriority}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Category: {issue.category}</span>
                            <span>•</span>
                            <span>{issue.timeSinceCreation}</span>
                            {issue.amount && (
                              <>
                                <span>•</span>
                                <span>Amount: ₹{issue.amount}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="divide-y divide-gray-200">
                {contactMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                    <p className="text-gray-600 mb-4">You haven't sent any messages yet.</p>
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="btn-primary"
                    >
                      Contact Us
                    </button>
                  </div>
                ) : (
                  contactMessages.map((message) => (
                    <div key={message.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{message.subject}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                              {message.formattedStatus}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(message.priority)}`}>
                              {message.formattedPriority}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3 line-clamp-2">{message.message}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Category: {message.category}</span>
                            <span>•</span>
                            <span>{message.timeSinceCreation}</span>
                            {message.responseTime && (
                              <>
                                <span>•</span>
                                <span>Response time: {message.responseTime}</span>
                              </>
                            )}
                          </div>
                          {message.response && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <h4 className="text-sm font-medium text-green-900 mb-1">Response:</h4>
                              <p className="text-sm text-green-800">{message.response}</p>
                            </div>
                          )}
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="divide-y divide-gray-200">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                    <p className="text-gray-600">You don't have any notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                        notification.status === 'unread' ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (notification.status === 'unread') {
                          markNotificationAsRead(notification.id);
                        }
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          notification.isImportant ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <Bell className={`w-4 h-4 ${
                            notification.isImportant ? 'text-red-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                            {notification.status === 'unread' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {notification.isImportant && (
                              <span className="px-2 py-0.5 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                                Important
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{notification.formattedType}</span>
                            <span>•</span>
                            <span>{notification.timeSinceCreation}</span>
                            {notification.actionText && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 hover:text-blue-800">
                                  {notification.actionText} →
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <IssueReportForm
        isOpen={showIssueForm}
        onClose={() => setShowIssueForm(false)}
        onSuccess={loadData}
      />

      <ContactForm
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        onSuccess={loadData}
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
      />
    </div>
  );
};

export default SupportDashboard;
