import express from 'express';
import { verifyToken, requireAdmin } from '../../middleware/auth.js';
import SubscriptionPlan from '../../models/SubscriptionPlan.js';
import { createPlan, updatePlan, deletePlan } from '../../config/razorpay.js';
import { adminLogger } from '../../utils/logger.js';

const router = express.Router();

// Get all subscription plans
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { active, billingCycle } = req.query;
    
    let query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    if (billingCycle) {
      query.billingCycle = billingCycle;
    }

    const plans = await SubscriptionPlan.find(query).sort({ sortOrder: 1, price: 1 });
    
    res.json({
      message: 'Subscription plans retrieved successfully',
      plans
    });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ message: 'Failed to get subscription plans', error: error.message });
  }
});

// Get single subscription plan
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    res.json({
      message: 'Subscription plan retrieved successfully',
      plan
    });
  } catch (error) {
    console.error('Error getting subscription plan:', error);
    res.status(500).json({ message: 'Failed to get subscription plan', error: error.message });
  }
});

// Create new subscription plan
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency = 'INR',
      billingCycle,
      duration,
      features = [],
      limits = {},
      isPopular = false,
      sortOrder = 0,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!name || !description || price === undefined || !billingCycle || !duration) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, price, billingCycle, duration' 
      });
    }

    // Check if plan name already exists
    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan name already exists' });
    }

    // Create Razorpay plan if it's a paid plan
    let razorpayPlanId = null;
    if (price > 0) {
      try {
        const razorpayPlan = await createPlan({
          period: billingCycle === 'yearly' ? 'yearly' : 'monthly',
          interval: 1,
          item: {
            name: name,
            amount: price,
            currency: currency,
            description: description
          }
        });
        razorpayPlanId = razorpayPlan.id;
      } catch (razorpayError) {
        console.error('Error creating Razorpay plan:', razorpayError);
        // Continue without Razorpay plan ID for now
      }
    }

    const plan = new SubscriptionPlan({
      name,
      description,
      price,
      currency,
      billingCycle,
      duration,
      features,
      limits: {
        maxImages: limits.maxImages || -1,
        maxVideos: limits.maxVideos || -1,
        maxDownloads: limits.maxDownloads || -1,
        accessDuration: limits.accessDuration || -1
      },
      razorpayPlanId,
      isPopular,
      sortOrder,
      metadata
    });

    await plan.save();

    // Log plan creation
    adminLogger.logPlanCreated({
      adminId: req.admin.id,
      planId: plan._id,
      planName: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Subscription plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ message: 'Failed to create subscription plan', error: error.message });
  }
});

// Update subscription plan
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const {
      name,
      description,
      price,
      currency,
      billingCycle,
      duration,
      features,
      limits,
      isActive,
      isPopular,
      sortOrder,
      metadata
    } = req.body;

    // Check if name is being changed and if it already exists
    if (name && name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({ name, _id: { $ne: plan._id } });
      if (existingPlan) {
        return res.status(400).json({ message: 'Plan name already exists' });
      }
    }

    // Update Razorpay plan if price or billing cycle changed
    if ((price !== undefined && price !== plan.price) || 
        (billingCycle && billingCycle !== plan.billingCycle)) {
      if (plan.razorpayPlanId) {
        try {
          await updatePlan(plan.razorpayPlanId, {
            item: {
              name: name || plan.name,
              amount: price || plan.price,
              currency: currency || plan.currency,
              description: description || plan.description
            }
          });
        } catch (razorpayError) {
          console.error('Error updating Razorpay plan:', razorpayError);
        }
      }
    }

    // Update plan fields
    if (name !== undefined) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (price !== undefined) plan.price = price;
    if (currency !== undefined) plan.currency = currency;
    if (billingCycle !== undefined) plan.billingCycle = billingCycle;
    if (duration !== undefined) plan.duration = duration;
    if (features !== undefined) plan.features = features;
    if (limits !== undefined) plan.limits = { ...plan.limits, ...limits };
    if (isActive !== undefined) plan.isActive = isActive;
    if (isPopular !== undefined) plan.isPopular = isPopular;
    if (sortOrder !== undefined) plan.sortOrder = sortOrder;
    if (metadata !== undefined) plan.metadata = { ...plan.metadata, ...metadata };

    await plan.save();

    // Log plan update
    adminLogger.logPlanUpdated({
      adminId: req.admin.id,
      planId: plan._id,
      planName: plan.name,
      changes: req.body,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Subscription plan updated successfully',
      plan
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ message: 'Failed to update subscription plan', error: error.message });
  }
});

// Delete subscription plan
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Check if plan is being used by any active subscriptions
    const Subscription = (await import('../../models/Subscription.js')).default;
    const activeSubscriptions = await Subscription.countDocuments({
      razorpayPlanId: plan.razorpayPlanId,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan with active subscriptions. Deactivate instead.' 
      });
    }

    // Delete from Razorpay if plan exists
    if (plan.razorpayPlanId) {
      try {
        await deletePlan(plan.razorpayPlanId);
      } catch (razorpayError) {
        console.error('Error deleting Razorpay plan:', razorpayError);
        // Continue with database deletion
      }
    }

    await SubscriptionPlan.findByIdAndDelete(req.params.id);

    // Log plan deletion
    adminLogger.logPlanDeleted({
      adminId: req.admin.id,
      planId: plan._id,
      planName: plan.name,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ message: 'Failed to delete subscription plan', error: error.message });
  }
});

// Initialize default plans
router.post('/initialize-defaults', verifyToken, requireAdmin, async (req, res) => {
  try {
    await SubscriptionPlan.createDefaultPlans();
    
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    
    // Log default plans initialization
    adminLogger.logDefaultPlansInitialized({
      adminId: req.admin.id,
      plansCount: plans.length,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Default subscription plans initialized successfully',
      plans
    });
  } catch (error) {
    console.error('Error initializing default plans:', error);
    res.status(500).json({ message: 'Failed to initialize default plans', error: error.message });
  }
});

// Get plan statistics
router.get('/stats/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await SubscriptionPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          activePlans: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          popularPlans: {
            $sum: { $cond: [{ $eq: ['$isPopular', true] }, 1, 0] }
          },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    const billingCycleStats = await SubscriptionPlan.aggregate([
      {
        $group: {
          _id: '$billingCycle',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      message: 'Plan statistics retrieved successfully',
      stats: stats[0] || {
        totalPlans: 0,
        activePlans: 0,
        popularPlans: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0
      },
      billingCycleStats
    });
  } catch (error) {
    console.error('Error getting plan statistics:', error);
    res.status(500).json({ message: 'Failed to get plan statistics', error: error.message });
  }
});

export default router;
