import React, { useState, useEffect } from 'react';
import { VideoFeedItem } from '../../types/feed';
import VideoPlayer from './VideoPlayer';
import { paymentAPI } from '../../services/api';
import { 
  Play, 
  Heart, 
  Share2, 
  MessageCircle, 
  ShoppingCart, 
  CreditCard,
  Lock,
  Unlock,
  Clock,
  Eye,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoCardProps {
  video: VideoFeedItem;
  viewMode: 'grid' | 'list';
  onPurchase: () => void;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
  isInCart: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  viewMode,
  onPurchase,
  onAddToCart,
  onRemoveFromCart,
  isInCart
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [unlockedImageUrl, setUnlockedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{
    hasAccess: boolean;
    isExpired: boolean;
    canBuyAgain: boolean;
    expiryDate?: string;
  } | null>(null);

  // Check purchase status when component mounts
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (video.associatedImage) {
        try {
          const status = await paymentAPI.getPurchaseStatus(video.associatedImage.id);
          setPurchaseStatus(status);
        } catch (error) {
          console.error('Error checking purchase status:', error);
        }
      }
    };

    checkPurchaseStatus();
  }, [video.associatedImage]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.metadata.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePurchaseClick = () => {
    if (purchaseStatus?.hasAccess && !purchaseStatus?.isExpired) {
      // User has active access, show the image
      handleViewImage();
      return;
    }
    setShowPurchaseModal(true);
  };

  const handleViewImage = async () => {
    if (!video.associatedImage) {
      toast.error('No associated QR code found');
      return;
    }

    try {
      const response = await paymentAPI.getImageAccess(video.associatedImage.id);
      setUnlockedImageUrl(response.imageUrl);
      setShowImageModal(true);
      
      if (response.expiryDate) {
        const expiryTime = new Date(response.expiryDate);
        const now = new Date();
        const minutesLeft = Math.ceil((expiryTime.getTime() - now.getTime()) / (1000 * 60));
        toast.success(`QR Code unlocked! Access expires in ${minutesLeft} minutes.`);
      } else {
        toast.success('QR Code unlocked with subscription!');
      }
    } catch (error: any) {
      if (error.response?.data?.error === 'Access has expired') {
        toast.error('Your access has expired. Please purchase again to view the QR code.');
        // Refresh purchase status
        const status = await paymentAPI.getPurchaseStatus(video.associatedImage.id);
        setPurchaseStatus(status);
      } else {
        toast.error(error.response?.data?.message || 'Failed to access QR code');
      }
    }
  };

  const handleConfirmPurchase = async () => {
    if (!video.associatedImage) {
      toast.error('No associated QR code found');
      return;
    }

    setShowPurchaseModal(false);
    
    try {
      console.log('Creating purchase order for image:', video.associatedImage.id);
      
      // Test payment system first
      try {
        const testResponse = await fetch('/api/payments/test', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        const testData = await testResponse.json();
        console.log('Payment system test:', testData);
      } catch (testError) {
        console.error('Payment system test failed:', testError);
      }
      
      // Create purchase order
      const response = await paymentAPI.createOrder(video.associatedImage.id);
      console.log('Purchase order response:', response);
      
      if (response.purchase.status === 'completed') {
        // Free with subscription or test mode
        if (response.message && response.message.includes('Test access granted')) {
          toast.success('QR Code unlocked for 5 minutes (Test Mode)!');
        } else {
          toast.success('QR Code unlocked with subscription!');
        }
        // Refresh purchase status
        const status = await paymentAPI.getPurchaseStatus(video.associatedImage.id);
        setPurchaseStatus(status);
        return;
      }

      // Check if we have a valid Razorpay key
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RHZEd3TBvEpAPK'; // Fallback for testing
      console.log('Environment variables check:');
      console.log('VITE_RAZORPAY_KEY_ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
      console.log('Using key:', razorpayKey);
      console.log('All env vars:', import.meta.env);
      
      if (!razorpayKey || razorpayKey === 'rzp_test_key' || razorpayKey === 'your-razorpay-key-id') {
        console.log('No valid Razorpay key found, this should not happen in production');
        toast.error('Payment system not properly configured. Please contact support.');
        return;
      }

      // Show Razorpay payment
      const options = {
        key: razorpayKey,
        amount: response.order.amount,
        currency: response.order.currency,
        name: 'QR Code Purchase',
        description: `Unlock QR code for ${video.title}`,
        order_id: response.order.id,
        handler: async (razorpayResponse: any) => {
          try {
            await paymentAPI.verifyPayment(
              razorpayResponse.razorpay_order_id,
              razorpayResponse.razorpay_payment_id,
              razorpayResponse.razorpay_signature,
              response.purchase.id
            );
            
            toast.success('Payment successful! QR Code unlocked for 5 minutes.');
            // Refresh purchase status
            const status = await paymentAPI.getPurchaseStatus(video.associatedImage.id);
            setPurchaseStatus(status);
          } catch (error: any) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed');
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
    } catch (error: any) {
      console.error('Purchase failed:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      toast.error(error.response?.data?.message || error.message || 'Failed to process purchase');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex">
          {/* Video Thumbnail */}
          <div className="w-80 h-48 bg-gray-100 relative flex-shrink-0">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Play className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setShowPlayer(true)}
                className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
              >
                <Play className="w-6 h-6 text-white ml-1" />
              </button>
            </div>

            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.metadata.duration)}
            </div>
          </div>

          {/* Video Info */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{video.title}</h3>
                <p className="text-gray-600 mb-3">{video.metadata.description}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{video.metadata.viewCount} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatFileSize((video.metadata as any).fileSize || 0)}</span>
                  </div>
                  <span className="capitalize">{(video.metadata as any).category || 'General'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isLiked 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>Like</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* Purchase Actions */}
              <div className="flex items-center space-x-3">
                {video.associatedImage ? (
                  <div className="flex items-center space-x-2">
                    {purchaseStatus?.hasAccess && !purchaseStatus?.isExpired ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <Unlock className="w-4 h-4" />
                        <span className="text-sm font-medium">Unlocked</span>
                        {purchaseStatus.expiryDate && (
                          <span className="text-xs text-gray-500">
                            (Expires in {Math.ceil((new Date(purchaseStatus.expiryDate).getTime() - new Date().getTime()) / (1000 * 60))} min)
                          </span>
                        )}
                      </div>
                    ) : purchaseStatus?.isExpired ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 text-red-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">Expired</span>
                        </div>
                        <button
                          onClick={handlePurchaseClick}
                          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Buy QR Code Again</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Lock className="w-4 h-4" />
                          <span className="text-sm">QR Code locked</span>
                        </div>
                        <button
                          onClick={() => isInCart ? onRemoveFromCart() : onAddToCart()}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                            isInCart
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>{isInCart ? 'Remove from Cart' : 'Add to Cart'}</span>
                        </button>
                        <button
                          onClick={handlePurchaseClick}
                          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Buy QR Code</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No associated QR code</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {purchaseStatus?.isExpired ? 'Buy Again - Image Access' : 'Purchase Image Access'}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={video.thumbnailUrl || '/placeholder-video.jpg'}
                    alt={video.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{video.title}</h4>
                    <p className="text-sm text-gray-600">Associated image access</p>
                  </div>
                </div>
                
                {purchaseStatus?.isExpired ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-red-800">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Your previous access has expired</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">5 minutes QR Code access after purchase</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-semibold text-gray-900">
                      ${video.associatedImage?.price || 10}
                    </span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPurchaseModal(false)}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmPurchase}
                      className="btn-primary"
                    >
                      {purchaseStatus?.isExpired ? 'Buy Again' : 'Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        {showPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-4xl">
              <button
                onClick={() => setShowPlayer(false)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 z-10"
              >
                ×
              </button>
              <VideoPlayer
                video={video}
                isActive={true}
                onUnlockImage={() => {}}
                onLike={handleLike}
                onShare={handleShare}
                onComment={() => toast('Comments coming soon!')}
              />
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && unlockedImageUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 z-10"
              >
                ×
              </button>
              
              <img
                src={unlockedImageUrl}
                alt="Unlocked QR Code"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
                <p className="text-sm">
                  {video.associatedImage?.hasPurchased ? 
                    'QR Code unlocked - Access expires in 5 minutes' : 
                    'QR Code unlocked with subscription'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Video Thumbnail */}
      <div className="aspect-video bg-gray-100 relative">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setShowPlayer(true)}
            className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
          >
            <Play className="w-6 h-6 text-white ml-1" />
          </button>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.metadata.duration)}
        </div>

        {/* Purchase Status Badge */}
        {video.associatedImage && (
          <div className="absolute top-2 left-2">
            {purchaseStatus?.hasAccess && !purchaseStatus?.isExpired ? (
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                <Unlock className="w-3 h-3" />
                <span>Unlocked</span>
              </div>
            ) : purchaseStatus?.isExpired ? (
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Expired</span>
              </div>
            ) : (
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{video.metadata.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>{video.metadata.viewCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatFileSize((video.metadata as any).fileSize || 0)}</span>
          </div>
          <span className="capitalize">{(video.metadata as any).category || 'General'}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full transition-colors ${
                isLiked 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={handleShare}
              className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Purchase Actions */}
          {video.associatedImage ? (
            <div className="flex items-center space-x-2">
              {purchaseStatus?.hasAccess && !purchaseStatus?.isExpired ? (
                <button
                  onClick={handleViewImage}
                  className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              ) : purchaseStatus?.isExpired ? (
                <button
                  onClick={handlePurchaseClick}
                  className="p-2 bg-orange-600 text-white hover:bg-orange-700 rounded-full transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => isInCart ? onRemoveFromCart() : onAddToCart()}
                    className={`p-2 rounded-full transition-colors ${
                      isInCart
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePurchaseClick}
                    className="p-2 bg-primary-600 text-white hover:bg-primary-700 rounded-full transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {purchaseStatus?.isExpired ? 'Buy Again - QR Code Access' : 'Purchase QR Code Access'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={video.thumbnailUrl || '/placeholder-video.jpg'}
                  alt={video.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{video.title}</h4>
                  <p className="text-sm text-gray-600">QR Code access (5 minutes)</p>
                </div>
              </div>
              
              {purchaseStatus?.isExpired ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-800">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Your previous access has expired</span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">5 minutes QR Code access after purchase</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    ${video.associatedImage?.price || 10}
                  </span>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPurchase}
                    className="btn-primary"
                  >
                    {purchaseStatus?.isExpired ? 'Buy Again' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setShowPlayer(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 z-10"
            >
              ×
            </button>
            <VideoPlayer
              video={video}
              isActive={true}
              onUnlockImage={() => {}}
              onLike={handleLike}
              onShare={handleShare}
              onComment={() => toast('Comments coming soon!')}
            />
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && unlockedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 z-10"
            >
              ×
            </button>
            
            <img
              src={unlockedImageUrl}
              alt="Unlocked QR Code"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <p className="text-sm">
                {video.associatedImage?.hasPurchased ? 
                  'QR Code unlocked - Access expires in 5 minutes' : 
                  'QR Code unlocked with subscription'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
