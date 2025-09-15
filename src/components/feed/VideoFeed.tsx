import React, { useState, useEffect, useRef, useCallback } from 'react';
import { feedAPI } from '../../services/api';
import { VideoFeedItem } from '../../types/feed';
import VideoPlayer from './VideoPlayer';
import { Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoFeedProps {
  folderPath?: string;
  onImageUnlock?: (imageUrl: string) => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ folderPath, onImageUnlock }) => {
  const [videos, setVideos] = useState<VideoFeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadVideos = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await feedAPI.getVideos({
        page: pageNum,
        limit: 10,
        folderPath
      });

      if (append) {
        setVideos(prev => [...prev, ...response.videos]);
      } else {
        setVideos(response.videos);
      }

      setHasMore(response.pagination.current < response.pagination.pages);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load videos');
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [folderPath]);

  useEffect(() => {
    loadVideos(1, false);
  }, [loadVideos]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => {
            const nextPage = prev + 1;
            loadVideos(nextPage, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const lastVideo = containerRef.current?.lastElementChild;
    if (lastVideo && observerRef.current) {
      observerRef.current.observe(lastVideo);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadVideos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, videos.length]);

  // Scroll to current video
  useEffect(() => {
    const currentVideo = containerRef.current?.children[currentIndex] as HTMLElement;
    if (currentVideo) {
      currentVideo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const handleUnlockImage = async (video: VideoFeedItem) => {
    if (!video.associatedImage) return;

    if (video.associatedImage.hasPurchased) {
      // Image already purchased, show it
      if (onImageUnlock) {
        onImageUnlock(video.associatedImage.r2Url);
      }
      return;
    }

    try {
      // Create purchase order
      const response = await feedAPI.createPurchaseOrder(video.associatedImage.id);
      
      if (response.purchase.status === 'completed') {
        // Free with subscription
        toast.success('Image unlocked with subscription!');
        if (onImageUnlock) {
          onImageUnlock(video.associatedImage.r2Url);
        }
        // Refresh videos to update purchase status
        loadVideos(1, false);
      } else {
        // Show Razorpay payment
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key',
          amount: response.order.amount,
          currency: response.order.currency,
          name: 'Image Purchase',
          description: `Unlock image for ${video.title}`,
          order_id: response.order.id,
          handler: async (razorpayResponse: any) => {
            try {
              await feedAPI.verifyPayment(
                razorpayResponse.razorpay_order_id,
                razorpayResponse.razorpay_payment_id,
                razorpayResponse.razorpay_signature,
                response.purchase.id
              );
              
              toast.success('Payment successful! Image unlocked.');
              if (onImageUnlock) {
                onImageUnlock(video.associatedImage!.r2Url);
              }
              // Refresh videos to update purchase status
              loadVideos(1, false);
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
      toast.error(error.response?.data?.message || 'Failed to unlock image');
    }
  };

  const handleLike = (video: VideoFeedItem) => {
    // TODO: Implement like functionality
    toast.success('Liked!');
  };

  const handleShare = (video: VideoFeedItem) => {
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

  const handleComment = (video: VideoFeedItem) => {
    // TODO: Implement comment functionality
    toast.info('Comments coming soon!');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadVideos(1, false)}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No videos found</p>
          <p className="text-gray-400 text-sm">Try selecting a different folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Video Feed Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="h-full snap-start flex-shrink-0"
          >
            <VideoPlayer
              video={video}
              isActive={index === currentIndex}
              onUnlockImage={() => handleUnlockImage(video)}
              onLike={() => handleLike(video)}
              onShare={() => handleShare(video)}
              onComment={() => handleComment(video)}
            />
          </div>
        ))}
        
        {/* Loading indicator for infinite scroll */}
        {loading && videos.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        )}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center space-x-2 p-4">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default VideoFeed;
