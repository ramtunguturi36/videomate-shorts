import express from 'express';
import User from '../models/User.js';
import { verifyToken, requireUser } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);
router.use(requireUser);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionInfo: user.subscriptionInfo
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Get purchase history
router.get('/purchases', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('purchaseHistory');
    res.json({
      purchases: user.purchaseHistory.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase history' });
  }
});

// Add purchase (for testing/demo purposes)
router.post('/purchases', async (req, res) => {
  try {
    const { productId, productName, amount } = req.body;

    if (!productId || !productName || !amount) {
      return res.status(400).json({ message: 'Product ID, name, and amount are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const purchase = {
      productId,
      productName,
      amount,
      purchaseDate: new Date(),
      status: 'completed'
    };

    user.purchaseHistory.push(purchase);
    await user.save();

    res.status(201).json({
      message: 'Purchase added successfully',
      purchase
    });
  } catch (error) {
    console.error('Add purchase error:', error);
    res.status(500).json({ message: 'Failed to add purchase' });
  }
});

// Get subscription info
router.get('/subscription', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscriptionInfo');
    res.json({
      subscription: user.subscriptionInfo
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription info' });
  }
});

// Update subscription (for testing/demo purposes)
router.put('/subscription', async (req, res) => {
  try {
    const { plan, isActive } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (plan) user.subscriptionInfo.plan = plan;
    if (typeof isActive === 'boolean') user.subscriptionInfo.isActive = isActive;
    
    if (isActive) {
      user.subscriptionInfo.startDate = new Date();
      user.subscriptionInfo.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    await user.save();

    res.json({
      message: 'Subscription updated successfully',
      subscription: user.subscriptionInfo
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
});

export default router;
