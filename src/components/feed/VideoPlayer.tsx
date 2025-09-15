import React, { useRef, useEffect, useState } from 'react';
import { VideoFeedItem } from '../../types/feed';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Heart,
  Share2,
  MessageCircle,
  MoreHorizontal
} from 'lucide-react';

interface VideoPlayerProps {
  video: VideoFeedItem;
  isActive: boolean;
  onUnlockImage: () => void;
  onLike?: () => void;
  onShare?: () => void;
  onComment?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isActive,
  onUnlockImage,
  onLike,
  onShare,
  onComment
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      videoElement.play().catch(console.error);
    } else {
      videoElement.pause();
    }
  }, [isActive]);

  const togglePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const time = parseFloat(e.target.value);
    videoElement.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.r2Url}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />

      {/* Video Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Video Controls */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </button>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMute}
              className="text-white hover:text-white/70 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={onLike}
              className="text-white hover:text-red-500 transition-colors"
            >
              <Heart className="w-5 h-5" />
            </button>
            
            <button
              onClick={onShare}
              className="text-white hover:text-white/70 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={onComment}
              className="text-white hover:text-white/70 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button className="text-white hover:text-white/70 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Info Overlay */}
      <div className="absolute top-4 left-4 right-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">
              {video.title}
            </h3>
            <p className="text-white/80 text-sm mb-2 line-clamp-2">
              {video.metadata.description}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {video.metadata.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-white/20 text-white text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-white/70 text-xs">
              by {video.uploadInfo.uploadedBy.name} • {video.metadata.viewCount} views
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Purchase Button */}
      {video.associatedImage && (
        <div className="absolute bottom-20 right-4">
          <button
            onClick={onUnlockImage}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              video.associatedImage.hasPurchased
                ? 'bg-green-500 text-white'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {video.associatedImage.hasPurchased ? (
              '✓ QR Code Unlocked'
            ) : (
              `Buy QR Code - ₹${video.associatedImage.price}`
            )}
          </button>
        </div>
      )}

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
