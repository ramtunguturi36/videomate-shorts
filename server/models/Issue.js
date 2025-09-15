import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  // Basic Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['payment', 'technical', 'account', 'content', 'billing', 'other'],
    required: true,
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },

  // Transaction Information (if payment-related)
  transactionId: {
    type: String,
    default: null
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'subscription', 'free', null],
    default: null
  },
  amount: {
    type: Number,
    default: null
  },

  // Assignment and Resolution
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null
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
  tags: [{
    type: String,
    trim: true
  }],

  // Audit Trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'status_changed', 'assigned', 'note_added', 'resolved', 'reopened', 'closed'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'auditLog.performedByType',
      required: true
    },
    performedByType: {
      type: String,
      enum: ['User', 'Admin'],
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

  // Notes and Comments
  notes: [{
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'notes.addedByType',
      required: true
    },
    addedByType: {
      type: String,
      enum: ['User', 'Admin'],
      required: true
    },
    isInternal: {
      type: Boolean,
      default: false
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
issueSchema.index({ userId: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ category: 1 });
issueSchema.index({ priority: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ transactionId: 1 });
issueSchema.index({ purchaseId: 1 });
issueSchema.index({ userId: 1, status: 1 }); // Compound index for user's issues

// Virtual for formatted priority
issueSchema.virtual('formattedPriority').get(function() {
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  return priorityMap[this.priority] || 'Medium';
});

// Virtual for formatted status
issueSchema.virtual('formattedStatus').get(function() {
  const statusMap = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };
  return statusMap[this.status] || 'Open';
});

// Virtual for time since creation
issueSchema.virtual('timeSinceCreation').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
});

// Static method to get issues with filters
issueSchema.statics.getIssuesWithFilters = function(filters = {}) {
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
  
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }
  
  if (filters.userId) {
    query.userId = filters.userId;
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
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { transactionId: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const options = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    sort: { createdAt: -1 }
  };

  return this.find(query)
    .populate('userId', 'name email')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('purchaseId', 'amount status')
    .sort(options.sort)
    .limit(options.limit)
    .skip((options.page - 1) * options.limit);
};

// Static method to get issue statistics
issueSchema.statics.getIssueStats = function(filters = {}) {
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
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        payment: { $sum: { $cond: [{ $eq: ['$category', 'payment'] }, 1, 0] } },
        technical: { $sum: { $cond: [{ $eq: ['$category', 'technical'] }, 1, 0] } }
      }
    }
  ]);
};

// Instance method to add audit log entry
issueSchema.methods.addAuditLog = function(action, performedBy, performedByType, details = '', oldValue = null, newValue = null) {
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

// Instance method to add note
issueSchema.methods.addNote = function(content, addedBy, addedByType, isInternal = false) {
  this.notes.push({
    content,
    addedBy,
    addedByType,
    isInternal,
    createdAt: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to update status
issueSchema.methods.updateStatus = function(newStatus, updatedBy, updatedByType, details = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
    this.resolvedBy = updatedBy;
  }
  
  this.addAuditLog('status_changed', updatedBy, updatedByType, details, oldStatus, newStatus);
  return this.save();
};

// Instance method to assign issue
issueSchema.methods.assignTo = function(adminId, assignedBy, assignedByType, details = '') {
  const oldAssignee = this.assignedTo;
  this.assignedTo = adminId;
  
  this.addAuditLog('assigned', assignedBy, assignedByType, details, oldAssignee?.toString(), adminId?.toString());
  return this.save();
};

// Instance method to resolve issue
issueSchema.methods.resolve = function(resolution, resolvedBy, resolvedByType) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  
  this.addAuditLog('resolved', resolvedBy, resolvedByType, `Issue resolved: ${resolution}`);
  return this.save();
};

// Instance method to reopen issue
issueSchema.methods.reopen = function(reopenedBy, reopenedByType, reason = '') {
  const oldStatus = this.status;
  this.status = 'open';
  this.resolvedAt = null;
  this.resolution = null;
  
  this.addAuditLog('reopened', reopenedBy, reopenedByType, reason, oldStatus, 'open');
  return this.save();
};

// Pre-save middleware to update timestamps
issueSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Issue', issueSchema);
