import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
  
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Middleware for single file upload
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Middleware for multiple files upload
export const uploadMultiple = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for mixed file types (video + image)
export const uploadMixed = () => {
  return upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]);
};

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 500MB.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'Too many files. Maximum is 10 files per request.' 
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'Unexpected file field.' 
      });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({ 
      message: error.message 
    });
  }
  
  next(error);
};

// Utility function to get file type from mimetype
export const getFileType = (mimetype) => {
  if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('image/')) {
    return 'image';
  }
  return 'unknown';
};

// Utility function to generate unique filename
export const generateUniqueFilename = (originalName, fileType) => {
  const timestamp = Date.now();
  const randomId = uuidv4().substring(0, 8);
  const extension = originalName.split('.').pop();
  
  return `${fileType}_${timestamp}_${randomId}.${extension}`;
};

export default upload;
