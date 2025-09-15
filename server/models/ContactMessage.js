import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  // Basic Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Allow anonymous messages
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['general', 'support', 'feedback', 'bug_report', 'feature_request', 'business', 'other'],
    required: true,
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'in_progress', 'responded', 'resolved', 'closed'],
    default: 'new'
  },

  // Response Information
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  response: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false // For FAQ or public responses
  },

  // Contact Information
  phone: {
    type: String,
    trim: true,
    maxlength: 20,
    default: null
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'both'],
    default: 'email'
  },

  // Metadata
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  },
  source: {
    type: String,
    enum: ['contact_form', 'support_page', 'help_center', 'email', 'phone', 'other'],
    default: 'contact_form'
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Follow-up Information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date,
    default: null
  },
  followUpNotes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },

  // Audit Trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'status_changed', 'responded', 'assigned', 'resolved', 'closed', 'reopened'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'auditLog.performedByType',
      required: true
    },
    performedByType: {
      type: String,
      enum: ['User', 'Admin', 'System'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      trim: true
    },
    oldValue: {
      type: String,
      default: null
    },
    newValue: {
      type: String,
      default: null
    }
  }],

  // Internal Notes
  internalNotes: [{
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ category: 1 });
contactMessageSchema.index({ priority: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ userId: 1 });
contactMessageSchema.index({ respondedBy: 1 });
contactMessageSchema.index({ followUpRequired: 1, followUpDate: 1 });

// Virtual for formatted priority
contactMessageSchema.virtual('formattedPriority').get(function() {
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  return priorityMap[this.priority] || 'Medium';
});

// Virtual for formatted status
contactMessageSchema.virtual('formattedStatus').get(function() {
  const statusMap = {
    new: 'New',
    read: 'Read',
    in_progress: 'In Progress',
    responded: 'Responded',
    resolved: 'Resolved',
    closed: 'Closed'
  };
  return statusMap[this.status] || 'New';
});

// Virtual for time since creation
contactMessageSchema.virtual('timeSinceCreation').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
});

// Virtual for response time
contactMessageSchema.virtual('responseTime').get(function() {
  if (!this.respondedAt) return null;
  const diff = this.respondedAt - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Static method to get messages with filters
contactMessageSchema.statics.getMessagesWithFilters = function(filters = {}) {
  const query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.respondedBy) {
    query.respondedBy = filters.respondedBy;
  }
  
  if (filters.userId) {
    query.userId = filters.userId;
  }
  
  if (filters.email) {
    query.email = { $regex: filters.email, $options: 'i' };
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }
  
  if (filters.search) {
    query.$or = [
      { subject: { $regex: filters.search, $options: 'i' } },
      { message: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  if (filters.followUpRequired) {
    query.followUpRequired = filters.followUpRequired;
  }

  const options = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    sort: { createdAt: -1 }
  };

  return this.find(query)
    .populate('userId', 'name email')
    .populate('respondedBy', 'name email')
    .sort(options.sort)
    .limit(options.limit)
    .skip((options.page - 1) * options.limit);
};

// Static method to get message statistics
contactMessageSchema.statics.getMessageStats = function(filters = {}) {
  const matchStage = {};
  
  if (filters.dateFrom || filters.dateTo) {
    matchStage.createdAt = {};
    if (filters.dateFrom) {
      matchStage.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      matchStage.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        support: { $sum: { $cond: [{ $eq: ['$category', 'support'] }, 1, 0] } },
        feedback: { $sum: { $cond: [{ $eq: ['$category', 'feedback'] }, 1, 0] } },
        bugReport: { $sum: { $cond: [{ $eq: ['$category', 'bug_report'] }, 1, 0] } },
        followUpRequired: { $sum: { $cond: ['$followUpRequired', 1, 0] } }
      }
    }
  ]);
};

// Static method to get average response time
contactMessageSchema.statics.getAverageResponseTime = function(filters = {}) {
  const matchStage = {
    respondedAt: { $exists: true, $ne: null }
  };
  
  if (filters.dateFrom || filters.dateTo) {
    matchStage.createdAt = {};
    if (filters.dateFrom) {
      matchStage.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      matchStage.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $project: {
        responseTimeMs: {
          $subtract: ['$respondedAt', '$createdAt']
        }
      }
    },
    {
      $group: {
        _id: null,
        averageResponseTimeMs: { $avg: '$responseTimeMs' },
        minResponseTimeMs: { $min: '$responseTimeMs' },
        maxResponseTimeMs: { $max: '$responseTimeMs' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to add audit log entry
contactMessageSchema.methods.addAuditLog = function(action, performedBy, performedByType, details = '', oldValue = null, newValue = null) {
  this.auditLog.push({
    action,
    performedBy,
    performedByType,
    details,
    oldValue,
    newValue,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add internal note
contactMessageSchema.methods.addInternalNote = function(content, addedBy) {
  this.internalNotes.push({
    content,
    addedBy,
    createdAt: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to update status
contactMessageSchema.methods.updateStatus = function(newStatus, updatedBy, updatedByType, details = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.addAuditLog('status_changed', updatedBy, updatedByType, details, oldStatus, newStatus);
  return this.save();
};

// Instance method to respond to message
contactMessageSchema.methods.respond = function(response, respondedBy, isPublic = false) {
  this.status = 'responded';
  this.response = response;
  this.respondedAt = new Date();
  this.respondedBy = respondedBy;
  this.isPublic = isPublic;
  
  this.addAuditLog('responded', respondedBy, 'Admin', `Response sent: ${response.substring(0, 100)}...`);
  return this.save();
};

// Instance method to resolve message
contactMessageSchema.methods.resolve = function(resolvedBy, resolution = '') {
  this.status = 'resolved';
  
  this.addAuditLog('resolved', resolvedBy, 'Admin', resolution);
  return this.save();
};

// Instance method to close message
contactMessageSchema.methods.close = function(closedBy, reason = '') {
  this.status = 'closed';
  
  this.addAuditLog('closed', closedBy, 'Admin', reason);
  return this.save();
};

// Instance method to reopen message
contactMessageSchema.methods.reopen = function(reopenedBy, reason = '') {
  const oldStatus = this.status;
  this.status = 'new';
  
  this.addAuditLog('reopened', reopenedBy, 'Admin', reason, oldStatus, 'new');
  return this.save();
};

// Pre-save middleware to update timestamps
contactMessageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('ContactMessage', contactMessageSchema);
