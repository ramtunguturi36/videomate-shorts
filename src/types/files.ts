export interface Folder {
  id: string;
  name: string;
  path: string;
  parentPath: string | null;
  level: number;
  children: Folder[];
  files: File[];
  isRoot: boolean;
  createdBy: string;
  metadata: {
    description: string;
    tags: string[];
    isPublic: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: string;
  title: string;
  originalName: string;
  filename: string;
  fileType: 'video' | 'image';
  mimeType: string;
  size: number;
  folderPath: string;
  folder: string;
  r2Key: string;
  r2Url: string;
  thumbnailUrl: string | null;
  metadata: {
    duration: number | null;
    dimensions: {
      width: number;
      height: number;
    } | null;
    tags: string[];
    description: string;
    price: number;
    isPublic: boolean;
    downloadCount: number;
    viewCount: number;
  };
  uploadInfo: {
    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
    uploadDate: Date;
    lastModified: Date;
  };
  status: 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUploadData {
  title: string;
  folderPath: string;
  description?: string;
  tags?: string;
  price?: number;
}

export interface FolderCreateData {
  name: string;
  parentPath?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface FileSearchOptions {
  q?: string;
  fileType?: 'video' | 'image';
  folderPath?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
}

export interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  level: number;
  children?: FileTreeItem[];
  fileType?: 'video' | 'image';
  r2Url?: string;
  thumbnailUrl?: string;
  metadata?: File['metadata'];
  isExpanded?: boolean;
}
