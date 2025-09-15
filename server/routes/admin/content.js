import express from 'express';
import { verifyToken, requireAdmin } from '../auth.js';
import VideoFile from '../../models/VideoFile.js';
import ImageFile from '../../models/ImageFile.js';
import Purchase from '../../models/Purchase.js';
import { deleteFromR2, uploadToR2 } from '../../config/cloudflareR2.js';
import { contentLogger } from '../../utils/logger.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// ==================== VIDEO MANAGEMENT ====================

// Get all videos with pagination and filters
router.get('/videos', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      folder,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (folder) query.folder = folder;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { filename: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get videos with pagination
    const videos = await VideoFile.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await VideoFile.countDocuments(query);

    // Get folder list
    const folders = await VideoFile.distinct('folder');

    res.json({
      message: 'Videos retrieved successfully',
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        filename: video.filename,
        description: video.description,
        folder: video.folder,
        fileSize: video.fileSize,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        r2Url: video.r2Url,
        isActive: video.isActive,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      folders
    });

  } catch (error) {
    console.error('Error getting videos:', error);
    res.status(500).json({
      message: 'Failed to get videos',
      error: error.message
    });
  }
});

// Get video details
router.get('/videos/:videoId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await VideoFile.findById(videoId);
    if (!video) {
      return res.status(404).json({
        message: 'Video not found'
      });
    }

    // Get purchase statistics for this video
    const purchaseStats = await Purchase.aggregate([
      { $match: { videoId: video._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      message: 'Video details retrieved successfully',
      video: {
        id: video._id,
        title: video.title,
        filename: video.filename,
        description: video.description,
        folder: video.folder,
        fileSize: video.fileSize,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        r2Url: video.r2Url,
        isActive: video.isActive,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        purchaseStats: purchaseStats[0] || {
          totalPurchases: 0,
          totalRevenue: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting video details:', error);
    res.status(500).json({
      message: 'Failed to get video details',
      error: error.message
    });
  }
});

// Update video
router.put('/videos/:videoId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, folder, isActive } = req.body;
    const adminId = req.admin._id;

    const video = await VideoFile.findById(videoId);
    if (!video) {
      return res.status(404).json({
        message: 'Video not found'
      });
    }

    // Update video
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (folder !== undefined) updateData.folder = folder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedVideo = await VideoFile.findByIdAndUpdate(
      videoId,
      updateData,
      { new: true }
    );

    // Log content update
    contentLogger.logContentUpdated({
      contentId: video._id,
      contentType: 'video',
      adminId,
      changes: updateData,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Video updated successfully',
      video: {
        id: updatedVideo._id,
        title: updatedVideo.title,
        filename: updatedVideo.filename,
        description: updatedVideo.description,
        folder: updatedVideo.folder,
        isActive: updatedVideo.isActive,
        updatedAt: updatedVideo.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      message: 'Failed to update video',
      error: error.message
    });
  }
});

// Delete video
router.delete('/videos/:videoId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;
    const adminId = req.admin._id;

    const video = await VideoFile.findById(videoId);
    if (!video) {
      return res.status(404).json({
        message: 'Video not found'
      });
    }

    // Check if video has purchases
    const purchaseCount = await Purchase.countDocuments({ videoId: video._id });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete video with existing purchases. Consider deactivating instead.'
      });
    }

    // Delete from R2
    try {
      const r2Key = video.r2Url.split('/').pop();
      await deleteFromR2(r2Key);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database
    await VideoFile.findByIdAndDelete(videoId);

    // Log content deletion
    contentLogger.logContentDeleted({
      contentId: video._id,
      contentType: 'video',
      adminId,
      filename: video.filename,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      message: 'Failed to delete video',
      error: error.message
    });
  }
});

// Upload new video
router.post('/videos/upload', verifyToken, requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const { title, description, folder } = req.body;
    const adminId = req.admin._id;

    if (!req.file) {
      return res.status(400).json({
        message: 'No video file provided'
      });
    }

    // Upload to R2
    const r2Key = `videos/${Date.now()}-${req.file.originalname}`;
    const r2Url = await uploadToR2(req.file.buffer, r2Key, req.file.mimetype);

    // Create video record
    const video = new VideoFile({
      title: title || req.file.originalname,
      filename: req.file.originalname,
      description: description || '',
      folder: folder || 'default',
      fileSize: req.file.size,
      r2Url: r2Url,
      isActive: true
    });

    await video.save();

    // Log content creation
    contentLogger.logContentCreated({
      contentId: video._id,
      contentType: 'video',
      adminId,
      filename: video.filename,
      fileSize: video.fileSize,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        id: video._id,
        title: video.title,
        filename: video.filename,
        description: video.description,
        folder: video.folder,
        fileSize: video.fileSize,
        r2Url: video.r2Url,
        isActive: video.isActive,
        createdAt: video.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({
      message: 'Failed to upload video',
      error: error.message
    });
  }
});

// ==================== IMAGE MANAGEMENT ====================

// Get all images with pagination and filters
router.get('/images', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      folder,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (folder) query.folder = folder;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { filename: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get images with pagination
    const images = await ImageFile.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await ImageFile.countDocuments(query);

    // Get folder list
    const folders = await ImageFile.distinct('folder');

    res.json({
      message: 'Images retrieved successfully',
      images: images.map(image => ({
        id: image._id,
        title: image.title,
        filename: image.filename,
        description: image.description,
        folder: image.folder,
        fileSize: image.fileSize,
        dimensions: image.dimensions,
        r2Url: image.r2Url,
        isActive: image.isActive,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      folders
    });

  } catch (error) {
    console.error('Error getting images:', error);
    res.status(500).json({
      message: 'Failed to get images',
      error: error.message
    });
  }
});

// Get image details
router.get('/images/:imageId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await ImageFile.findById(imageId);
    if (!image) {
      return res.status(404).json({
        message: 'Image not found'
      });
    }

    // Get purchase statistics for this image
    const purchaseStats = await Purchase.aggregate([
      { $match: { imageId: image._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      message: 'Image details retrieved successfully',
      image: {
        id: image._id,
        title: image.title,
        filename: image.filename,
        description: image.description,
        folder: image.folder,
        fileSize: image.fileSize,
        dimensions: image.dimensions,
        r2Url: image.r2Url,
        isActive: image.isActive,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        purchaseStats: purchaseStats[0] || {
          totalPurchases: 0,
          totalRevenue: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting image details:', error);
    res.status(500).json({
      message: 'Failed to get image details',
      error: error.message
    });
  }
});

// Update image
router.put('/images/:imageId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { imageId } = req.params;
    const { title, description, folder, isActive } = req.body;
    const adminId = req.admin._id;

    const image = await ImageFile.findById(imageId);
    if (!image) {
      return res.status(404).json({
        message: 'Image not found'
      });
    }

    // Update image
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (folder !== undefined) updateData.folder = folder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedImage = await ImageFile.findByIdAndUpdate(
      imageId,
      updateData,
      { new: true }
    );

    // Log content update
    contentLogger.logContentUpdated({
      contentId: image._id,
      contentType: 'image',
      adminId,
      changes: updateData,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Image updated successfully',
      image: {
        id: updatedImage._id,
        title: updatedImage.title,
        filename: updatedImage.filename,
        description: updatedImage.description,
        folder: updatedImage.folder,
        isActive: updatedImage.isActive,
        updatedAt: updatedImage.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({
      message: 'Failed to update image',
      error: error.message
    });
  }
});

// Delete image
router.delete('/images/:imageId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { imageId } = req.params;
    const adminId = req.admin._id;

    const image = await ImageFile.findById(imageId);
    if (!image) {
      return res.status(404).json({
        message: 'Image not found'
      });
    }

    // Check if image has purchases
    const purchaseCount = await Purchase.countDocuments({ imageId: image._id });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete image with existing purchases. Consider deactivating instead.'
      });
    }

    // Delete from R2
    try {
      const r2Key = image.r2Url.split('/').pop();
      await deleteFromR2(r2Key);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database
    await ImageFile.findByIdAndDelete(imageId);

    // Log content deletion
    contentLogger.logContentDeleted({
      contentId: image._id,
      contentType: 'image',
      adminId,
      filename: image.filename,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// Upload new image
router.post('/images/upload', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, folder } = req.body;
    const adminId = req.admin._id;

    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided'
      });
    }

    // Upload to R2
    const r2Key = `images/${Date.now()}-${req.file.originalname}`;
    const r2Url = await uploadToR2(req.file.buffer, r2Key, req.file.mimetype);

    // Create image record
    const image = new ImageFile({
      title: title || req.file.originalname,
      filename: req.file.originalname,
      description: description || '',
      folder: folder || 'default',
      fileSize: req.file.size,
      r2Url: r2Url,
      isActive: true
    });

    await image.save();

    // Log content creation
    contentLogger.logContentCreated({
      contentId: image._id,
      contentType: 'image',
      adminId,
      filename: image.filename,
      fileSize: image.fileSize,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        id: image._id,
        title: image.title,
        filename: image.filename,
        description: image.description,
        folder: image.folder,
        fileSize: image.fileSize,
        r2Url: image.r2Url,
        isActive: image.isActive,
        createdAt: image.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// ==================== FOLDER MANAGEMENT ====================

// Get all folders
router.get('/folders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [videoFolders, imageFolders] = await Promise.all([
      VideoFile.distinct('folder'),
      ImageFile.distinct('folder')
    ]);

    // Combine and deduplicate folders
    const allFolders = [...new Set([...videoFolders, ...imageFolders])];

    // Get folder statistics
    const folderStats = await Promise.all(
      allFolders.map(async (folder) => {
        const [videoCount, imageCount, videoSize, imageSize] = await Promise.all([
          VideoFile.countDocuments({ folder }),
          ImageFile.countDocuments({ folder }),
          VideoFile.aggregate([
            { $match: { folder } },
            { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
          ]),
          ImageFile.aggregate([
            { $match: { folder } },
            { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
          ])
        ]);

        return {
          name: folder,
          videoCount,
          imageCount,
          totalFiles: videoCount + imageCount,
          totalSize: (videoSize[0]?.totalSize || 0) + (imageSize[0]?.totalSize || 0)
        };
      })
    );

    res.json({
      message: 'Folders retrieved successfully',
      folders: folderStats.sort((a, b) => b.totalFiles - a.totalFiles)
    });

  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({
      message: 'Failed to get folders',
      error: error.message
    });
  }
});

// Create new folder
router.post('/folders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const adminId = req.admin._id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        message: 'Folder name is required'
      });
    }

    const folderName = name.trim();

    // Check if folder already exists
    const existingVideo = await VideoFile.findOne({ folder: folderName });
    const existingImage = await ImageFile.findOne({ folder: folderName });

    if (existingVideo || existingImage) {
      return res.status(400).json({
        message: 'Folder already exists'
      });
    }

    // Log folder creation
    contentLogger.logFolderCreated({
      folderName,
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        name: folderName,
        videoCount: 0,
        imageCount: 0,
        totalFiles: 0,
        totalSize: 0
      }
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      message: 'Failed to create folder',
      error: error.message
    });
  }
});

// Move content to different folder
router.put('/folders/move', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { contentIds, contentType, targetFolder } = req.body;
    const adminId = req.admin._id;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        message: 'Content IDs are required'
      });
    }

    if (!contentType || !['video', 'image'].includes(contentType)) {
      return res.status(400).json({
        message: 'Content type must be video or image'
      });
    }

    if (!targetFolder || targetFolder.trim() === '') {
      return res.status(400).json({
        message: 'Target folder is required'
      });
    }

    const Model = contentType === 'video' ? VideoFile : ImageFile;
    const folderName = targetFolder.trim();

    // Update content
    const result = await Model.updateMany(
      { _id: { $in: contentIds } },
      { folder: folderName }
    );

    // Log folder move
    contentLogger.logContentMoved({
      contentIds,
      contentType,
      targetFolder: folderName,
      adminId,
      movedCount: result.modifiedCount,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: `Successfully moved ${result.modifiedCount} ${contentType}(s) to ${folderName}`,
      movedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error moving content:', error);
    res.status(500).json({
      message: 'Failed to move content',
      error: error.message
    });
  }
});

// Delete folder (only if empty)
router.delete('/folders/:folderName', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { folderName } = req.params;
    const adminId = req.admin._id;

    // Check if folder has content
    const [videoCount, imageCount] = await Promise.all([
      VideoFile.countDocuments({ folder: folderName }),
      ImageFile.countDocuments({ folder: folderName })
    ]);

    if (videoCount > 0 || imageCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete folder with content. Move or delete content first.'
      });
    }

    // Log folder deletion
    contentLogger.logFolderDeleted({
      folderName,
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      message: 'Failed to delete folder',
      error: error.message
    });
  }
});

export default router;
