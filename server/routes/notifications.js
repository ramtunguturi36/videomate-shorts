import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import NotificationService from '../services/notificationService.js';
import { notificationLogger } from '../utils/logger.js';

const router = express.Router();

// ==================== USER ROUTES ====================

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      important 
    } = req.query;

    const options = {
      status,
      type,
      important: important === 'true',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const notifications = await NotificationService.getUserNotifications(userId, options);
    const counts = await NotificationService.getNotificationCounts(userId);

    res.json({
      message: 'Notifications retrieved successfully',
      notifications: notifications.map(notification => ({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        formattedType: notification.formattedType,
        status: notification.status,
        isImportant: notification.isImportant,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        timeSinceCreation: notification.timeSinceCreation,
        readAt: notification.readAt,
        createdAt: notification.createdAt
      })),
      counts,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      message: 'Failed to get notifications',
      error: error.message
    });
  }
});

// Get notification counts
router.get('/counts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const counts = await NotificationService.getNotificationCounts(userId);

    res.json({
      message: 'Notification counts retrieved successfully',
      counts
    });

  } catch (error) {
    console.error('Error getting notification counts:', error);
    res.status(500).json({
      message: 'Failed to get notification counts',
      error: error.message
    });
  }
});

// Mark notifications as read
router.put('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    const result = await NotificationService.markAsRead(userId, notificationIds);

    res.json({
      message: 'Notifications marked as read successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

// Mark single notification as read
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Import Notification model here to avoid circular dependency
    const Notification = (await import('../models/Notification.js')).default;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: userId
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      message: 'Notification marked as read successfully'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Archive notifications
router.put('/archive', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    const result = await NotificationService.archiveNotifications(userId, notificationIds);

    res.json({
      message: 'Notifications archived successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error archiving notifications:', error);
    res.status(500).json({
      message: 'Failed to archive notifications',
      error: error.message
    });
  }
});

// Archive single notification
router.put('/:notificationId/archive', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Import Notification model here to avoid circular dependency
    const Notification = (await import('../models/Notification.js')).default;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: userId
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    await notification.archive();

    res.json({
      message: 'Notification archived successfully'
    });

  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({
      message: 'Failed to archive notification',
      error: error.message
    });
  }
});

// Get specific notification details
router.get('/:notificationId', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Import Notification model here to avoid circular dependency
    const Notification = (await import('../models/Notification.js')).default;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: userId
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    // Mark as read if it's unread
    if (notification.status === 'unread') {
      await notification.markAsRead();
    }

    res.json({
      message: 'Notification details retrieved successfully',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        formattedType: notification.formattedType,
        status: notification.status,
        isImportant: notification.isImportant,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        timeSinceCreation: notification.timeSinceCreation,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        metadata: notification.metadata
      }
    });

  } catch (error) {
    console.error('Error getting notification details:', error);
    res.status(500).json({
      message: 'Failed to get notification details',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:notificationId', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Import Notification model here to avoid circular dependency
    const Notification = (await import('../models/Notification.js')).default;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: userId
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    // Log deletion
    notificationLogger.logNotificationDeleted({
      notificationId: notification._id,
      userId,
      type: notification.type
    });

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await NotificationService.markAsRead(userId);

    res.json({
      message: 'All notifications marked as read successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Archive all notifications
router.put('/archive-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await NotificationService.archiveNotifications(userId);

    res.json({
      message: 'All notifications archived successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error archiving all notifications:', error);
    res.status(500).json({
      message: 'Failed to archive all notifications',
      error: error.message
    });
  }
});

export default router;
