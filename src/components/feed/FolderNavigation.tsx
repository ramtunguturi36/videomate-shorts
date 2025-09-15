import React, { useState, useEffect } from 'react';
import { filesAPI } from '../../services/api';
import { Folder } from '../../types/files';
import { 
  Folder as FolderIcon, 
  FolderOpen, 
  ChevronRight,
  ChevronDown,
  Loader,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderNavigationProps {
  onFolderSelect: (folderPath: string | null) => void;
  selectedFolderPath?: string | null;
}

const FolderNavigation: React.FC<FolderNavigationProps> = ({
  onFolderSelect,
  selectedFolderPath
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFolderTree();
  }, []);

  const fetchFolderTree = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.getFolderTree();
      setFolders(response.tree);
    } catch (error) {
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = async (folderPath: string, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderPath);
        return newSet;
      });
    } else {
      setExpandedFolders(prev => new Set(prev).add(folderPath));
      
      // Load folder contents if not already loaded
      try {
        setLoadingFolders(prev => new Set(prev).add(folderPath));
        const response = await filesAPI.getFolderContents(folderPath);
        
        // Update folders with loaded contents
        setFolders(prev => updateFoldersWithContents(prev, folderPath, response.folder));
      } catch (error) {
        toast.error('Failed to load folder contents');
      } finally {
        setLoadingFolders(prev => {
          const newSet = new Set(prev);
          newSet.delete(folderPath);
          return newSet;
        });
      }
    }
  };

  const updateFoldersWithContents = (folders: Folder[], targetPath: string, updatedFolder: Folder): Folder[] => {
    return folders.map(folder => {
      if (folder.path === targetPath) {
        return { ...folder, ...updatedFolder };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFoldersWithContents(folder.children, targetPath, updatedFolder)
        };
      }
      return folder;
    });
  };

  const handleFolderClick = (folderPath: string | null) => {
    onFolderSelect(folderPath);
  };

  const renderFolderItem = (folder: Folder, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(folder.path);
    const isLoading = loadingFolders.has(folder.path);
    const isSelected = selectedFolderPath === folder.path;

    return (
      <div key={folder.path} className="select-none">
        {/* Folder */}
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
            isSelected ? 'bg-primary-100 text-primary-700 border border-primary-200' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleFolderClick(folder.path)}
        >
          <button
            className="flex items-center justify-center w-4 h-4 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.path, isExpanded);
            }}
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (folder.children && folder.children.length > 0) ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            ) : (
              <div className="w-3 h-3" />
            )}
          </button>
          
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-primary-600" />
          ) : (
            <FolderIcon className="w-4 h-4 mr-2 text-primary-600" />
          )}
          
          <span className="text-sm font-medium truncate">{folder.name}</span>
          
          {folder.files && folder.files.length > 0 && (
            <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {folder.files.length}
            </span>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && folder.children && folder.children.length > 0 && (
          <div>
            {folder.children.map(child => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Folders</h3>
        <button
          onClick={() => handleFolderClick(null)}
          className={`w-full flex items-center py-2 px-3 rounded-lg transition-colors ${
            selectedFolderPath === null 
              ? 'bg-primary-100 text-primary-700 border border-primary-200' 
              : 'hover:bg-gray-100'
          }`}
        >
          <Home className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">All Videos</span>
        </button>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {folders.length === 0 ? (
          <div className="text-center py-8">
            <FolderIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No folders found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {folders.map(folder => renderFolderItem(folder))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Select a folder to view videos
        </p>
      </div>
    </div>
  );
};

export default FolderNavigation;
