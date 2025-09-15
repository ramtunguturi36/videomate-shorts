import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { paymentAPI } from '../../services/api';
import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Clock,
  Package,
  X,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';

const CartComponent: React.FC = () => {
  const { items, removeItem, clearCart, getTotalPrice, getItemCount } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleRemoveItem = (videoId: string) => {
    removeItem(videoId);
    toast.success('Item removed from cart');
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Cart cleared');
  };

  const handlePurchaseItems = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      // Create purchase orders for all items in cart sequentially
      const purchaseOrders = [];
      for (const item of items) {
        const order = await paymentAPI.createOrder(item.video.associatedImage?.id || '');
        purchaseOrders.push(order);
      }

      // Check if any are free (subscription)
      const freeItems = purchaseOrders.filter(order => order.purchase.status === 'completed');
      const paidItems = purchaseOrders.filter(order => order.purchase.status !== 'completed');

      if (freeItems.length > 0) {
        toast.success(`${freeItems.length} items unlocked with subscription!`);
      }

      if (paidItems.length > 0) {
        // Process payments one by one
        await processPaymentsSequentially(paidItems);
      } else {
        clearCart();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPaymentsSequentially = async (paidItems: any[]) => {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < paidItems.length; i++) {
      const order = paidItems[i];
      
      try {
        // Create individual Razorpay payment for each order
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key';
        console.log('Cart - Razorpay Key Debug:');
        console.log('VITE_RAZORPAY_KEY_ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
        console.log('Using key:', razorpayKey);
        console.log('Key length:', razorpayKey.length);
        
        const options = {
          key: razorpayKey,
          amount: order.order.amount,
          currency: order.order.currency,
          name: 'Video Image Purchase',
          description: `Unlock image ${i + 1} of ${paidItems.length}`,
          order_id: order.order.id,
          handler: async (razorpayResponse: any) => {
            try {
              await paymentAPI.verifyPayment(
                razorpayResponse.razorpay_order_id,
                razorpayResponse.razorpay_payment_id,
                razorpayResponse.razorpay_signature,
                order.purchase.id
              );
              
              successCount++;
              toast.success(`Payment ${i + 1} successful!`);
              
              // Process next payment if there are more
              if (i + 1 < paidItems.length) {
                setTimeout(() => {
                  processPaymentsSequentially(paidItems.slice(i + 1));
                }, 1000);
              } else {
                // All payments completed
                if (successCount > 0) {
                  toast.success(`All ${successCount} images unlocked for 5 minutes!`);
                }
                clearCart();
              }
            } catch (error) {
              failCount++;
              toast.error(`Payment ${i + 1} failed. Please try again.`);
              
              // Continue with next payment
              if (i + 1 < paidItems.length) {
                setTimeout(() => {
                  processPaymentsSequentially(paidItems.slice(i + 1));
                }, 1000);
              } else {
                clearCart();
              }
            }
          },
          prefill: {
            name: 'User',
            email: 'user@example.com'
          },
          theme: {
            color: '#3b82f6'
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
        
        // Wait for this payment to complete before proceeding
        break;
      } catch (error) {
        failCount++;
        console.error('Error processing payment for order:', order.order.id, error);
        toast.error(`Payment ${i + 1} failed. Please try again.`);
      }
    }
  };

  const handleSubscribe = () => {
    setShowSubscriptionModal(true);
  };

  const handleConfirmSubscription = async () => {
    try {
      setIsProcessing(true);
      
      // TODO: Implement subscription purchase with Razorpay
      const response = await paymentAPI.createSubscription('monthly');
      
      // Show Razorpay subscription modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key',
        subscription_id: response.subscription.id,
        name: 'Unlimited Access Subscription',
        description: 'Get unlimited access to all video images',
        handler: async (razorpayResponse: any) => {
          toast.success('Subscription activated! You now have unlimited access.');
          setShowSubscriptionModal(false);
          clearCart(); // Clear cart since user now has unlimited access
        },
        prefill: {
          name: 'User',
          email: 'user@example.com'
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Shopping Cart</h3>
        </div>
        
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h4>
          <p className="text-gray-500 mb-6">Add videos from the Videos tab to purchase their associated images</p>
          <button
            onClick={() => window.location.hash = 'videos'}
            className="btn-primary"
          >
            Browse Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Shopping Cart</h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearCart}
            className="btn-outline text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cart
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.videoId} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              {/* Video Thumbnail */}
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {item.video.thumbnailUrl ? (
                  <img
                    src={item.video.thumbnailUrl}
                    alt={item.video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{item.video.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{item.video.metadata.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Added {item.addedAt.toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{(item.video.metadata as any).category || 'General'}</span>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    ${item.video.associatedImage?.price || 0}
                  </div>
                  <div className="text-xs text-gray-500">Image access</div>
                </div>
                
                <button
                  onClick={() => handleRemoveItem(item.videoId)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Order Summary</h4>
          <span className="text-sm text-gray-600">{getItemCount()} items</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${getTotalPrice()}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Access Duration</span>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">5 minutes per item</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">${getTotalPrice()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handlePurchaseItems}
            disabled={isProcessing}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : `Pay $${getTotalPrice()}`}</span>
          </button>
          
          <button
            onClick={handleSubscribe}
            className="w-full btn-outline border-yellow-300 text-yellow-700 hover:bg-yellow-50 flex items-center justify-center space-x-2"
          >
            <Crown className="w-4 h-4" />
            <span>Get Unlimited Access with Subscription</span>
          </button>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Unlimited Access Subscription</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Premium Features</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Unlimited access to all images</li>
                  <li>• No time restrictions</li>
                  <li>• Cancel anytime</li>
                  <li>• Monthly or yearly plans available</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-3 text-center">
                  <div className="font-semibold text-gray-900">Monthly</div>
                  <div className="text-2xl font-bold text-gray-900">$29</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
                <div className="border border-primary-200 bg-primary-50 rounded-lg p-3 text-center">
                  <div className="font-semibold text-primary-900">Yearly</div>
                  <div className="text-2xl font-bold text-primary-900">$299</div>
                  <div className="text-xs text-primary-600">Save $49</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubscription}
                  className="flex-1 btn-primary"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartComponent;
