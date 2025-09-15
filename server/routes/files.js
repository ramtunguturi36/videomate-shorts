import express from 'express';
import Folder from '../models/Folder.js';
import File from '../models/File.js';
import { verifyToken, requireAdmin, requireUser } from '../middleware/auth.js';
import { uploadMixed, handleUploadError } from '../middleware/upload.js';
import { uploadToR2, generateFileKey, deleteFromR2 } from '../config/cloudflareR2.js';
import { getFileType, generateUniqueFilename } from '../middleware/upload.js';

const router = express.Router();

// ==================== FOLDER MANAGEMENT ====================

// Create folder
router.post('/folders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, parentPath, description, tags, isPublic } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // Validate and normalize path
    let normalizedParentPath = '';
    if (parentPath && parentPath.trim() !== '') {
      normalizedParentPath = Folder.validatePath(parentPath);
    }

    const newPath = normalizedParentPath ? `${normalizedParentPath}/${name.trim()}` : name.trim();
    const normalizedPath = Folder.validatePath(newPath);

    // Check if folder already exists
    const existingFolder = await Folder.findOne({ path: normalizedPath });
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists at this path' });
    }

    // Check if parent folder exists (if not root)
    if (normalizedParentPath) {
      const parentFolder = await Folder.findOne({ path: normalizedParentPath });
      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder does not exist' });
      }
    }

    // Create new folder
    const folder = new Folder({
      name: name.trim(),
      path: normalizedPath,
      parentPath: normalizedParentPath || null,
      level: normalizedParentPath ? normalizedParentPath.split('/').length : 0,
      createdBy: req.admin._id,
      metadata: {
        description: description || '',
        tags: tags || [],
        isPublic: isPublic !== false
      }
    });

    await folder.save();

    // Update parent folder's children array
    if (normalizedParentPath) {
      await Folder.findOneAndUpdate(
        { path: normalizedParentPath },
        { $addToSet: { children: folder._id } }
      );
    }

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folder._id,
        name: folder.name,
        path: folder.path,
        parentPath: folder.parentPath,
        level: folder.level,
        metadata: folder.metadata,
        createdAt: folder.createdAt
      }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    if (error.message.includes('invalid characters') || error.message.includes('reserved')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create folder' });
  }
});

// Get folder tree
router.get('/folders/tree', verifyToken, async (req, res) => {
  try {
    const tree = await Folder.getFolderTree();
    res.json({ tree });
  } catch (error) {
    console.error('Get folder tree error:', error);
    res.status(500).json({ message: 'Failed to get folder tree' });
  }
});

// Get folder contents
router.get('/folders/:path(*)', verifyToken, async (req, res) => {
  try {
    const folderPath = req.params.path;
    const folder = await Folder.findOne({ path: folderPath })
      .populate('children', 'name path level metadata')
      .populate('files', 'title fileType r2Url thumbnailUrl metadata uploadInfo');

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.json({
      folder: {
        id: folder._id,
        name: folder.name,
        path: folder.path,
        parentPath: folder.parentPath,
        level: folder.level,
        metadata: folder.metadata,
        children: folder.children,
        files: folder.files,
        createdAt: folder.createdAt
      }
    });
  } catch (error) {
    console.error('Get folder contents error:', error);
    res.status(500).json({ message: 'Failed to get folder contents' });
  }
});

// Delete folder
router.delete('/folders/:path(*)', verifyToken, requireAdmin, async (req, res) => {
  try {
    const folderPath = req.params.path;
    const folder = await Folder.findOne({ path: folderPath });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Get all children folders recursively
    const allChildren = await folder.getAllChildren();
    
    // Get all files in this folder and all subfolders
    const allFolderPaths = [folderPath, ...allChildren.map(child => child.path)];
    const files = await File.find({ folderPath: { $in: allFolderPaths } });

    // Delete files from R2
    for (const file of files) {
      try {
        await deleteFromR2(file.r2Key);
      } catch (error) {
        console.error(`Failed to delete file ${file.r2Key} from R2:`, error);
      }
    }

    // Delete files from database
    await File.deleteMany({ folderPath: { $in: allFolderPaths } });

    // Delete all child folders
    await Folder.deleteMany({ path: { $in: allFolderPaths } });

    // Remove from parent's children array
    if (folder.parentPath) {
      await Folder.findOneAndUpdate(
        { path: folder.parentPath },
        { $pull: { children: folder._id } }
      );
    }

    res.json({ message: 'Folder and all contents deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
});

// ==================== FILE UPLOAD ====================

// Upload files (video + image)
router.post('/upload', verifyToken, requireAdmin, uploadMixed(), handleUploadError, async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      files: req.files,
      admin: req.admin ? req.admin.email : 'No admin'
    });
    
    const { title, folderPath, description, tags, price } = req.body;
    const videoFile = req.files?.video?.[0];
    const imageFile = req.files?.image?.[0];

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'File title is required' });
    }

    if (!videoFile && !imageFile) {
      return res.status(400).json({ message: 'At least one file (video or image) is required' });
    }

    // Validate folder path
    let normalizedFolderPath = 'root';
    if (folderPath && folderPath.trim() !== '') {
      normalizedFolderPath = Folder.validatePath(folderPath);
    }

    // Check if folder exists (skip check for root folder)
    if (normalizedFolderPath && normalizedFolderPath !== 'root') {
      const folder = await Folder.findOne({ path: normalizedFolderPath });
      if (!folder) {
        return res.status(400).json({ message: 'Folder does not exist' });
      }
    }

    const uploadedFiles = [];

    // Upload video file
    if (videoFile) {
      const videoKey = generateFileKey(normalizedFolderPath, videoFile.originalname, 'video');
      const videoUrl = await uploadToR2(videoFile.buffer, videoKey, videoFile.mimetype);

      const videoFileDoc = new File({
        title: `${title} (Video)`,
        originalName: videoFile.originalname,
        filename: generateUniqueFilename(videoFile.originalname, 'video'),
        fileType: 'video',
        mimeType: videoFile.mimetype,
        size: videoFile.size,
        folderPath: normalizedFolderPath,
        folder: normalizedFolderPath && normalizedFolderPath !== 'root' ? (await Folder.findOne({ path: normalizedFolderPath }))._id : null,
        r2Key: videoKey,
        r2Url: videoUrl,
        metadata: {
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          description: description || '',
          price: parseFloat(price) || 0,
          isPublic: true
        },
        uploadInfo: {
          uploadedBy: req.admin._id,
          uploadDate: new Date()
        },
        status: 'ready'
      });

      await videoFileDoc.save();
      uploadedFiles.push(videoFileDoc);
    }

    // Upload image file
    if (imageFile) {
      const imageKey = generateFileKey(normalizedFolderPath, imageFile.originalname, 'image');
      const imageUrl = await uploadToR2(imageFile.buffer, imageKey, imageFile.mimetype);

      const imageFileDoc = new File({
        title: `${title} (Image)`,
        originalName: imageFile.originalname,
        filename: generateUniqueFilename(imageFile.originalname, 'image'),
        fileType: 'image',
        mimeType: imageFile.mimetype,
        size: imageFile.size,
        folderPath: normalizedFolderPath,
        folder: normalizedFolderPath && normalizedFolderPath !== 'root' ? (await Folder.findOne({ path: normalizedFolderPath }))._id : null,
        r2Key: imageKey,
        r2Url: imageUrl,
        metadata: {
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          description: description || '',
          price: parseFloat(price) || 0,
          isPublic: true
        },
        uploadInfo: {
          uploadedBy: req.admin._id,
          uploadDate: new Date()
        },
        status: 'ready'
      });

      await imageFileDoc.save();
      uploadedFiles.push(imageFileDoc);
    }

    // Update folder's files array (skip for root folder)
    if (normalizedFolderPath && normalizedFolderPath !== 'root') {
      const folder = await Folder.findOne({ path: normalizedFolderPath });
      if (folder) {
        folder.files.push(...uploadedFiles.map(file => file._id));
        await folder.save();
      }
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles.map(file => ({
        id: file._id,
        title: file.title,
        fileType: file.fileType,
        r2Url: file.r2Url,
        size: file.size,
        metadata: file.metadata
      }))
    });
  } catch (error) {
    console.error('Upload files error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
});

// ==================== FILE MANAGEMENT ====================

// Get files by folder
router.get('/files', verifyToken, async (req, res) => {
  try {
    const { folderPath, fileType, tags, priceMin, priceMax, page = 1, limit = 20 } = req.query;
    
    const options = {
      fileType,
      tags: tags ? tags.split(',') : undefined,
      priceRange: (priceMin || priceMax) ? {
        min: priceMin ? parseFloat(priceMin) : 0,
        max: priceMax ? parseFloat(priceMax) : Infinity
      } : undefined,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const files = await File.getFilesByFolder(folderPath, options);
    const total = await File.countDocuments({ 
      folderPath, 
      status: 'ready',
      ...(fileType && { fileType }),
      ...(tags && { 'metadata.tags': { $in: tags.split(',') } })
    });

    res.json({
      files,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Failed to get files' });
  }
});

// Search files
router.get('/files/search', verifyToken, async (req, res) => {
  try {
    const { q, fileType, folderPath, page = 1, limit = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const options = {
      fileType,
      folderPath,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const files = await File.searchFiles(q.trim(), options);
    const total = await File.countDocuments({
      status: 'ready',
      $or: [
        { title: { $regex: q.trim(), $options: 'i' } },
        { 'metadata.description': { $regex: q.trim(), $options: 'i' } },
        { 'metadata.tags': { $in: [new RegExp(q.trim(), 'i')] } }
      ],
      ...(fileType && { fileType }),
      ...(folderPath && { folderPath: { $regex: `^${folderPath}` } })
    });

    res.json({
      files,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ message: 'Failed to search files' });
  }
});

// Get file details
router.get('/files/:id', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('uploadInfo.uploadedBy', 'name email')
      .populate('folder', 'name path');

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Increment view count
    await file.incrementViewCount();

    res.json({ file });
  } catch (error) {
    console.error('Get file details error:', error);
    res.status(500).json({ message: 'Failed to get file details' });
  }
});

// Delete file
router.delete('/files/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete from R2
    try {
      await deleteFromR2(file.r2Key);
    } catch (error) {
      console.error(`Failed to delete file ${file.r2Key} from R2:`, error);
    }

    // Remove from folder's files array
    if (file.folder) {
      await Folder.findByIdAndUpdate(
        file.folder,
        { $pull: { files: file._id } }
      );
    }

    // Delete from database
    await File.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

export default router;
