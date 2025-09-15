import React, { useState } from 'react';
import VideoFeed from './VideoFeed';
import FolderNavigation from './FolderNavigation';
import { 
  Folder as FolderIcon, 
  X, 
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ReelsFeedProps {
  onImageUnlock?: (imageUrl: string) => void;
}

const ReelsFeed: React.FC<ReelsFeedProps> = ({ onImageUnlock }) => {
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [showFolderNav, setShowFolderNav] = useState(true);
  const [unlockedImageUrl, setUnlockedImageUrl] = useState<string | null>(null);

  const handleFolderSelect = (folderPath: string | null) => {
    setSelectedFolderPath(folderPath);
  };

  const handleImageUnlock = (imageUrl: string) => {
    setUnlockedImageUrl(imageUrl);
    if (onImageUnlock) {
      onImageUnlock(imageUrl);
    }
  };

  const closeImageModal = () => {
    setUnlockedImageUrl(null);
  };

  return (
    <div className="h-full flex bg-black">
      {/* Folder Navigation Sidebar */}
      {showFolderNav && (
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <FolderNavigation
            onFolderSelect={handleFolderSelect}
            selectedFolderPath={selectedFolderPath}
          />
        </div>
      )}

      {/* Video Feed */}
      <div className="flex-1 relative">
        <VideoFeed
          folderPath={selectedFolderPath || undefined}
          onImageUnlock={handleImageUnlock}
        />

        {/* Toggle Folder Navigation Button */}
        <button
          onClick={() => setShowFolderNav(!showFolderNav)}
          className="absolute top-4 left-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          {showFolderNav ? (
            <X className="w-5 h-5" />
          ) : (
            <FolderIcon className="w-5 h-5" />
          )}
        </button>

        {/* Selected Folder Indicator */}
        {selectedFolderPath && (
          <div className="absolute top-4 right-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {selectedFolderPath}
          </div>
        )}
      </div>

      {/* Unlocked Image Modal */}
      {unlockedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <img
              src={unlockedImageUrl}
              alt="Unlocked Image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsFeed;
