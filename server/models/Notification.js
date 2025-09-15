import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['issue_update', 'contact_response', 'payment_update', 'system', 'promotional'],
    required: true,
    default: 'system'
  },
  
  // Related Entities
  relatedEntityType: {
    type: String,
    enum: ['issue', 'contact_message', 'purchase', 'transaction', 'subscription', null],
    default: null
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  // Notification Status
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  
  // Delivery Information
  deliveryMethod: {
    type: String,
    enum: ['in_app', 'email', 'both'],
    default: 'in_app'
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  
  // Action Information
  actionUrl: {
    type: String,
    trim: true,
    default: null
  },
  actionText: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  readAt: {
    type: Date,
    default: null
  },
  archivedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for formatted type
notificationSchema.virtual('formattedType').get(function() {
  const typeMap = {
    issue_update: 'Issue Update',
    contact_response: 'Contact Response',
    payment_update: 'Payment Update',
    system: 'System',
    promotional: 'Promotional'
  };
  return typeMap[this.type] || 'System';
});

// Virtual for time since creation
notificationSchema.virtual('timeSinceCreation').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
});

// Static method to create notification
notificationSchema.statics.createNotification = function(data) {
  return new this({
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    relatedEntityType: data.relatedEntityType || null,
    relatedEntityId: data.relatedEntityId || null,
    isImportant: data.isImportant || false,
    deliveryMethod: data.deliveryMethod || 'in_app',
    actionUrl: data.actionUrl || null,
    actionText: data.actionText || null,
    metadata: data.metadata || {},
    expiresAt: data.expiresAt || null
  });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.important) {
    query.isImportant = options.important;
  }

  const limit = options.limit || 20;
  const skip = options.skip || 0;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = function(userId, notificationIds = []) {
  const query = { userId, status: 'unread' };
  
  if (notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return this.updateMany(query, {
    status: 'read',
    readAt: new Date()
  });
};

// Static method to archive notifications
notificationSchema.statics.archiveNotifications = function(userId, notificationIds = []) {
  const query = { userId };
  
  if (notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return this.updateMany(query, {
    status: 'archived',
    archivedAt: new Date()
  });
};

// Static method to get notification counts
notificationSchema.statics.getNotificationCounts = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to archive
notificationSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

// Pre-save middleware to set expiration if not provided
notificationSchema.pre('save', function(next) {
  // Set default expiration to 30 days if not provided
  if (!this.expiresAt && this.type !== 'system') {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model('Notification', notificationSchema);
