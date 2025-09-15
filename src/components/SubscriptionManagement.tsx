import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';
import { 
  CreditCard, 
  CheckCircle, 
  Star, 
  Crown,
  Calendar,
  DollarSign,
  Zap,
  Shield,
  Download,
  X,
  AlertCircle,
  Check
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
}

interface AccessSummary {
  hasActiveSubscription: boolean;
  subscription?: {
    plan: string;
    endDate: string;
    isExpiringSoon: boolean;
  };
  activePurchases: Array<{
    id: string;
    imageId: string;
    videoId: string;
    expiryDate: string;
    timeRemaining: number;
  }>;
}

const SubscriptionManagement: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansResponse, accessResponse] = await Promise.all([
        paymentAPI.getSubscriptionPlans(),
        paymentAPI.getAccessSummary()
      ]);
      setPlans(plansResponse.plans);
      setAccessSummary(accessResponse);
    } catch (error) {
      toast.error('Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const response = await paymentAPI.createSubscription(planId);
      
      if (response.subscription?.id) {
        // Initialize Razorpay
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          ...(response.subscription.isOneTimePayment ? {
            order_id: response.subscription.id,
            amount: response.subscription.amount,
            currency: response.subscription.currency,
            name: 'VideoFeed',
            description: response.plan.name,
            image: '/logo.png',
            handler: async function (paymentResponse: any) {
              try {
                // Payment successful - create subscription in database
                const subscriptionResponse = await fetch('/api/payments/verify-subscription-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    orderId: response.subscription.id,
                    paymentId: paymentResponse.razorpay_payment_id,
                    signature: paymentResponse.razorpay_signature,
                    planId: response.plan.id
                  })
                });
                
                if (subscriptionResponse.ok) {
                  toast.success('Subscription activated successfully!');
                  fetchData();
                } else {
                  toast.error('Failed to activate subscription');
                }
              } catch (error) {
                toast.error('Failed to activate subscription');
              }
            }
          } : {
            subscription_id: response.subscription.id,
            name: 'VideoFeed',
            description: response.plan.name,
            image: '/logo.png',
            handler: async function (subscriptionResponse: any) {
              try {
                // Subscription successful
                toast.success('Subscription activated successfully!');
                fetchData();
              } catch (error) {
                toast.error('Failed to activate subscription');
              }
            }
          }),
          prefill: {
            name: 'User Name', // You can get this from user context
            email: 'user@example.com', // You can get this from user context
          },
          theme: {
            color: '#2563eb'
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } else {
        toast.error('Failed to create subscription');
      }
    } catch (error) {
      toast.error('Failed to create subscription');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      await paymentAPI.cancelSubscription();
      toast.success('Subscription cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return `₹${price}`;
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'per month';
      case 'yearly': return 'per year';
      case 'lifetime': return 'one-time';
      default: return cycle;
    }
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    if (plan.metadata.icon === 'crown') return <Crown className="w-6 h-6" />;
    if (plan.metadata.icon === 'star') return <Star className="w-6 h-6" />;
    return <CreditCard className="w-6 h-6" />;
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    switch (plan.metadata.color) {
      case 'purple': return 'border-purple-200 bg-purple-50';
      case 'blue': return 'border-blue-200 bg-blue-50';
      case 'green': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {accessSummary?.hasActiveSubscription && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Subscription</h3>
                <p className="text-gray-600">
                  {accessSummary.subscription?.plan} plan
                  {accessSummary.subscription?.isExpiringSoon && (
                    <span className="ml-2 text-orange-600 font-medium">(Expires Soon)</span>
                  )}
                </p>
                {accessSummary.subscription?.endDate && (
                  <p className="text-sm text-gray-500">
                    Expires: {new Date(accessSummary.subscription.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleCancelSubscription}
              className="btn-outline text-red-600 hover:text-red-700 hover:border-red-300"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* Active Purchases */}
      {accessSummary?.activePurchases && accessSummary.activePurchases.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Purchases</h3>
          <div className="space-y-3">
            {accessSummary.activePurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {typeof purchase.videoId === 'string' ? purchase.videoId : (purchase.videoId as any)?.title || 'Video Image'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires in {Math.ceil(purchase.timeRemaining / (1000 * 60))} minutes
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {accessSummary?.hasActiveSubscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {accessSummary?.hasActiveSubscription 
              ? 'Upgrade to get even more features and benefits'
              : 'Get unlimited access to all premium content with our subscription plans'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`card p-8 relative ${
                plan.isPopular ? 'ring-2 ring-primary-500 transform scale-105' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    {plan.metadata.badge || 'Most Popular'}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                  plan.metadata.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  plan.metadata.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  plan.metadata.color === 'green' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getPlanIcon(plan)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /{getBillingCycleLabel(plan.billingCycle)}
                  </span>
                </div>
                {plan.billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600 font-medium">
                    Save ₹{Math.round(plan.price / 12 * 12 - plan.price)} per year
                  </p>
                )}
              </div>

              <div className="mb-8">
                <p className="text-gray-600 text-center mb-4">{plan.description}</p>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-900 font-medium">{feature.name}</span>
                        {feature.description && (
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Access Limits */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Access Limits</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Images:</span>
                    <span className="font-medium">
                      {plan.limits.maxImages === -1 ? 'Unlimited' : plan.limits.maxImages}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Videos:</span>
                    <span className="font-medium">
                      {plan.limits.maxVideos === -1 ? 'Unlimited' : plan.limits.maxVideos}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downloads:</span>
                    <span className="font-medium">
                      {plan.limits.maxDownloads === -1 ? 'Unlimited' : plan.limits.maxDownloads}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Access Duration:</span>
                    <span className="font-medium">
                      {plan.limits.accessDuration === -1 ? 'Unlimited' : `${plan.limits.accessDuration} min`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(plan._id)}
                disabled={subscribing === plan._id || !plan.isActive}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.isPopular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {subscribing === plan._id ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : !plan.isActive ? (
                  'Currently Unavailable'
                ) : accessSummary?.hasActiveSubscription ? (
                  'Upgrade Plan'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="card p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Our Subscription?</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to premium content with our flexible subscription plans
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Unlimited Access</h4>
            <p className="text-gray-600">
              Access all premium images without time restrictions or additional charges
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure Payments</h4>
            <p className="text-gray-600">
              Your payments are processed securely through Razorpay with industry-standard encryption
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Download & Save</h4>
            <p className="text-gray-600">
              Download your favorite content and access it offline anytime, anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
