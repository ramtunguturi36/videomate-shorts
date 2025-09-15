import React, { useState, useEffect } from 'react';
import { feedAPI, paymentAPI } from '../../services/api';
import { VideoFeedItem } from '../../types/feed';
import VideoCard from './VideoCard';
import { useCart } from '../../contexts/CartContext';
import { 
  Loader, 
  AlertCircle, 
  Search, 
  Filter,
  Grid,
  List,
  Folder as FolderIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import FolderNavigation from './FolderNavigation';

const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFolderNav, setShowFolderNav] = useState(false);
  const { addItem, removeItem, isInCart } = useCart();

  useEffect(() => {
    loadVideos();
  }, [selectedFolderPath, currentPage]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await feedAPI.getVideos({
        page: currentPage,
        limit: 12,
        folderPath: selectedFolderPath || undefined,
        search: searchQuery || undefined
      });

      setVideos(response.videos);
      setTotalPages(response.pagination.pages);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load videos');
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadVideos();
  };

  const handleFolderSelect = (folderPath: string | null) => {
    setSelectedFolderPath(folderPath);
    setCurrentPage(1);
  };

  const handleAddToCart = (video: VideoFeedItem) => {
    if (isInCart(video.id)) {
      toast('Video already in cart');
      return;
    }
    addItem(video);
    toast.success('Added to cart');
  };

  const handleRemoveFromCart = (videoId: string) => {
    removeItem(videoId);
    toast.success('Removed from cart');
  };

  const handlePurchaseVideo = async (video: VideoFeedItem) => {
    if (!video.associatedImage) {
      toast.error('No associated image found for this video');
      return;
    }

    try {
      // Create purchase order for single video
      const response = await paymentAPI.createOrder(video.associatedImage.id);
      
      if (response.purchase.status === 'completed') {
        // Free with subscription
        toast.success('Image unlocked with subscription!');
        // Refresh videos to update purchase status
        loadVideos();
      } else {
        // Show Razorpay payment
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key',
          amount: response.order.amount,
          currency: response.order.currency,
          name: 'Video Image Purchase',
          description: `Unlock image for ${video.title}`,
          order_id: response.order.id,
          handler: async (razorpayResponse: any) => {
            try {
              await paymentAPI.verifyPayment(
                razorpayResponse.razorpay_order_id,
                razorpayResponse.razorpay_payment_id,
                razorpayResponse.razorpay_signature,
                response.purchase.id
              );
              
              toast.success('Payment successful! Image unlocked for 5 minutes.');
              // Refresh videos to update purchase status
              loadVideos();
            } catch (error) {
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
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to purchase video');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadVideos}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Video Gallery</h2>
          <p className="text-gray-600">Browse and purchase videos</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field pl-10 w-64"
            />
          </div>
          
          {/* Folder Navigation Toggle */}
          <button
            onClick={() => setShowFolderNav(!showFolderNav)}
            className={`btn-outline flex items-center space-x-2 ${
              showFolderNav ? 'bg-primary-50 border-primary-200' : ''
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span>Folders</span>
          </button>
          
          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Folder Navigation Sidebar */}
      {showFolderNav && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <FolderNavigation
            onFolderSelect={handleFolderSelect}
            selectedFolderPath={selectedFolderPath}
          />
        </div>
      )}

      {/* Selected Folder Indicator */}
      {selectedFolderPath && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderIcon className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                Showing videos from: {selectedFolderPath}
              </span>
            </div>
            <button
              onClick={() => setSelectedFolderPath(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}

      {/* Videos Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 text-gray-400 mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">📹</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search terms' : 'Try selecting a different folder'}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  viewMode="grid"
                  onPurchase={() => handlePurchaseVideo(video)}
                  onAddToCart={() => handleAddToCart(video)}
                  onRemoveFromCart={() => handleRemoveFromCart(video.id)}
                  isInCart={isInCart(video.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  viewMode="list"
                  onPurchase={() => handlePurchaseVideo(video)}
                  onAddToCart={() => handleAddToCart(video)}
                  onRemoveFromCart={() => handleRemoveFromCart(video.id)}
                  isInCart={isInCart(video.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoGallery;
