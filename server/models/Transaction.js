import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
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
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'subscription'],
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
  errorDetails: {
    code: String,
    message: String,
    description: String,
    source: String,
    step: String
  },
  purchaseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String,
    deviceType: String,
    browser: String
  },
  processedAt: {
    type: Date,
    default: null
  },
  failureReason: String
}, {
  timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ userId: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ razorpayOrderId: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });
transactionSchema.index({ userId: 1, status: 1 }); // Compound index for user transaction history

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount}`;
});

// Static method to create transaction
transactionSchema.statics.createTransaction = function(data) {
  return this.create({
    userId: data.userId,
    transactionId: data.transactionId,
    amount: data.amount,
    currency: data.currency || 'INR',
    status: data.status || 'pending',
    paymentMethod: data.paymentMethod,
    razorpayOrderId: data.razorpayOrderId,
    metadata: data.metadata || {}
  });
};

// Static method to update transaction status
transactionSchema.statics.updateStatus = function(transactionId, status, additionalData = {}) {
  const updateData = {
    status,
    processedAt: status === 'success' || status === 'failed' ? new Date() : null,
    ...additionalData
  };
  
  return this.findOneAndUpdate(
    { transactionId },
    updateData,
    { new: true }
  );
};

// Static method to get user transactions
transactionSchema.statics.getUserTransactions = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.find(query)
    .populate('purchaseIds', 'videoId imageId amount status purchaseDate')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get failed transactions for admin review
transactionSchema.statics.getFailedTransactions = function(options = {}) {
  return this.find({ status: 'failed' })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get transaction statistics
transactionSchema.statics.getStats = function(options = {}) {
  const matchStage = {};
  
  if (options.startDate && options.endDate) {
    matchStage.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $group: {
        _id: null,
        statuses: { $push: { status: '$_id', count: '$count', totalAmount: '$totalAmount', avgAmount: '$avgAmount' } },
        totalTransactions: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Instance method to add error details
transactionSchema.methods.addError = function(error) {
  this.errorDetails = {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error occurred',
    description: error.description || '',
    source: error.source || 'payment_gateway',
    step: error.step || 'processing'
  };
  this.failureReason = error.message;
  this.status = 'failed';
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as successful
transactionSchema.methods.markSuccess = function(razorpayData = {}) {
  this.status = 'success';
  this.processedAt = new Date();
  if (razorpayData.paymentId) {
    this.razorpayPaymentId = razorpayData.paymentId;
  }
  if (razorpayData.signature) {
    this.razorpaySignature = razorpayData.signature;
  }
  return this.save();
};

export default mongoose.model('Transaction', transactionSchema);
