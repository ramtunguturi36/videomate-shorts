import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import { Admin, User, Purchase } from '../../types/auth';
import FileManager from '../files/FileManager';
import SubscriptionPlanManagement from '../admin/SubscriptionPlanManagement';
import { 
  Users, 
  BarChart3, 
  ShoppingBag, 
  Settings,
  LogOut,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  FolderOpen,
  Upload,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  newUsersThisMonth: number;
  subscriptionStats: Array<{ _id: string; count: number }>;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'purchases' | 'files' | 'subscription-plans'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, usersData, purchasesData] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getUsers(usersPage, 10),
        adminAPI.getPurchases(1, 20)
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setPurchases(purchasesData.purchases);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminAPI.deleteUser(userId);
        toast.success('User deleted successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.newUsersThisMonth || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
                { id: 'files', label: 'Files', icon: FolderOpen },
                { id: 'subscription-plans', label: 'Subscription Plans', icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
                
                {/* Subscription Stats */}
                <div className="card p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Subscription Plans</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats?.subscriptionStats.map((stat) => (
                      <div key={stat._id} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                        <p className="text-sm text-gray-600 capitalize">{stat._id} Plan</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Purchases */}
                <div className="card p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Purchases</h4>
                  {purchases.length === 0 ? (
                    <p className="text-gray-500">No purchases yet</p>
                  ) : (
                    <div className="space-y-3">
                      {purchases.slice(0, 5).map((purchase, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{purchase.productName}</p>
                            <p className="text-sm text-gray-600">{purchase.userName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${purchase.amount}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(purchase.purchaseDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>

                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Plan
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary-600">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                              {user.subscriptionInfo.plan}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.subscriptionInfo.isActive 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.subscriptionInfo.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button className="text-primary-600 hover:text-primary-900">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-gray-600 hover:text-gray-900">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Purchase History</h3>

                {purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No purchases found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchases.map((purchase, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {purchase.productName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {purchase.userName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${purchase.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(purchase.purchaseDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                purchase.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : purchase.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {purchase.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="h-96">
                <FileManager isAdmin={true} />
              </div>
            )}

            {/* Subscription Plans Tab */}
            {activeTab === 'subscription-plans' && (
              <SubscriptionPlanManagement />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
