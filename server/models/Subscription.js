import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: false // For backward compatibility
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired', 'paused'],
    default: 'inactive'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  nextBillingDate: {
    type: Date,
    default: null
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
    enum: ['razorpay'],
    default: 'razorpay'
  },
  razorpaySubscriptionId: {
    type: String,
    default: null
  },
  razorpayPlanId: {
    type: String,
    default: null
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 }); // For finding expiring subscriptions

// Virtual for formatted amount
subscriptionSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount}`;
});

// Virtual to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && new Date() < this.endDate;
});

// Virtual to check if subscription is in trial
subscriptionSchema.virtual('isInTrial').get(function() {
  return this.trialEndDate && new Date() < this.trialEndDate;
});

// Static method to create subscription
subscriptionSchema.statics.createSubscription = function(data) {
  const startDate = new Date();
  const endDate = new Date();
  
  // Calculate end date based on plan
  if (data.plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (data.plan === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return this.create({
    user: data.userId,
    plan: data.plan,
    status: 'active',
    startDate,
    endDate,
    nextBillingDate: endDate,
    amount: data.amount,
    currency: data.currency || 'INR',
    razorpaySubscriptionId: data.razorpaySubscriptionId,
    razorpayPlanId: data.razorpayPlanId,
    metadata: data.metadata || {}
  });
};

// Static method to get active subscription for user
subscriptionSchema.statics.getActiveSubscription = function(userId) {
  return this.findOne({
    user: userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
};

// Static method to check if user has active subscription
subscriptionSchema.statics.hasActiveSubscription = function(userId) {
  return this.findOne({
    user: userId,
    status: 'active',
    endDate: { $gt: new Date() }
  }).then(subscription => !!subscription);
};

// Static method to get expiring subscriptions
subscriptionSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    endDate: { $lte: futureDate, $gt: new Date() }
  }).populate('user', 'name email');
};

// Static method to get subscription statistics
subscriptionSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: null,
        statuses: { $push: { status: '$_id', count: '$count', totalRevenue: '$totalRevenue' } },
        totalSubscriptions: { $sum: '$count' },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = 'User requested') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.autoRenew = false;
  return this.save();
};

// Instance method to pause subscription
subscriptionSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// Instance method to resume subscription
subscriptionSchema.methods.resume = function() {
  this.status = 'active';
  return this.save();
};

// Instance method to extend subscription
subscriptionSchema.methods.extend = function(days) {
  this.endDate.setDate(this.endDate.getDate() + days);
  this.nextBillingDate = this.endDate;
  return this.save();
};

// Instance method to check if subscription is expiring soon
subscriptionSchema.methods.isExpiringSoon = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.endDate <= futureDate && this.endDate > new Date();
};

export default mongoose.model('Subscription', subscriptionSchema);
