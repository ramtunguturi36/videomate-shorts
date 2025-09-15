import React, { useState, useEffect } from 'react';
import { filesAPI } from '../../services/api';
import { Folder, File } from '../../types/files';
import FolderTree from './FolderTree';
import FileViewer from './FileViewer';
import FileUpload from './FileUpload';
import { 
  Folder as FolderIcon, 
  Upload, 
  Search, 
  Filter,
  Grid,
  List,
  Plus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileManagerProps {
  isAdmin?: boolean;
  onFileSelect?: (file: File) => void;
}

const FileManager: React.FC<FileManagerProps> = ({ isAdmin = false, onFileSelect }) => {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (selectedFolder) {
      loadFolderFiles();
    }
  }, [selectedFolder, currentPage, filterType]);

  const loadFolderFiles = async () => {
    if (!selectedFolder) return;

    try {
      setLoading(true);
      const response = await filesAPI.getFiles({
        folderPath: selectedFolder.path,
        fileType: filterType === 'all' ? undefined : filterType,
        page: currentPage,
        limit: 20
      });
      
      setFiles(response.files);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (selectedFolder) {
        loadFolderFiles();
      }
      return;
    }

    try {
      setLoading(true);
      const response = await filesAPI.searchFiles({
        q: searchQuery,
        fileType: filterType === 'all' ? undefined : filterType,
        folderPath: selectedFolder?.path,
        page: currentPage,
        limit: 20
      });
      
      setFiles(response.files);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolder(folder);
    setSelectedFile(null);
    setCurrentPage(1);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    if (selectedFolder) {
      loadFolderFiles();
    }
  };

  const renderFileCard = (file: File) => (
    <div
      key={file.id}
      className="card p-4 cursor-pointer hover:shadow-medium transition-shadow"
      onClick={() => handleFileSelect(file)}
    >
      <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {file.fileType === 'video' ? (
          <div className="relative w-full h-full">
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-gray-600 text-lg">🎥</span>
                  </div>
                  <p className="text-xs text-gray-500">Video</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">▶</span>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={file.r2Url}
            alt={file.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 truncate">{file.title}</h3>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="capitalize">{file.fileType}</span>
          {file.metadata.price > 0 && (
            <span className="text-green-600 font-medium">${file.metadata.price}</span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>{file.metadata.viewCount} views</span>
          <span>•</span>
          <span>{new Date(file.uploadInfo.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );

  const renderFileList = (file: File) => (
    <div
      key={file.id}
      className="flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
      onClick={() => handleFileSelect(file)}
    >
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
        {file.fileType === 'video' ? (
          <span className="text-gray-600 text-lg">🎥</span>
        ) : (
          <span className="text-gray-600 text-lg">🖼️</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{file.title}</h3>
        <p className="text-sm text-gray-500 truncate">{file.metadata.description}</p>
        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
          <span className="capitalize">{file.fileType}</span>
          <span>{file.metadata.viewCount} views</span>
          <span>{new Date(file.uploadInfo.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="text-right">
        {file.metadata.price > 0 && (
          <div className="text-green-600 font-medium">${file.metadata.price}</div>
        )}
        <div className="text-xs text-gray-400">
          {file.uploadInfo.uploadedBy.name}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar - Folder Tree */}
      <div className="w-80 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
            {isAdmin && (
              <button
                onClick={() => setShowUpload(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload</span>
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field pl-10"
            />
          </div>
        </div>
        
        <div className="p-4">
          <FolderTree
            onFolderSelect={handleFolderSelect}
            onFileSelect={handleFileSelect}
            selectedFolderPath={selectedFolder?.path}
            showFiles={false}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedFolder ? selectedFolder.name : 'Select a folder'}
              </h2>
              {selectedFolder && (
                <p className="text-sm text-gray-500">{selectedFolder.path}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="input-field"
              >
                <option value="all">All Files</option>
                <option value="video">Videos</option>
                <option value="image">Images</option>
              </select>
              
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
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : selectedFolder ? (
            <>
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No files found in this folder</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {files.map(renderFileCard)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map(renderFileList)}
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
            </>
          ) : (
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a folder</h3>
              <p className="text-gray-500">Choose a folder from the sidebar to view its contents</p>
            </div>
          )}
        </div>
      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-auto">
            <FileViewer
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
              onFileSelect={onFileSelect}
            />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-auto">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
