import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { 
  checkImageAccess, 
  validatePurchaseExpiry, 
  rateLimitImageAccess,
  getUserAccessSummary 
} from '../middleware/accessControl.js';
import { 
  createOrder, 
  verifyPayment, 
  verifyWebhookSignature,
  getPaymentDetails,
  createSubscription,
  cancelSubscription,
  getSubscriptionDetails,
  createCustomer
} from '../config/razorpay.js';
import { getSignedUrlFromR2, getSignedUrlForPurchase, getSignedUrlForSubscription } from '../config/cloudflareR2.js';
import Purchase from '../models/Purchase.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import File from '../models/File.js';
import { paymentLogger, accessLogger, securityLogger } from '../utils/logger.js';

const router = express.Router();

// Test endpoint to check if payment system is working
router.get('/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if there are any images in the database
    const imageCount = await File.countDocuments({ fileType: 'image', status: 'ready' });
    const videoCount = await File.countDocuments({ fileType: 'video', status: 'ready' });
    
    // Check Razorpay configuration
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    res.json({
      message: 'Payment system test',
      userId: userId,
      database: {
        images: imageCount,
        videos: videoCount
      },
      razorpay: {
        keyId: keyId ? 'SET' : 'NOT SET',
        keySecret: keySecret ? 'SET' : 'NOT SET',
        configured: !!(keyId && keySecret && keyId !== 'your-razorpay-key-id')
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Test failed', error: error.message });
  }
});

// Create purchase order for video QR code (image)
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { imageId } = req.body;
    const userId = req.user.id;

    // Find the image file
    const imageFile = await File.findById(imageId);
    if (!imageFile) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if user already has access (subscription or previous purchase)
    const hasActiveAccess = await Purchase.hasActiveAccess(userId, imageId);
    const hasSubscriptionAccess = await Subscription.hasActiveSubscription(userId);

    if (hasActiveAccess || hasSubscriptionAccess) {
      // User already has access
      const purchase = new Purchase({
        userId: userId,
        videoId: imageFile.associatedVideo || imageId, // Fallback if no associated video
        imageId: imageId,
        picR2Url: imageFile.r2Url,
        amount: 0,
        paymentMethod: hasSubscriptionAccess ? 'subscription' : 'free',
        status: 'completed',
        expiryDate: hasSubscriptionAccess ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 5 * 60 * 1000), // 1 year for subscription, 5 minutes for one-time purchase
        accessGranted: true,
        metadata: {
          videoTitle: imageFile.title,
          imageTitle: imageFile.title,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          platform: 'web'
        }
      });

      await purchase.save();

      return res.json({
        message: 'Access granted',
        purchase: {
          id: purchase._id,
          status: 'completed',
          expiryDate: purchase.expiryDate
        }
      });
    }

    // Check if Razorpay is properly configured
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'your-razorpay-key-id') {
      console.log('⚠️  Razorpay not configured, granting test access');
      console.log('Key ID:', keyId);
      console.log('Key Secret:', keySecret ? 'SET' : 'NOT SET');
      
      // Grant test access for 5 minutes
      const purchase = Purchase.createOneTimePurchase({
        userId: userId,
        videoId: imageFile.associatedVideo || imageId,
        imageId: imageId,
        picR2Url: imageFile.r2Url,
        amount: imageFile.metadata.price || 10,
        paymentMethod: 'free',
        metadata: {
          videoTitle: imageFile.title,
          imageTitle: imageFile.title,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          platform: 'web',
          testMode: true
        }
      });

      purchase.status = 'completed';
      purchase.accessGranted = true;
      await purchase.save();

      return res.json({
        message: 'Test access granted (Razorpay not configured)',
        purchase: {
          id: purchase._id,
          status: 'completed',
          expiryDate: purchase.expiryDate
        }
      });
    }

    // Create Razorpay order
    const amount = imageFile.metadata.price || 10; // Default price in rupees
    // Create a shorter receipt (max 40 characters for Razorpay)
    const receipt = `img_${imageId.toString().slice(-6)}_${userId.toString().slice(-6)}`;
    const order = await createOrder(amount, 'INR', receipt);

    // Create transaction record
    const transaction = await Transaction.createTransaction({
      userId,
      transactionId: order.id,
      amount,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        platform: 'web'
      }
    });

    // Log payment initiation
    paymentLogger.logPaymentInitiated({
      userId,
      transactionId: order.id,
      amount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      metadata: {
        imageId,
        videoTitle: imageFile.title,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    // Create purchase record using the new method
    const purchase = Purchase.createOneTimePurchase({
      userId: userId,
      videoId: imageFile.associatedVideo || imageId,
      imageId: imageId,
      picR2Url: imageFile.r2Url,
      amount,
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      metadata: {
        videoTitle: imageFile.title,
        imageTitle: imageFile.title,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        platform: 'web'
      }
    });

    await purchase.save();

    res.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      purchase: {
        id: purchase._id,
        status: purchase.status
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

// Verify payment
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, paymentId, signature, purchaseId } = req.body;
    const userId = req.user.id;

    // Verify payment signature
    const isValidSignature = await verifyPayment(orderId, paymentId, signature);
    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find the purchase
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase || purchase.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Update purchase status
    purchase.status = 'completed';
    purchase.accessGranted = true;
    purchase.paymentId = paymentId;
    purchase.razorpayPaymentId = paymentId;
    purchase.razorpaySignature = signature;
    await purchase.save();

    // Update transaction
    const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    if (transaction) {
      await transaction.markSuccess({ paymentId, signature });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(paymentId);

    // Log successful payment
    paymentLogger.logPaymentSuccess({
      userId,
      transactionId: orderId,
      paymentId,
      amount: purchase.amount,
      currency: purchase.currency,
      purchaseIds: [purchase._id],
      metadata: {
        imageId: purchase.imageId,
        videoTitle: purchase.metadata?.videoTitle || 'Unknown',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Payment verified successfully',
      purchase: {
        id: purchase._id,
        status: purchase.status,
        expiryDate: purchase.expiryDate,
        accessGranted: purchase.accessGranted
      },
      payment: paymentDetails
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
});

// Get signed URL for image access
router.get('/access-image/:imageId', 
  verifyToken, 
  checkImageAccess, 
  validatePurchaseExpiry,
  rateLimitImageAccess(20, 60000), // 20 requests per minute
  async (req, res) => {
    try {
      const { imageId } = req.params;

      // Check access status after middleware validation
      if (!req.hasAccess) {
        // Log access denial
        accessLogger.logImageAccessDenied({
          userId: req.user.id,
          imageId,
          reason: req.accessExpired ? 'Access has expired' : 'No active access to this image',
          metadata: {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            accessExpired: req.accessExpired
          }
        });

        return res.status(403).json({ 
          message: 'Access denied',
          error: req.accessExpired ? 'Access has expired' : 'No active access to this image'
        });
      }

      // Find the image file
      const imageFile = await File.findById(imageId);
      if (!imageFile) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Generate signed URL with appropriate expiry
      let imageUrl = imageFile.r2Url;
      let expiryDate = null;

      if (req.accessType === 'subscription') {
        // For subscription users, generate a longer expiry (1 hour)
        const key = imageFile.r2Key || imageFile.r2Url.split('/').pop(); // Extract key from URL
        imageUrl = await getSignedUrlForSubscription(key);
      } else if (req.accessType === 'purchase') {
        // For one-time purchase users, generate 5-minute expiry
        const key = imageFile.r2Key || imageFile.r2Url.split('/').pop(); // Extract key from URL
        imageUrl = await getSignedUrlForPurchase(key);
        expiryDate = req.accessExpiry;
      }

      // Log successful image access
      accessLogger.logImageAccessGranted({
        userId: req.user.id,
        imageId,
        accessType: req.accessType,
        expiryDate,
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          isSubscriptionAccess: req.accessType === 'subscription'
        }
      });

      res.json({
        message: 'Access granted',
        imageUrl,
        expiryDate,
        isSubscriptionAccess: req.accessType === 'subscription',
        accessType: req.accessType
      });

    } catch (error) {
      console.error('Error accessing image:', error);
      res.status(500).json({ message: 'Failed to access image', error: error.message });
    }
  }
);

// Create subscription
router.post('/create-subscription', verifyToken, async (req, res) => {
  try {
    const { planId } = req.body; // Plan ID from database
    const userId = req.user.id;

    // Check if user already has active subscription
    const existingSubscription = await Subscription.getActiveSubscription(userId);
    if (existingSubscription) {
      return res.status(400).json({ message: 'User already has an active subscription' });
    }

    // Get subscription plan from database
    const SubscriptionPlan = (await import('../models/SubscriptionPlan.js')).default;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Subscription plan not found or inactive' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create or get Razorpay customer
    let customerId = user.razorpayCustomerId;
    if (!customerId) {
      const customer = await createCustomer({
        name: user.name,
        email: user.email,
        contact: user.phone || undefined
      });
      customerId = customer.id;
      
      // Update user with customer ID
      user.razorpayCustomerId = customerId;
      await user.save();
    }

    // Create subscription with Razorpay
    let razorpaySubscription = null;
    if (plan.razorpayPlanId) {
      razorpaySubscription = await createSubscription(plan.razorpayPlanId, customerId, {
        totalCount: plan.billingCycle === 'yearly' ? 1 : 12,
        notes: {
          userId: userId.toString(),
          planId: planId.toString(),
          planName: plan.name
        }
      });
    } else {
      // If no Razorpay plan ID, create a one-time payment order for subscription
      console.log(`Creating one-time payment order for plan: ${plan.name} (₹${plan.price})`);
      // Create a shorter receipt (max 40 characters for Razorpay)
      const receipt = `sub_${planId.slice(-6)}_${userId.slice(-6)}`;
      const order = await createOrder(plan.price, 'INR', receipt);
      razorpaySubscription = {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: 'created',
        notes: {
          userId: userId.toString(),
          planId: planId.toString(),
          planName: plan.name,
          billingCycle: plan.billingCycle
        }
      };
    }

    res.json({
      message: 'Subscription created successfully',
      subscription: {
        id: razorpaySubscription?.id || null,
        status: razorpaySubscription?.status || 'created',
        planId: plan.razorpayPlanId || null,
        amount: plan.price,
        currency: plan.currency || 'INR',
        planName: plan.name,
        billingCycle: plan.billingCycle,
        isOneTimePayment: !plan.razorpayPlanId
      },
      plan: {
        id: plan._id,
        name: plan.name,
        description: plan.description,
        features: plan.features,
        limits: plan.limits
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription', error: error.message });
  }
});

// Verify subscription payment (for one-time payments)
router.post('/verify-subscription-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId } = req.body;
    const userId = req.user.id;

    // Verify payment signature
    const crypto = await import('crypto');
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto.createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get subscription plan
    const SubscriptionPlan = (await import('../models/SubscriptionPlan.js')).default;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Create subscription in database
    const subscription = new Subscription({
      userId: userId,
      planId: planId,
      razorpaySubscriptionId: paymentId, // Use payment ID as subscription ID for one-time payments
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + (plan.duration * 24 * 60 * 60 * 1000)), // Convert days to milliseconds
      amount: plan.price,
      currency: plan.currency || 'INR',
      billingCycle: plan.billingCycle,
      isActive: true
    });

    await subscription.save();

    // Log successful subscription
    paymentLogger.logSubscriptionCreated({
      userId: userId,
      subscriptionId: subscription._id,
      planId: planId,
      amount: plan.price,
      currency: plan.currency || 'INR',
      billingCycle: plan.billingCycle
    });

    res.json({
      message: 'Subscription activated successfully',
      subscription: {
        id: subscription._id,
        plan: plan.name,
        status: 'active',
        endDate: subscription.endDate
      }
    });

  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({ message: 'Failed to verify subscription payment', error: error.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find active subscription
    const subscription = await Subscription.getActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    // Cancel with Razorpay
    await cancelSubscription(subscription.razorpaySubscriptionId);

    // Update subscription status
    await subscription.cancel('User requested cancellation');

    res.json({
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
  }
});

// Get available subscription plans
router.get('/subscription-plans', verifyToken, async (req, res) => {
  try {
    const SubscriptionPlan = (await import('../models/SubscriptionPlan.js')).default;
    const plans = await SubscriptionPlan.getActivePlans();
    
    res.json({
      message: 'Subscription plans retrieved successfully',
      plans
    });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ message: 'Failed to get subscription plans', error: error.message });
  }
});

// Get user's access summary
router.get('/access-summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accessSummary = await getUserAccessSummary(userId);
    
    res.json({
      message: 'Access summary retrieved successfully',
      ...accessSummary
    });

  } catch (error) {
    console.error('Error getting access summary:', error);
    res.status(500).json({ message: 'Failed to get access summary', error: error.message });
  }
});

// Get user's purchase status for a specific image
router.get('/purchase-status/:imageId', verifyToken, async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    // Check if user has active access
    const accessResult = await Purchase.getSignedImageUrl(userId, imageId);
    
    if (accessResult.success) {
      res.json({
        message: 'Access granted',
        hasAccess: true,
        isExpired: false,
        expiryDate: accessResult.expiryDate,
        purchaseId: accessResult.purchase._id
      });
    } else {
      res.json({
        message: accessResult.error,
        hasAccess: false,
        isExpired: accessResult.expired,
        canBuyAgain: true
      });
    }

  } catch (error) {
    console.error('Error getting purchase status:', error);
    res.status(500).json({ message: 'Failed to get purchase status', error: error.message });
  }
});

// Get user's purchase history
router.get('/purchase-history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    
    const options = {
      status,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const purchases = await Purchase.getUserPurchases(userId, options);
    
    // Add expiry status to each purchase
    const purchasesWithStatus = purchases.map(purchase => ({
      ...purchase.toObject(),
      isExpired: purchase.isExpired(),
      canBuyAgain: purchase.isExpired() || purchase.status === 'failed'
    }));

    res.json({
      message: 'Purchase history retrieved successfully',
      purchases: purchasesWithStatus,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting purchase history:', error);
    res.status(500).json({ message: 'Failed to get purchase history', error: error.message });
  }
});

// Razorpay webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const startTime = Date.now();
  const webhookId = req.get('X-Razorpay-Event-Id') || 'unknown';
  
  try {
    const signature = req.get('X-Razorpay-Signature');
    const event = JSON.parse(req.body);
    
    // Log webhook received
    paymentLogger.logWebhookReceived({
      event: event.event,
      webhookId,
      signature: signature ? 'present' : 'missing',
      payload: event.payload
    });
    
    if (!verifyWebhookSignature(req.body, signature)) {
      paymentLogger.logWebhookError({
        event: event.event,
        webhookId,
        error: 'Invalid signature',
        payload: event.payload
      });
      
      console.error('Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload);
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload);
        break;
      case 'subscription.completed':
        await handleSubscriptionCompleted(event.payload);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    const processingTime = Date.now() - startTime;
    
    // Log successful webhook processing
    paymentLogger.logWebhookProcessed({
      event: event.event,
      webhookId,
      status: 'success',
      processingTime,
      metadata: {
        payload: event.payload
      }
    });

    res.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log webhook processing error
    paymentLogger.logWebhookError({
      event: event?.event || 'unknown',
      webhookId,
      error: error.message,
      payload: event?.payload
    });
    
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Failed to process webhook', error: error.message });
  }
});

// Webhook event handlers
async function handlePaymentCaptured(payload) {
  try {
    const { payment } = payload;
    const orderId = payment.order_id;

    // Update purchase
    const purchase = await Purchase.findOne({ razorpayOrderId: orderId });
    if (purchase) {
      purchase.status = 'completed';
      purchase.accessGranted = true;
      purchase.razorpayPaymentId = payment.id;
      await purchase.save();
    }

    // Update transaction
    const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    if (transaction) {
      await transaction.markSuccess({
        paymentId: payment.id,
        signature: payment.signature
      });
    }

    console.log('Payment captured successfully:', payment.id);
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

async function handlePaymentFailed(payload) {
  try {
    const { payment } = payload;
    const orderId = payment.order_id;

    // Update purchase
    const purchase = await Purchase.findOne({ razorpayOrderId: orderId });
    if (purchase) {
      purchase.status = 'failed';
      await purchase.save();
    }

    // Update transaction
    const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
    if (transaction) {
      await transaction.addError({
        code: 'PAYMENT_FAILED',
        message: payment.error_description || 'Payment failed',
        source: 'razorpay'
      });
    }

    console.log('Payment failed:', payment.id);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleSubscriptionActivated(payload) {
  try {
    const { subscription } = payload;
    
    // Find user by subscription notes
    const userId = subscription.notes?.userId;
    if (!userId) return;

    // Create or update subscription record
    const startDate = new Date(subscription.current_start * 1000);
    const endDate = new Date(subscription.current_end * 1000);

    await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: subscription.id },
      {
        user: userId,
        plan: subscription.notes?.plan || 'monthly',
        status: 'active',
        startDate,
        endDate,
        nextBillingDate: endDate,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency,
        razorpayPlanId: subscription.plan.id,
        autoRenew: !subscription.cancel_at_period_end
      },
      { upsert: true, new: true }
    );

    console.log('Subscription activated:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription activated:', error);
  }
}

async function handleSubscriptionCharged(payload) {
  try {
    const { subscription, payment } = payload;
    
    // Log the successful charge
    console.log('Subscription charged:', subscription.id, 'Payment:', payment.id);
    
    // You can add additional logic here like sending notifications
  } catch (error) {
    console.error('Error handling subscription charged:', error);
  }
}

async function handleSubscriptionCompleted(payload) {
  try {
    const { subscription } = payload;
    
    // Update subscription status
    const dbSubscription = await Subscription.findOne({ 
      razorpaySubscriptionId: subscription.id 
    });
    
    if (dbSubscription) {
      dbSubscription.status = 'expired';
      await dbSubscription.save();
    }

    console.log('Subscription completed:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription completed:', error);
  }
}

async function handleSubscriptionCancelled(payload) {
  try {
    const { subscription } = payload;
    
    // Update subscription status
    const dbSubscription = await Subscription.findOne({ 
      razorpaySubscriptionId: subscription.id 
    });
    
    if (dbSubscription) {
      await dbSubscription.cancel('Cancelled via Razorpay webhook');
    }

    console.log('Subscription cancelled:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

export default router;
