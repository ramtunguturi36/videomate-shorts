import express from 'express';
import File from '../models/File.js';
import Purchase from '../models/Purchase.js';
import User from '../models/User.js';
import { verifyToken, requireUser } from '../middleware/auth.js';
import { createOrder, verifyPayment } from '../config/razorpay.js';

const router = express.Router();

// Get video feed for reels
router.get('/videos', verifyToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, folderPath } = req.query;
    
    const query = {
      fileType: 'video',
      status: 'ready',
      'metadata.isPublic': true
    };

    // Filter by folder if specified
    if (folderPath) {
      query.folderPath = folderPath;
    }

    const videos = await File.find(query)
      .populate('uploadInfo.uploadedBy', 'name email')
      .sort({ 'uploadInfo.uploadDate': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Check which videos have associated images
    const videosWithImages = await Promise.all(
      videos.map(async (video) => {
        // Find associated image with same title (without Video suffix)
        const baseTitle = video.title.replace(' (Video)', '');
        const associatedImage = await File.findOne({
          fileType: 'image',
          title: `${baseTitle} (Image)`,
          folderPath: video.folderPath,
          status: 'ready'
        });

        // Check if user has purchased the image
        let hasPurchasedImage = false;
        if (associatedImage) {
          const purchase = await Purchase.hasActiveAccess(req.user._id, associatedImage._id);
          hasPurchasedImage = !!purchase;
        }

        return {
          ...video.toObject(),
          associatedImage: associatedImage ? {
            id: associatedImage._id,
            title: associatedImage.title,
            r2Url: associatedImage.r2Url,
            price: associatedImage.metadata.price,
            hasPurchased: hasPurchasedImage
          } : null
        };
      })
    );

    const total = await File.countDocuments(query);

    res.json({
      videos: videosWithImages,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get video feed error:', error);
    res.status(500).json({ message: 'Failed to get video feed' });
  }
});

// Get single video with associated image
router.get('/video/:id', verifyToken, requireUser, async (req, res) => {
  try {
    const video = await File.findById(req.params.id)
      .populate('uploadInfo.uploadedBy', 'name email');

    if (!video || video.fileType !== 'video') {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Find associated image
    const baseTitle = video.title.replace(' (Video)', '');
    const associatedImage = await File.findOne({
      fileType: 'image',
      title: `${baseTitle} (Image)`,
      folderPath: video.folderPath,
      status: 'ready'
    });

    // Check if user has purchased the image
    let hasPurchasedImage = false;
    if (associatedImage) {
      const purchase = await Purchase.hasActiveAccess(req.user._id, associatedImage._id);
      hasPurchasedImage = !!purchase;
    }

    // Increment view count
    await video.incrementViewCount();

    res.json({
      video: {
        ...video.toObject(),
        associatedImage: associatedImage ? {
          id: associatedImage._id,
          title: associatedImage.title,
          r2Url: associatedImage.r2Url,
          price: associatedImage.metadata.price,
          hasPurchased: hasPurchasedImage
        } : null
      }
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Failed to get video' });
  }
});

// Create payment order for image purchase
router.post('/purchase/create-order', verifyToken, requireUser, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    // Get file details
    const file = await File.findById(fileId);
    if (!file || file.fileType !== 'image') {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if user already purchased
    const existingPurchase = await Purchase.hasActiveAccess(req.user._id, fileId);
    if (existingPurchase) {
      return res.status(400).json({ message: 'You have already purchased this image' });
    }

    // Check user's subscription
    const user = await User.findById(req.user._id);
    if (user.subscriptionInfo.isActive && user.subscriptionInfo.plan !== 'free') {
      // User has active subscription, allow free access
      const purchase = new Purchase({
        user: req.user._id,
        file: fileId,
        amount: 0,
        paymentMethod: 'subscription',
        status: 'completed'
      });

      await purchase.save();

      return res.json({
        message: 'Image unlocked with subscription',
        purchase: {
          id: purchase._id,
          status: 'completed',
          amount: 0
        }
      });
    }

    // Create Razorpay order
    const order = await createOrder(
      file.metadata.price,
      'INR',
      `purchase_${fileId}_${req.user._id}`
    );

    // Create pending purchase record
    const purchase = new Purchase({
      user: req.user._id,
      file: fileId,
      amount: file.metadata.price,
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      status: 'pending'
    });

    await purchase.save();

    res.json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      purchase: {
        id: purchase._id,
        amount: file.metadata.price
      }
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Failed to create purchase order' });
  }
});

// Verify payment and complete purchase
router.post('/purchase/verify', verifyToken, requireUser, async (req, res) => {
  try {
    const { orderId, paymentId, signature, purchaseId } = req.body;

    if (!orderId || !paymentId || !signature || !purchaseId) {
      return res.status(400).json({ message: 'All payment details are required' });
    }

    // Verify payment with Razorpay
    const isValidPayment = await verifyPayment(orderId, paymentId, signature);
    if (!isValidPayment) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update purchase record
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }

    if (purchase.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    purchase.razorpayPaymentId = paymentId;
    purchase.razorpaySignature = signature;
    purchase.status = 'completed';
    await purchase.save();

    // Update user's purchase history
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        purchaseHistory: {
          productId: purchase.file.toString(),
          productName: 'Image Purchase',
          amount: purchase.amount,
          purchaseDate: new Date(),
          status: 'completed'
        }
      }
    });

    res.json({
      message: 'Payment verified successfully',
      purchase: {
        id: purchase._id,
        status: 'completed',
        amount: purchase.amount
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// Get user's purchase history
router.get('/purchases', verifyToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const purchases = await Purchase.getUserPurchases(req.user._id, {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Purchase.countDocuments({ user: req.user._id });

    res.json({
      purchases,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ message: 'Failed to get purchases' });
  }
});

// Check if user has purchased specific file
router.get('/purchase/check/:fileId', verifyToken, requireUser, async (req, res) => {
  try {
    const { fileId } = req.params;

    const purchase = await Purchase.hasActiveAccess(req.user._id, fileId);
    
    res.json({
      hasPurchased: !!purchase,
      purchase: purchase ? {
        id: purchase._id,
        amount: purchase.amount,
        purchaseDate: purchase.purchaseDate,
        status: purchase.status
      } : null
    });
  } catch (error) {
    console.error('Check purchase error:', error);
    res.status(500).json({ message: 'Failed to check purchase status' });
  }
});

export default router;
