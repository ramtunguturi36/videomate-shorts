import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Settings,
  DollarSign,
  Calendar,
  Users,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  duration: number;
  features: Array<{
    name: string;
    description: string;
    included: boolean;
  }>;
  limits: {
    maxImages: number;
    maxVideos: number;
    maxDownloads: number;
    accessDuration: number;
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  metadata: {
    color?: string;
    icon?: string;
    badge?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const SubscriptionPlanManagement: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
    fetchStats();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await adminAPI.getSubscriptionPlans();
      setPlans(response.plans);
    } catch (error) {
      toast.error('Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getPlanStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to fetch plan stats:', error);
    }
  };

  const handleCreatePlan = async (planData: Partial<SubscriptionPlan>) => {
    try {
      await adminAPI.createSubscriptionPlan(planData);
      toast.success('Subscription plan created successfully');
      setShowCreateModal(false);
      fetchPlans();
      fetchStats();
    } catch (error) {
      toast.error('Failed to create subscription plan');
    }
  };

  const handleUpdatePlan = async (planId: string, planData: Partial<SubscriptionPlan>) => {
    try {
      await adminAPI.updateSubscriptionPlan(planId, planData);
      toast.success('Subscription plan updated successfully');
      setShowEditModal(false);
      setSelectedPlan(null);
      fetchPlans();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update subscription plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) {
      return;
    }

    try {
      await adminAPI.deleteSubscriptionPlan(planId);
      toast.success('Subscription plan deleted successfully');
      fetchPlans();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete subscription plan');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await adminAPI.updateSubscriptionPlan(plan._id, { isActive: !plan.isActive });
      toast.success(`Plan ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchPlans();
    } catch (error) {
      toast.error('Failed to update plan status');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default subscription plans. Continue?')) {
      return;
    }

    try {
      await adminAPI.initializeDefaultPlans();
      toast.success('Default subscription plans initialized successfully');
      fetchPlans();
      fetchStats();
    } catch (error) {
      toast.error('Failed to initialize default plans');
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return `₹${price}`;
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'lifetime': return 'Lifetime';
      default: return cycle;
    }
  };

  const getAccessDurationLabel = (duration: number) => {
    if (duration === -1) return 'Unlimited';
    if (duration < 60) return `${duration} minutes`;
    if (duration < 1440) return `${Math.round(duration / 60)} hours`;
    return `${Math.round(duration / 1440)} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
          <p className="text-gray-600">Manage subscription plans and pricing</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleInitializeDefaults}
            className="btn-outline flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Initialize Defaults</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPlans}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePlans}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Popular Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.popularPlans}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold text-gray-900">₹{Math.round(stats.avgPrice || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access
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
              {plans.map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {plan.isPopular && (
                          <Star className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {plan.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plan.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {plan.billingCycle === 'yearly' && (
                        <span>₹{Math.round(plan.price / 12)}/month</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getBillingCycleLabel(plan.billingCycle)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Images: {plan.limits.maxImages === -1 ? 'Unlimited' : plan.limits.maxImages}
                    </div>
                    <div className="text-sm text-gray-500">
                      Duration: {getAccessDurationLabel(plan.limits.accessDuration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plan.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowEditModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`${
                          plan.isActive 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {plan.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan._id)}
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
      </div>

      {/* Create/Edit Plan Modal */}
      {(showCreateModal || showEditModal) && (
        <PlanModal
          plan={selectedPlan}
          isEdit={showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSubmit={showEditModal ? 
            (data) => handleUpdatePlan(selectedPlan!._id, data) : 
            handleCreatePlan
          }
        />
      )}
    </div>
  );
};

// Plan Modal Component
interface PlanModalProps {
  plan?: SubscriptionPlan | null;
  isEdit: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<SubscriptionPlan>) => void;
}

const PlanModal: React.FC<PlanModalProps> = ({ plan, isEdit, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'INR',
    billingCycle: plan?.billingCycle || 'monthly',
    duration: plan?.duration || 30,
    isActive: plan?.isActive ?? true,
    isPopular: plan?.isPopular ?? false,
    sortOrder: plan?.sortOrder || 0,
    features: plan?.features || [
      { name: '', description: '', included: true }
    ],
    limits: {
      maxImages: plan?.limits?.maxImages || -1,
      maxVideos: plan?.limits?.maxVideos || -1,
      maxDownloads: plan?.limits?.maxDownloads || -1,
      accessDuration: plan?.limits?.accessDuration || -1
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { name: '', description: '', included: true }]
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const updateFeature = (index: number, field: string, value: any) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = { ...updatedFeatures[index], [field]: value };
    setFormData({ ...formData, features: updatedFeatures });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {isEdit ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                  className="input-field"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (days)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                required
              />
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Feature name"
                    value={feature.name}
                    onChange={(e) => updateFeature(index, 'name', e.target.value)}
                    className="input-field flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="btn-outline text-sm"
              >
                Add Feature
              </button>
            </div>

            {/* Limits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Limits</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600">Max Images (-1 for unlimited)</label>
                  <input
                    type="number"
                    value={formData.limits.maxImages}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      limits: { ...formData.limits, maxImages: Number(e.target.value) }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Access Duration (minutes, -1 for unlimited)</label>
                  <input
                    type="number"
                    value={formData.limits.accessDuration}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      limits: { ...formData.limits, accessDuration: Number(e.target.value) }
                    })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Popular</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {isEdit ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlanManagement;
