import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    required: true
  },
  duration: {
    type: Number, // in days
    required: true
  },
  features: [{
    name: String,
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  limits: {
    maxImages: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    maxVideos: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    maxDownloads: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    accessDuration: {
      type: Number, // in minutes, -1 means unlimited
      default: -1
    }
  },
  razorpayPlanId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    color: String,
    icon: String,
    badge: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
subscriptionPlanSchema.index({ billingCycle: 1 });
subscriptionPlanSchema.index({ price: 1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

// Virtual for price per month (for yearly plans)
subscriptionPlanSchema.virtual('pricePerMonth').get(function() {
  if (this.billingCycle === 'yearly') {
    return Math.round(this.price / 12);
  }
  return this.price;
});

// Virtual for savings (for yearly plans)
subscriptionPlanSchema.virtual('savings').get(function() {
  if (this.billingCycle === 'yearly') {
    const monthlyPrice = this.price / 12;
    const monthlyPlan = this.constructor.findOne({ 
      billingCycle: 'monthly',
      isActive: true 
    });
    if (monthlyPlan) {
      return Math.round((monthlyPlan.price - monthlyPrice) * 12);
    }
  }
  return 0;
});

// Static method to get active plans
subscriptionPlanSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
};

// Static method to get plan by billing cycle
subscriptionPlanSchema.statics.getPlansByCycle = function(cycle) {
  return this.find({ billingCycle: cycle, isActive: true }).sort({ price: 1 });
};

// Static method to get popular plans
subscriptionPlanSchema.statics.getPopularPlans = function() {
  return this.find({ isActive: true, isPopular: true }).sort({ sortOrder: 1 });
};

// Static method to create default plans
subscriptionPlanSchema.statics.createDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'Free',
      description: 'Basic access to free content',
      price: 0,
      billingCycle: 'lifetime',
      duration: 365, // 1 year
      features: [
        { name: 'Access to free videos', description: 'Watch free content' },
        { name: 'Basic video player', description: 'Standard quality streaming' },
        { name: 'Limited downloads', description: '5 downloads per month' }
      ],
      limits: {
        maxImages: 0,
        maxVideos: -1,
        maxDownloads: 5,
        accessDuration: 5 // 5 minutes for images
      },
      sortOrder: 1,
      metadata: {
        color: 'gray',
        icon: 'user'
      }
    },
    {
      name: 'Premium Monthly',
      description: 'Unlimited access to all premium content',
      price: 2900, // ₹29 in paise
      billingCycle: 'monthly',
      duration: 30,
      features: [
        { name: 'Unlimited image access', description: 'Access all premium images' },
        { name: 'HD quality streaming', description: 'High definition videos' },
        { name: 'Unlimited downloads', description: 'Download any content' },
        { name: 'Priority support', description: '24/7 customer support' },
        { name: 'Ad-free experience', description: 'No advertisements' }
      ],
      limits: {
        maxImages: -1,
        maxVideos: -1,
        maxDownloads: -1,
        accessDuration: -1 // Unlimited access
      },
      isPopular: true,
      sortOrder: 2,
      metadata: {
        color: 'blue',
        icon: 'star',
        badge: 'Most Popular'
      }
    },
    {
      name: 'Premium Yearly',
      description: 'Best value with unlimited access for a full year',
      price: 29900, // ₹299 in paise
      billingCycle: 'yearly',
      duration: 365,
      features: [
        { name: 'Unlimited image access', description: 'Access all premium images' },
        { name: '4K quality streaming', description: 'Ultra high definition' },
        { name: 'Unlimited downloads', description: 'Download any content' },
        { name: 'Priority support', description: '24/7 customer support' },
        { name: 'Ad-free experience', description: 'No advertisements' },
        { name: 'Early access', description: 'Get new content first' },
        { name: 'Custom playlists', description: 'Create your own collections' }
      ],
      limits: {
        maxImages: -1,
        maxVideos: -1,
        maxDownloads: -1,
        accessDuration: -1 // Unlimited access
      },
      sortOrder: 3,
      metadata: {
        color: 'purple',
        icon: 'crown',
        badge: 'Best Value'
      }
    }
  ];

  for (const planData of defaultPlans) {
    const existingPlan = await this.findOne({ name: planData.name });
    if (!existingPlan) {
      await this.create(planData);
    }
  }
};

// Instance method to check if plan has unlimited access
subscriptionPlanSchema.methods.hasUnlimitedAccess = function() {
  return this.limits.accessDuration === -1;
};

// Instance method to check if plan allows image access
subscriptionPlanSchema.methods.allowsImageAccess = function() {
  return this.limits.maxImages === -1 || this.limits.maxImages > 0;
};

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
