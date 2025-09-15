import React, { useState, useRef } from 'react';
import { filesAPI } from '../../services/api';
import { FileUploadData } from '../../types/files';
import { 
  Upload, 
  Video, 
  Image, 
  FolderPlus, 
  X, 
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onUploadComplete?: () => void;
  onCancel?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onCancel }) => {
  const [formData, setFormData] = useState<FileUploadData>({
    title: '',
    folderPath: '',
    description: '',
    tags: '',
    price: 0
  });
  const [selectedFiles, setSelectedFiles] = useState<{
    video: File | null;
    image: File | null;
  }>({
    video: null,
    image: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (type: 'video' | 'image', file: File | null) => {
    setSelectedFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  const removeFile = (type: 'video' | 'image') => {
    setSelectedFiles(prev => ({
      ...prev,
      [type]: null
    }));
    
    if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    if (type === 'image' && imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      setCreatingFolder(true);
      await filesAPI.createFolder({
        name: newFolderName.trim(),
        parentPath: newFolderParent || undefined,
        description: '',
        tags: [],
        isPublic: true
      });
      
      toast.success('Folder created successfully');
      setShowFolderModal(false);
      setNewFolderName('');
      setNewFolderParent('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!selectedFiles.video && !selectedFiles.image) {
      toast.error('Please select at least one file (video or image)');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('folderPath', formData.folderPath);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('tags', formData.tags);
      uploadFormData.append('price', formData.price.toString());

      if (selectedFiles.video) {
        uploadFormData.append('video', selectedFiles.video);
      }
      if (selectedFiles.image) {
        uploadFormData.append('image', selectedFiles.image);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await filesAPI.uploadFiles(uploadFormData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Files uploaded successfully');
      
      // Reset form
      setFormData({
        title: '',
        folderPath: '',
        description: '',
        tags: '',
        price: 0
      });
      setSelectedFiles({ video: null, image: null });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="input-field"
            placeholder="Enter file title"
            required
          />
        </div>

        {/* Folder Path */}
        <div>
          <label htmlFor="folderPath" className="block text-sm font-medium text-gray-700 mb-2">
            Folder Path
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="folderPath"
              name="folderPath"
              value={formData.folderPath}
              onChange={handleInputChange}
              className="input-field flex-1"
              placeholder="e.g., videos/tutorials"
            />
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              className="btn-outline flex items-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* File Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {selectedFiles.video ? (
                <div className="space-y-2">
                  <Video className="w-8 h-8 mx-auto text-blue-500" />
                  <p className="text-sm font-medium text-gray-900">{selectedFiles.video.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFiles.video.size)}</p>
                  <button
                    type="button"
                    onClick={() => removeFile('video')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ) : (
                <div>
                  <Video className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Select video file</p>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileSelect('video', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="btn-outline text-sm"
                  >
                    Choose Video
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {selectedFiles.image ? (
                <div className="space-y-2">
                  <Image className="w-8 h-8 mx-auto text-green-500" />
                  <p className="text-sm font-medium text-gray-900">{selectedFiles.image.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFiles.image.size)}</p>
                  <button
                    type="button"
                    onClick={() => removeFile('image')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ) : (
                <div>
                  <Image className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Select image file</p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect('image', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="btn-outline text-sm"
                  >
                    Choose Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="input-field"
            rows={3}
            placeholder="Enter file description"
          />
        </div>

        {/* Tags and Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="input-field"
              placeholder="tag1, tag2, tag3"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Price ($)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="input-field"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={uploading || (!selectedFiles.video && !selectedFiles.image)}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Files</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Folder</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newFolderName" className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  id="newFolderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input-field"
                  placeholder="Enter folder name"
                />
              </div>
              
              <div>
                <label htmlFor="newFolderParent" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Folder (optional)
                </label>
                <input
                  type="text"
                  id="newFolderParent"
                  value={newFolderParent}
                  onChange={(e) => setNewFolderParent(e.target.value)}
                  className="input-field"
                  placeholder="e.g., videos/tutorials"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="btn-secondary"
                disabled={creatingFolder}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingFolder ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    <span>Create Folder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
