import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  picR2Url: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  paymentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'expired'],
    default: 'pending'
  },
  // Additional fields for backward compatibility and enhanced functionality
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'subscription', 'free'],
    required: true
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  accessGranted: {
    type: Boolean,
    default: false
  },
  accessExpired: {
    type: Boolean,
    default: false
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String,
    videoTitle: String,
    imageTitle: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
purchaseSchema.index({ userId: 1 });
purchaseSchema.index({ videoId: 1 });
purchaseSchema.index({ imageId: 1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ expiryDate: 1 });
purchaseSchema.index({ paymentId: 1 });
purchaseSchema.index({ razorpayOrderId: 1 });
purchaseSchema.index({ razorpayPaymentId: 1 });
purchaseSchema.index({ userId: 1, imageId: 1 }); // Compound index for checking user purchases

// Virtual for formatted amount
purchaseSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount}`;
});

// Static method to check if user has active access to image
purchaseSchema.statics.hasActiveAccess = function(userId, imageId) {
  return this.findOne({
    userId: userId,
    imageId: imageId,
    status: 'completed',
    accessGranted: true,
    accessExpired: false,
    expiryDate: { $gt: new Date() }
  });
};

// Static method to check if user has subscription access
purchaseSchema.statics.hasSubscriptionAccess = async function(userId) {
  const Subscription = mongoose.model('Subscription');
  const subscription = await Subscription.getActiveSubscription(userId);
  return !!subscription;
};

// Static method to get user's purchase history
purchaseSchema.statics.getUserPurchases = function(userId, options = {}) {
  const query = { userId: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('videoId', 'title fileType thumbnailUrl metadata')
    .populate('imageId', 'title fileType metadata')
    .sort({ purchaseDate: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get image purchase statistics
purchaseSchema.statics.getImageStats = function(imageId) {
  return this.aggregate([
    { $match: { imageId: mongoose.Types.ObjectId(imageId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Instance method to check if purchase is expired
purchaseSchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

// Instance method to grant access
purchaseSchema.methods.grantAccess = function() {
  this.accessGranted = true;
  this.accessExpired = false;
  return this.save();
};

// Instance method to expire access
purchaseSchema.methods.expireAccess = function() {
  this.accessExpired = true;
  this.status = 'expired';
  return this.save();
};

// Static method to get signed URL for purchased image with expiry validation
purchaseSchema.statics.getSignedImageUrl = async function(userId, imageId) {
  const purchase = await this.hasActiveAccess(userId, imageId);
  
  if (!purchase) {
    return {
      success: false,
      error: 'No active access found',
      expired: false
    };
  }

  // Check if purchase is expired
  if (purchase.isExpired()) {
    await purchase.expireAccess();
    return {
      success: false,
      error: 'Access has expired',
      expired: true
    };
  }

  return {
    success: true,
    purchase,
    picR2Url: purchase.picR2Url,
    expiryDate: purchase.expiryDate,
    isExpired: false
  };
};

// Static method to create purchase with 5-minute expiry for one-time purchases
purchaseSchema.statics.createOneTimePurchase = function(purchaseData) {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  
  return new this({
    ...purchaseData,
    purchaseDate: now,
    expiryDate: expiryDate,
    status: 'pending'
  });
};

export default mongoose.model('Purchase', purchaseSchema);
