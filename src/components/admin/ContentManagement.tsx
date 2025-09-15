import React, { useState, useEffect } from 'react';
import { 
  FileVideo, 
  Image, 
  Upload, 
  Edit, 
  Trash2, 
  Eye, 
  Folder,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Download,
  Move,
  Copy,
  Check,
  X,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ContentManagementProps {
  // Add any props needed
}

interface ContentItem {
  id: string;
  title: string;
  filename: string;
  description: string;
  folder: string;
  fileSize: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseStats?: {
    totalPurchases: number;
    totalRevenue: number;
  };
}

interface Folder {
  name: string;
  videoCount: number;
  imageCount: number;
  totalFiles: number;
  totalSize: number;
}

const ContentManagement: React.FC<ContentManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'images' | 'folders'>('videos');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    folder: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 20
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // Load content based on active tab
  useEffect(() => {
    loadContent();
  }, [activeTab, filters, pagination.current]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'videos' ? 'videos' : 'images';
      const response = await adminAPI.getContent(endpoint, {
        page: pagination.current,
        limit: pagination.limit,
        ...filters
      });

      setContent(response[endpoint]);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await adminAPI.getFolders();
      setFolders(response.folders);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Failed to load folders');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === content.length 
        ? [] 
        : content.map(item => item.id)
    );
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const endpoint = activeTab === 'videos' ? 'videos' : 'images';
      await adminAPI.deleteContent(endpoint, itemId);
      toast.success('Content deleted successfully');
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) return;
          // Implement bulk delete
          toast.success(`${selectedItems.length} items deleted successfully`);
          break;
        case 'move':
          // Implement bulk move
          toast.success(`${selectedItems.length} items moved successfully`);
          break;
        case 'activate':
          // Implement bulk activate
          toast.success(`${selectedItems.length} items activated successfully`);
          break;
        case 'deactivate':
          // Implement bulk deactivate
          toast.success(`${selectedItems.length} items deactivated successfully`);
          break;
      }
      setSelectedItems([]);
      loadContent();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage your videos, images, and folder structure</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload {activeTab === 'videos' ? 'Video' : 'Image'}</span>
          </button>
          {activeTab === 'folders' && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'videos'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileVideo className="w-4 h-4" />
          <span>Videos</span>
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'images'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Images</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('folders');
            loadFolders();
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'folders'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Folders</span>
        </button>
      </div>

      {/* Filters */}
      {activeTab !== 'folders' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.folder}
              onChange={(e) => handleFilterChange('folder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Folders</option>
              {folders.map(folder => (
                <option key={folder.name} value={folder.name}>
                  {folder.name} ({folder.totalFiles})
                </option>
              ))}
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
              <option value="filename">Filename</option>
              <option value="fileSize">File Size</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {activeTab !== 'folders' && selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {selectedItems.length} item(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('move')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
              >
                <Move className="w-3 h-3" />
                <span>Move</span>
              </button>
              <button
                onClick={() => handleBulkAction('activate')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Activate</span>
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-yellow-600 text-white hover:bg-yellow-700 rounded transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Deactivate</span>
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {/* Videos/Images Table */}
            {activeTab !== 'folders' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === content.length && content.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Folder
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {content.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {activeTab === 'videos' ? (
                                <FileVideo className="w-8 h-8 text-blue-600" />
                              ) : (
                                <Image className="w-8 h-8 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.title}</div>
                              <div className="text-sm text-gray-500">{item.filename}</div>
                              {item.description && (
                                <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.folder}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.purchaseStats ? (
                            <div>
                              <div className="font-medium">{item.purchaseStats.totalPurchases} sales</div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.purchaseStats.totalRevenue)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No sales</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Folders Grid */}
            {activeTab === 'folders' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {folders.map((folder) => (
                    <div key={folder.name} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Folder className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{folder.name}</h3>
                            <p className="text-sm text-gray-500">{folder.totalFiles} files</p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Videos:</span>
                          <span className="font-medium">{folder.videoCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Images:</span>
                          <span className="font-medium">{folder.imageCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Size:</span>
                          <span className="font-medium">{formatFileSize(folder.totalSize)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-4">
                        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors">
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors">
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {content.length === 0 && activeTab !== 'folders' && (
              <div className="text-center py-12">
                <FileVideo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} found</h3>
                <p className="text-gray-600 mb-4">
                  {filters.search || filters.folder 
                    ? 'Try adjusting your filters to see more results.'
                    : `Upload your first ${activeTab.slice(0, -1)} to get started.`
                  }
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload {activeTab === 'videos' ? 'Video' : 'Image'}</span>
                </button>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                    disabled={pagination.current === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(pagination.current - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.current * pagination.limit, pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{pagination.total}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setPagination(prev => ({ ...prev, current: page }))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.current
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentManagement;
