import React, { useState } from 'react';
import { File } from '../../types/files';
import { 
  Play, 
  Download, 
  Eye, 
  DollarSign, 
  Calendar, 
  User, 
  Tag,
  X,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileViewerProps {
  file: File;
  onClose?: () => void;
  onFileSelect?: (file: File) => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ file, onClose, onFileSelect }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDownload = () => {
    // In a real app, you might want to track downloads
    window.open(file.r2Url, '_blank');
    toast.success('Download started');
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderFileContent = () => {
    if (file.fileType === 'video') {
      return (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            controls
            className="w-full h-auto max-h-96"
            poster={file.thumbnailUrl || undefined}
          >
            <source src={file.r2Url} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      );
    } else if (file.fileType === 'image') {
      return (
        <div className="relative">
          <img
            src={file.r2Url}
            alt={file.title}
            className="w-full h-auto max-h-96 object-contain rounded-lg"
          />
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return null;
  };

  const content = (
    <div className="space-y-6">
      {/* File Content */}
      <div>
        {renderFileContent()}
      </div>

      {/* File Info */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{file.title}</h2>
          {file.metadata.description && (
            <p className="text-gray-600">{file.metadata.description}</p>
          )}
        </div>

        {/* Price */}
        {file.metadata.price > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-lg font-semibold text-green-700">
              ${file.metadata.price}
            </span>
          </div>
        )}

        {/* File Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Uploaded: {formatDate(file.uploadInfo.uploadDate)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>By: {file.uploadInfo.uploadedBy.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{file.metadata.viewCount} views</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Download className="w-4 h-4" />
              <span>{file.metadata.downloadCount} downloads</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">File Size:</span> {formatFileSize(file.size)}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Type:</span> {file.fileType}
            </div>
            {file.fileType === 'video' && file.metadata.duration && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Duration:</span> {file.formattedDuration}
              </div>
            )}
            {file.metadata.dimensions && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Dimensions:</span> {file.metadata.dimensions.width} × {file.metadata.dimensions.height}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {file.metadata.tags && file.metadata.tags.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {file.metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleDownload}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          
          {onFileSelect && (
            <button
              onClick={() => onFileSelect(file)}
              className="btn-outline flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Select File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="relative max-w-7xl max-h-full p-4">
          <button
            onClick={handleFullscreen}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded hover:bg-opacity-75 z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {file.fileType === 'video' ? (
            <video
              controls
              autoPlay
              className="max-w-full max-h-full"
            >
              <source src={file.r2Url} type={file.mimeType} />
            </video>
          ) : (
            <img
              src={file.r2Url}
              alt={file.title}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {onClose && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {content}
    </div>
  );
};

export default FileViewer;
