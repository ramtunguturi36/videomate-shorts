import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import subscriptionPlansRouter from './admin/subscriptionPlans.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// Subscription plans management
router.use('/subscription-plans', subscriptionPlansRouter);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, subscriptionInfo } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (subscriptionInfo) user.subscriptionInfo = { ...user.subscriptionInfo, ...subscriptionInfo };

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionInfo: user.subscriptionInfo
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await User.countDocuments({ 'subscriptionInfo.isActive': true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionInfo.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalUsers,
      activeSubscriptions,
      newUsersThisMonth,
      subscriptionStats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get purchase history
router.get('/purchases', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({ 'purchaseHistory.0': { $exists: true } })
      .select('name email purchaseHistory')
      .sort({ 'purchaseHistory.purchaseDate': -1 })
      .skip(skip)
      .limit(limit);

    // Flatten purchase history
    const purchases = [];
    users.forEach(user => {
      user.purchaseHistory.forEach(purchase => {
        purchases.push({
          ...purchase.toObject(),
          userName: user.name,
          userEmail: user.email
        });
      });
    });

    res.json({
      purchases: purchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)),
      pagination: {
        current: page,
        pages: Math.ceil(purchases.length / limit),
        total: purchases.length
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ message: 'Failed to fetch purchases' });
  }
});

export default router;
