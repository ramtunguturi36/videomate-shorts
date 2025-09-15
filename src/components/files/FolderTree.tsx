import React, { useState, useEffect } from 'react';
import { filesAPI } from '../../services/api';
import { Folder, File } from '../../types/files';
import { 
  Folder as FolderIcon, 
  FolderOpen, 
  File as FileIcon, 
  Video, 
  Image,
  ChevronRight,
  ChevronDown,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderTreeProps {
  onFileSelect?: (file: File) => void;
  onFolderSelect?: (folder: Folder) => void;
  selectedFileId?: string;
  selectedFolderPath?: string;
  showFiles?: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  onFileSelect,
  onFolderSelect,
  selectedFileId,
  selectedFolderPath,
  showFiles = true
}) => {
  const [tree, setTree] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFolderTree();
  }, []);

  const normalizeFolder = (folder: Folder): Folder => {
    return {
      ...folder,
      children: (folder.children || []).map(child => normalizeFolder(child)),
      files: folder.files || []
    };
  };

  const fetchFolderTree = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.getFolderTree();
      // Ensure all folders have proper children and files arrays
      const normalizedTree = response.tree.map(folder => normalizeFolder(folder));
      setTree(normalizedTree);
    } catch (error) {
      toast.error('Failed to load folder tree');
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
        
        // Update tree with loaded contents
        const normalizedFolder = normalizeFolder(response.folder);
        setTree(prev => updateTreeWithContents(prev, folderPath, normalizedFolder));
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

  const updateTreeWithContents = (tree: Folder[], targetPath: string, updatedFolder: Folder): Folder[] => {
    return tree.map(folder => {
      if (folder.path === targetPath) {
        return { ...folder, ...updatedFolder };
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateTreeWithContents(folder.children, targetPath, updatedFolder)
        };
      }
      return folder;
    });
  };

  const handleFolderClick = (folder: Folder) => {
    if (onFolderSelect) {
      onFolderSelect(folder);
    }
  };

  const handleFileClick = (file: File) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const renderFileIcon = (file: File) => {
    if (file.fileType === 'video') {
      return <Video className="w-4 h-4 text-blue-500" />;
    } else if (file.fileType === 'image') {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    return <FileIcon className="w-4 h-4 text-gray-500" />;
  };

  const renderTreeItem = (item: Folder, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(item.path);
    const isLoading = loadingFolders.has(item.path);
    const isSelected = selectedFolderPath === item.path;

    return (
      <div key={item.path} className="select-none">
        {/* Folder */}
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-primary-100 text-primary-700' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleFolderClick(item)}
        >
          <button
            className="flex items-center justify-center w-4 h-4 mr-2"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(item.path, isExpanded);
            }}
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (item.children && item.children.length > 0) || showFiles ? (
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
          
          <span className="text-sm truncate">{item.name}</span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div>
            {/* Child folders */}
            {item.children && item.children.map(child => renderTreeItem(child, level + 1))}
            
            {/* Files */}
            {showFiles && item.files && item.files.length > 0 && (
              <div>
                {item.files.map((file: File) => (
                  <div
                    key={file.id}
                    className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedFileId === file.id ? 'bg-primary-100 text-primary-700' : ''
                    }`}
                    style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="w-4 h-4 mr-2" />
                    {renderFileIcon(file)}
                    <span className="text-sm ml-2 truncate">{file.title}</span>
                    {file.metadata.price > 0 && (
                      <span className="text-xs ml-auto text-green-600 font-medium">
                        ${file.metadata.price}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
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

  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No folders found</p>
      </div>
    );
  }

  return (
    <div className="folder-tree">
      {tree.map(folder => renderTreeItem(folder))}
    </div>
  );
};

export default FolderTree;
