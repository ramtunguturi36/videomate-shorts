import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { userAPI, paymentAPI } from '../../services/api';
import { User, Purchase } from '../../types/auth';
import VideoGallery from '../feed/VideoGallery';
import CartComponent from './CartComponent';
import SubscriptionManagement from '../SubscriptionManagement';
import { 
  User as UserIcon, 
  CreditCard, 
  ShoppingBag, 
  Settings,
  LogOut,
  Plus,
  Calendar,
  DollarSign,
  Video,
  ShoppingCart,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const [profile, setProfile] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accessSummary, setAccessSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'profile' | 'purchases' | 'subscription' | 'cart' | 'subscription-plans'>('videos');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [profileData, purchasesData, accessSummaryData] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getPurchases(),
        paymentAPI.getAccessSummary()
      ]);
      setProfile(profileData);
      setPurchases(purchasesData.purchases);
      setAccessSummary(accessSummaryData);
    } catch (error) {
      toast.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const addTestPurchase = async () => {
    try {
      await userAPI.addPurchase(
        'test-product-' + Date.now(),
        'Test Product',
        Math.floor(Math.random() * 100) + 10
      );
      toast.success('Test purchase added!');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to add test purchase');
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
              <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <UserIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Account Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.subscriptionInfo.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Plan</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {profile?.subscriptionInfo.plan}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'videos', label: 'Videos', icon: Video },
                { 
                  id: 'cart', 
                  label: `Cart ${getItemCount() > 0 ? `(${getItemCount()})` : ''}`, 
                  icon: ShoppingCart 
                },
                { id: 'profile', label: 'Profile', icon: UserIcon },
                { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
                { id: 'subscription', label: 'Subscription', icon: CreditCard },
                { id: 'subscription-plans', label: 'Plans', icon: Star }
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
            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                <VideoGallery />
              </div>
            )}

            {/* Cart Tab */}
            {activeTab === 'cart' && (
              <CartComponent />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && profile && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
                    <p className="text-gray-600">{profile.email}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {profile.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Account Information</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Email Verified:</span> {profile.isEmailVerified ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Member Since:</span> {new Date(profile.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-medium">Last Login:</span> {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Purchase History</h3>
                  <button
                    onClick={addTestPurchase}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Test Purchase</span>
                  </button>
                </div>

                {purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No purchases yet</p>
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

            {/* Subscription Tab */}
            {activeTab === 'subscription' && profile && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h3>
                  
                  {accessSummary?.hasActiveSubscription ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Active Subscription</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-green-700">Plan</p>
                            <p className="text-lg font-semibold text-green-900 capitalize">
                              {accessSummary.subscription.plan}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Expires</p>
                            <p className="text-lg font-semibold text-green-900">
                              {new Date(accessSummary.subscription.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {accessSummary.subscription.isExpiringSoon && (
                          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              ⚠️ Your subscription expires soon. Consider renewing to maintain access.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={async () => {
                            try {
                              await paymentAPI.cancelSubscription();
                              toast.success('Subscription cancelled successfully');
                              fetchUserData();
                            } catch (error) {
                              toast.error('Failed to cancel subscription');
                            }
                          }}
                          className="btn-outline text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h4>
                      <p className="text-gray-600 mb-6">
                        Subscribe to get unlimited access to all video images with no time restrictions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                        <div className="border border-gray-200 rounded-lg p-4 text-center">
                          <h5 className="font-semibold text-gray-900">Monthly</h5>
                          <p className="text-2xl font-bold text-gray-900">$29</p>
                          <p className="text-sm text-gray-500">per month</p>
                        </div>
                        <div className="border border-primary-200 bg-primary-50 rounded-lg p-4 text-center">
                          <h5 className="font-semibold text-primary-900">Yearly</h5>
                          <p className="text-2xl font-bold text-primary-900">$299</p>
                          <p className="text-sm text-primary-600">Save $49</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Purchases */}
                {accessSummary?.activePurchases && accessSummary.activePurchases.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Purchases</h3>
                    <div className="space-y-3">
                      {accessSummary.activePurchases.map((purchase: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {purchase.videoId?.title || 'Video Image'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Expires in {Math.ceil(purchase.timeRemaining / (1000 * 60))} minutes
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subscription Plans Tab */}
            {activeTab === 'subscription-plans' && (
              <SubscriptionManagement />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
