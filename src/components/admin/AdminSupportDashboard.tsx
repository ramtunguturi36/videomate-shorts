import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Filter,
  Search,
  RefreshCw,
  User,
  Calendar,
  TrendingUp,
  Users,
  MessageCircle,
  Settings,
  Send,
  Archive,
  Edit,
  MoreVertical
} from 'lucide-react';
import { issuesAPI, contactAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface AdminSupportDashboardProps {
  // Add any props needed for admin authentication
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
  userId: any;
  assignedTo?: any;
  resolvedBy?: any;
  resolvedAt?: string;
  resolution?: string;
  notes: any[];
  auditLog: any[];
  createdAt: string;
  updatedAt: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
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
  respondedBy?: any;
  respondedAt?: string;
  isPublic: boolean;
  followUpRequired: boolean;
  followUpDate?: string;
  userId?: any;
  phone?: string;
  company?: string;
  preferredContactMethod: string;
  source: string;
  internalNotes: any[];
  auditLog: any[];
  createdAt: string;
  updatedAt: string;
}

const AdminSupportDashboard: React.FC<AdminSupportDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState<'issues' | 'messages' | 'stats'>('issues');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [stats, setStats] = useState({
    issues: {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
      payment: 0,
      technical: 0
    },
    messages: {
      total: 0,
      new: 0,
      read: 0,
      inProgress: 0,
      responded: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
      support: 0,
      feedback: 0,
      bugReport: 0,
      followUpRequired: 0
    }
  });

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'issues':
          const issuesResponse = await issuesAPI.getAllIssues({
            page: 1,
            limit: 100,
            ...filters
          });
          setIssues(issuesResponse.issues);
          break;
        case 'messages':
          const messagesResponse = await contactAPI.getAllMessages({
            page: 1,
            limit: 100,
            ...filters
          });
          setContactMessages(messagesResponse.messages);
          break;
        case 'stats':
          const [issuesStats, messagesStats] = await Promise.all([
            issuesAPI.getIssueStats(filters),
            contactAPI.getMessageStats(filters)
          ]);
          setStats({
            issues: issuesStats.stats,
            messages: messagesStats.stats
          });
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

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const currentItems = activeTab === 'issues' ? issues : contactMessages;
    setSelectedItems(
      selectedItems.length === currentItems.length 
        ? [] 
        : currentItems.map(item => item.id)
    );
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

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    try {
      await issuesAPI.updateIssueStatus(issueId, { status: newStatus });
      toast.success('Issue status updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast.error('Failed to update issue status');
    }
  };

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    try {
      await contactAPI.updateMessageStatus(messageId, { status: newStatus });
      toast.success('Message status updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating message status:', error);
      toast.error('Failed to update message status');
    }
  };

  const respondToMessage = async (messageId: string, response: string) => {
    try {
      await contactAPI.respondToMessage(messageId, { response });
      toast.success('Response sent successfully');
      loadData();
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Support Management</h1>
          <p className="text-gray-600">Manage issues, contact messages, and support statistics</p>
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
          {stats.issues.open > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {stats.issues.open}
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
          {stats.messages.new > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {stats.messages.new}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'stats'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Statistics</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="payment">Payment</option>
            <option value="technical">Technical</option>
            <option value="account">Account</option>
            <option value="content">Content</option>
            <option value="billing">Billing</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="To Date"
          />
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === issues.length && issues.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {issues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(issue.id)}
                            onChange={() => handleSelectItem(issue.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                            <div className="text-sm text-gray-500">{issue.category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {issue.userId?.name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {issue.userId?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                            {issue.formattedStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                            {issue.formattedPriority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {issue.assignedTo?.name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {issue.timeSinceCreation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === contactMessages.length && contactMessages.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contactMessages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(message.id)}
                            onChange={() => handleSelectItem(message.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{message.name}</div>
                            <div className="text-sm text-gray-500">{message.email}</div>
                            {message.phone && (
                              <div className="text-sm text-gray-500">{message.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{message.subject}</div>
                            <div className="text-sm text-gray-500">{message.category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                            {message.formattedStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(message.priority)}`}>
                            {message.formattedPriority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {message.responseTime || 'No response yet'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.timeSinceCreation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Send className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issues Statistics */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.issues.total}</div>
                        <div className="text-sm text-gray-600">Total Issues</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.issues.urgent}</div>
                        <div className="text-sm text-gray-600">Urgent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.issues.high}</div>
                        <div className="text-sm text-gray-600">High Priority</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.issues.resolved}</div>
                        <div className="text-sm text-gray-600">Resolved</div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Statistics */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.messages.total}</div>
                        <div className="text-sm text-gray-600">Total Messages</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.messages.urgent}</div>
                        <div className="text-sm text-gray-600">Urgent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.messages.high}</div>
                        <div className="text-sm text-gray-600">High Priority</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.messages.responded}</div>
                        <div className="text-sm text-gray-600">Responded</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSupportDashboard;
