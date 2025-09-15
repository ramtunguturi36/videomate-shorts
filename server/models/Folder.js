import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters']
  },
  path: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  parentPath: {
    type: String,
    default: null,
    index: true
  },
  level: {
    type: Number,
    required: true,
    default: 0
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }],
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  isRoot: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  metadata: {
    description: String,
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient path-based queries
folderSchema.index({ path: 1 });
folderSchema.index({ parentPath: 1 });
folderSchema.index({ level: 1 });

// Virtual for getting full folder structure
folderSchema.virtual('fullPath').get(function() {
  return this.path;
});

// Method to get all children recursively
folderSchema.methods.getAllChildren = async function() {
  const children = await this.constructor.find({ parentPath: this.path });
  let allChildren = [...children];
  
  for (const child of children) {
    const grandChildren = await child.getAllChildren();
    allChildren = allChildren.concat(grandChildren);
  }
  
  return allChildren;
};

// Method to get folder tree structure
folderSchema.statics.getFolderTree = async function() {
  const folders = await this.find().populate('files').sort({ path: 1 });
  
  const buildTree = (parentPath = null) => {
    return folders
      .filter(folder => folder.parentPath === parentPath)
      .map(folder => ({
        ...folder.toObject(),
        children: buildTree(folder.path)
      }));
  };
  
  return buildTree();
};

// Method to validate folder path
folderSchema.statics.validatePath = function(path) {
  // Remove leading/trailing slashes and normalize
  const normalizedPath = path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(normalizedPath)) {
    throw new Error('Folder path contains invalid characters');
  }
  
  // Check for reserved names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const pathParts = normalizedPath.split('/');
  
  for (const part of pathParts) {
    if (reservedNames.includes(part.toUpperCase())) {
      throw new Error(`Folder name "${part}" is reserved`);
    }
  }
  
  return normalizedPath;
};

export default mongoose.model('Folder', folderSchema);
