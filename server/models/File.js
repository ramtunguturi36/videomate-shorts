import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'File title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['video', 'image']
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  folderPath: {
    type: String,
    required: true,
    index: true,
    default: 'root'
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: false,
    default: null
  },
  r2Key: {
    type: String,
    required: true,
    unique: true
  },
  r2Url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  metadata: {
    duration: {
      type: Number, // For videos, in seconds
      default: null
    },
    dimensions: {
      width: Number,
      height: Number
    },
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  uploadInfo: {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
fileSchema.index({ folderPath: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ 'metadata.tags': 1 });
fileSchema.index({ 'metadata.price': 1 });
fileSchema.index({ 'uploadInfo.uploadedBy': 1 });
fileSchema.index({ status: 1 });

// Virtual for getting file extension
fileSchema.virtual('extension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Virtual for getting formatted file size
fileSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for getting formatted duration (for videos)
fileSchema.virtual('formattedDuration').get(function() {
  if (this.fileType !== 'video' || !this.metadata.duration) return null;
  
  const duration = this.metadata.duration;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
});

// Method to increment view count
fileSchema.methods.incrementViewCount = function() {
  this.metadata.viewCount += 1;
  return this.save();
};

// Method to increment download count
fileSchema.methods.incrementDownloadCount = function() {
  this.metadata.downloadCount += 1;
  return this.save();
};

// Static method to get files by folder
fileSchema.statics.getFilesByFolder = function(folderPath, options = {}) {
  const query = { folderPath, status: 'ready' };
  
  if (options.fileType) {
    query.fileType = options.fileType;
  }
  
  if (options.tags && options.tags.length > 0) {
    query['metadata.tags'] = { $in: options.tags };
  }
  
  if (options.priceRange) {
    query['metadata.price'] = {
      $gte: options.priceRange.min || 0,
      $lte: options.priceRange.max || Infinity
    };
  }
  
  return this.find(query)
    .populate('uploadInfo.uploadedBy', 'name email')
    .sort(options.sort || { 'uploadInfo.uploadDate': -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to search files
fileSchema.statics.searchFiles = function(searchTerm, options = {}) {
  const query = {
    status: 'ready',
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { 'metadata.description': { $regex: searchTerm, $options: 'i' } },
      { 'metadata.tags': { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  if (options.fileType) {
    query.fileType = options.fileType;
  }
  
  if (options.folderPath) {
    query.folderPath = { $regex: `^${options.folderPath}` };
  }
  
  return this.find(query)
    .populate('uploadInfo.uploadedBy', 'name email')
    .sort(options.sort || { 'uploadInfo.uploadDate': -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

export default mongoose.model('File', fileSchema);
