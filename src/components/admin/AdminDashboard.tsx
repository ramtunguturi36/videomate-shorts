import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  FileVideo, 
  Image, 
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Download,
  Upload,
  Settings,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SubscriptionPlanManagement from './SubscriptionPlanManagement';

interface AdminDashboardProps {
  // Add any props needed for admin authentication
}

interface RealTimeStats {
  today: {
    transactions: number;
    revenue: number;
    newUsers: number;
    newIssues: number;
  };
  thisMonth: {
    transactions: number;
    revenue: number;
    newUsers: number;
    activeSubscriptions: number;
  };
  yesterday: {
    transactions: number;
    revenue: number;
  };
  trends: {
    transactionGrowth: number;
    revenueGrowth: number;
  };
}

interface DashboardData {
  realTime: RealTimeStats;
  revenue: any;
  content: any;
  users: any;
  support: any;
  folders: any;
  performance: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analytics' | 'transactions' | 'users' | 'subscription-plans'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDashboardData({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });
      setDashboardData(response.dashboard);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor your platform performance and manage content</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'content'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileVideo className="w-4 h-4" />
          <span>Content</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'transactions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Transactions</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'users'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users</span>
        </button>
        <button
          onClick={() => setActiveTab('subscription-plans')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'subscription-plans'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Subscription Plans</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(dashboardData.realTime.today.revenue)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(dashboardData.realTime.trends.revenueGrowth)}
                    <span className={`text-sm ${getTrendColor(dashboardData.realTime.trends.revenueGrowth)}`}>
                      {formatCurrency(Math.abs(dashboardData.realTime.trends.revenueGrowth))} vs yesterday
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(dashboardData.realTime.today.transactions)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(dashboardData.realTime.trends.transactionGrowth)}
                    <span className={`text-sm ${getTrendColor(dashboardData.realTime.trends.transactionGrowth)}`}>
                      {Math.abs(dashboardData.realTime.trends.transactionGrowth)} vs yesterday
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Users Today</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(dashboardData.realTime.today.newUsers)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatNumber(dashboardData.realTime.thisMonth.newUsers)} this month
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(dashboardData.realTime.thisMonth.activeSubscriptions)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Monthly recurring
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Period:</span>
                <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Revenue chart will be displayed here</p>
                <p className="text-sm text-gray-500">Total: {formatCurrency(dashboardData.revenue.totals.totalRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Top Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Videos</h3>
              <div className="space-y-3">
                {dashboardData.content.topVideos.slice(0, 5).map((video: any, index: number) => (
                  <div key={video.videoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{video.title}</p>
                        <p className="text-sm text-gray-500">{video.purchaseCount} purchases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(video.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Images</h3>
              <div className="space-y-3">
                {dashboardData.content.topImages.slice(0, 5).map((image: any, index: number) => (
                  <div key={image.imageId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{image.title}</p>
                        <p className="text-sm text-gray-500">{image.purchaseCount} purchases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(image.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Support Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData.support.issues.totalIssues}
                </div>
                <div className="text-sm text-gray-600">Total Issues</div>
                <div className="text-xs text-gray-500 mt-1">
                  {dashboardData.support.issues.openIssues} open
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.support.issues.resolvedIssues}
                </div>
                <div className="text-sm text-gray-600">Resolved</div>
                <div className="text-xs text-gray-500 mt-1">
                  {dashboardData.support.issues.inProgressIssues} in progress
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.support.contacts.totalMessages}
                </div>
                <div className="text-sm text-gray-600">Messages</div>
                <div className="text-xs text-gray-500 mt-1">
                  {dashboardData.support.contacts.newMessages} new
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.support.issues.urgentIssues}
                </div>
                <div className="text-sm text-gray-600">Urgent</div>
                <div className="text-xs text-gray-500 mt-1">
                  Priority issues
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Management Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Content Management</h3>
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload Content</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Manage Folders</span>
                </button>
              </div>
            </div>
            <div className="text-center py-12">
              <FileVideo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Content Management</h4>
              <p className="text-gray-600 mb-4">Manage your videos, images, and folder structure</p>
              <div className="flex items-center justify-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <FileVideo className="w-4 h-4" />
                  <span>Manage Videos</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  <Image className="w-4 h-4" />
                  <span>Manage Images</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics & Reports</h3>
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h4>
              <p className="text-gray-600 mb-4">View detailed analytics and generate reports</p>
              <div className="flex items-center justify-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span>Revenue Analytics</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  <Users className="w-4 h-4" />
                  <span>User Analytics</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Monitoring</h3>
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Transaction Management</h4>
              <p className="text-gray-600 mb-4">Monitor and manage all transactions</p>
              <div className="flex items-center justify-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>View Transactions</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filter & Search</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">User Analytics</h4>
              <p className="text-gray-600 mb-4">Monitor user activity and engagement</p>
              <div className="flex items-center justify-center space-x-4">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <Users className="w-4 h-4" />
                  <span>View Users</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">
                  <Activity className="w-4 h-4" />
                  <span>User Activity</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors">
                  <TrendingUp className="w-4 h-4" />
                  <span>Growth Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plans Tab */}
      {activeTab === 'subscription-plans' && (
        <SubscriptionPlanManagement />
      )}
    </div>
  );
};

export default AdminDashboard;
