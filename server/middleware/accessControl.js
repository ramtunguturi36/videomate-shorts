import Purchase from '../models/Purchase.js';
import Subscription from '../models/Subscription.js';

// Middleware to check if user has access to an image
export const checkImageAccess = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    // Check if user has active subscription with unlimited access
    const subscription = await Subscription.getActiveSubscription(userId);
    if (subscription) {
      // Get subscription plan details to check if it allows unlimited access
      const SubscriptionPlan = (await import('../models/SubscriptionPlan.js')).default;
      const plan = await SubscriptionPlan.findById(subscription.planId);
      
      if (plan && plan.hasUnlimitedAccess()) {
        req.hasAccess = true;
        req.accessType = 'subscription';
        req.subscription = subscription;
        req.plan = plan;
        return next();
      }
    }

    // Check if user has active purchase for this image
    const hasActiveAccess = await Purchase.hasActiveAccess(userId, imageId);
    if (hasActiveAccess) {
      // Double-check if the purchase is still valid (not expired)
      if (!hasActiveAccess.isExpired()) {
        req.hasAccess = true;
        req.accessType = 'purchase';
        req.accessExpiry = hasActiveAccess.expiryDate;
        req.purchase = hasActiveAccess;
        return next();
      } else {
        // Purchase has expired, mark it as expired
        await hasActiveAccess.expireAccess();
      }
    }

    // No access found
    req.hasAccess = false;
    next();
  } catch (error) {
    console.error('Error checking image access:', error);
    req.hasAccess = false;
    next();
  }
};

// Middleware to validate purchase expiry
export const validatePurchaseExpiry = async (req, res, next) => {
  try {
    if (req.accessType === 'subscription') {
      // Subscription access doesn't expire (until subscription ends)
      return next();
    }

    if (req.accessType === 'purchase' && req.accessExpiry) {
      const now = new Date();
      const expiryDate = new Date(req.accessExpiry);

      if (now > expiryDate) {
        // Access has expired, update the purchase record
        const purchase = await Purchase.findOne({
          userId: req.user.id,
          imageId: req.params.imageId,
          status: 'completed'
        });

        if (purchase) {
          await purchase.expireAccess();
        }

        req.hasAccess = false;
        req.accessExpired = true;
      }
    }

    next();
  } catch (error) {
    console.error('Error validating purchase expiry:', error);
    next();
  }
};

// Middleware to clean up expired purchases (can be run as a cron job)
export const cleanupExpiredPurchases = async () => {
  try {
    const now = new Date();
    
    // Find all completed purchases that have expired
    const expiredPurchases = await Purchase.find({
      status: 'completed',
      accessGranted: true,
      accessExpired: false,
      expiryDate: { $lt: now }
    });

    // Mark them as expired
    const updatePromises = expiredPurchases.map(purchase => 
      purchase.expireAccess()
    );

    await Promise.all(updatePromises);

    console.log(`Cleaned up ${expiredPurchases.length} expired purchases`);
    return expiredPurchases.length;
  } catch (error) {
    console.error('Error cleaning up expired purchases:', error);
    throw error;
  }
};

// Middleware to check subscription status
export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.getActiveSubscription(userId);
    if (subscription) {
      req.subscription = subscription;
      req.hasActiveSubscription = true;
    } else {
      req.hasActiveSubscription = false;
    }

    next();
  } catch (error) {
    console.error('Error checking subscription status:', error);
    req.hasActiveSubscription = false;
    next();
  }
};

// Utility function to get user's access summary
export const getUserAccessSummary = async (userId) => {
  try {
    // Check subscription status
    const subscription = await Subscription.getActiveSubscription(userId);
    
    // Get active purchases
    const activePurchases = await Purchase.find({
      userId: userId,
      status: 'completed',
      accessGranted: true,
      accessExpired: false,
      expiryDate: { $gt: new Date() }
    }).populate('imageId', 'title metadata').populate('videoId', 'title');

    return {
      hasActiveSubscription: !!subscription,
      subscription: subscription ? {
        plan: subscription.plan,
        endDate: subscription.endDate,
        isExpiringSoon: subscription.isExpiringSoon()
      } : null,
      activePurchases: activePurchases.map(purchase => ({
        id: purchase._id,
        imageId: purchase.imageId,
        videoId: purchase.videoId,
        expiryDate: purchase.expiryDate,
        timeRemaining: purchase.expiryDate - new Date()
      }))
    };
  } catch (error) {
    console.error('Error getting user access summary:', error);
    throw error;
  }
};

// Middleware to enforce rate limiting for image access
export const rateLimitImageAccess = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old requests
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      requests.set(userId, validRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        message: 'Too many image access requests',
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    userRequests.push(now);
    next();
  };
};
