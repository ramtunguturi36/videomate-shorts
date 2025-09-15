import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { notificationLogger } from '../utils/logger.js';

class NotificationService {
  /**
   * Create and send a notification
   */
  static async sendNotification(data) {
    try {
      const notification = Notification.createNotification(data);
      await notification.save();

      // Log notification creation
      notificationLogger.logNotificationCreated({
        notificationId: notification._id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        deliveryMethod: data.deliveryMethod,
        metadata: data.metadata
      });

      // Send email if required
      if (data.deliveryMethod === 'email' || data.deliveryMethod === 'both') {
        await this.sendEmailNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(notification) {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error('User not found for notification');
      }

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log the email that would be sent
      console.log(`Email notification would be sent to ${user.email}:`);
      console.log(`Subject: ${notification.title}`);
      console.log(`Message: ${notification.message}`);
      
      if (notification.actionUrl) {
        console.log(`Action URL: ${notification.actionUrl}`);
      }

      // Mark email as sent
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();

      // Log email sent
      notificationLogger.logEmailSent({
        notificationId: notification._id,
        userId: notification.userId,
        email: user.email,
        type: notification.type
      });

    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw error to avoid breaking the main notification flow
    }
  }

  /**
   * Send issue status update notification
   */
  static async sendIssueStatusUpdate(issue, oldStatus, newStatus, updatedBy) {
    try {
      const user = await User.findById(issue.userId);
      if (!user) {
        throw new Error('User not found for issue notification');
      }

      const statusMessages = {
        'open': 'Your issue has been opened',
        'in_progress': 'Your issue is now being worked on',
        'resolved': 'Your issue has been resolved',
        'closed': 'Your issue has been closed'
      };

      const title = `Issue Update: ${issue.title}`;
      const message = statusMessages[newStatus] || `Your issue status has been updated to ${newStatus}`;
      
      const actionUrl = `/issues/${issue._id}`;
      const actionText = 'View Issue';

      await this.sendNotification({
        userId: issue.userId,
        title,
        message,
        type: 'issue_update',
        relatedEntityType: 'issue',
        relatedEntityId: issue._id,
        isImportant: newStatus === 'resolved' || newStatus === 'closed',
        deliveryMethod: 'both',
        actionUrl,
        actionText,
        metadata: {
          issueId: issue._id,
          oldStatus,
          newStatus,
          updatedBy: updatedBy.toString()
        }
      });

    } catch (error) {
      console.error('Error sending issue status update notification:', error);
    }
  }

  /**
   * Send contact message response notification
   */
  static async sendContactResponse(contactMessage, response, respondedBy) {
    try {
      const user = await User.findById(contactMessage.userId);
      if (!user) {
        throw new Error('User not found for contact notification');
      }

      const title = `Response to: ${contactMessage.subject}`;
      const message = `We've responded to your contact message. ${response.substring(0, 100)}...`;
      
      const actionUrl = `/contact/${contactMessage._id}`;
      const actionText = 'View Response';

      await this.sendNotification({
        userId: contactMessage.userId,
        title,
        message,
        type: 'contact_response',
        relatedEntityType: 'contact_message',
        relatedEntityId: contactMessage._id,
        isImportant: true,
        deliveryMethod: 'both',
        actionUrl,
        actionText,
        metadata: {
          contactMessageId: contactMessage._id,
          respondedBy: respondedBy.toString(),
          responseLength: response.length
        }
      });

    } catch (error) {
      console.error('Error sending contact response notification:', error);
    }
  }

  /**
   * Send payment update notification
   */
  static async sendPaymentUpdate(purchase, updateType, details = '') {
    try {
      const user = await User.findById(purchase.userId);
      if (!user) {
        throw new Error('User not found for payment notification');
      }

      const updateMessages = {
        'completed': 'Your payment has been processed successfully',
        'failed': 'Your payment could not be processed',
        'refunded': 'Your payment has been refunded',
        'expired': 'Your payment access has expired'
      };

      const title = `Payment Update: ${purchase.amount ? `₹${purchase.amount}` : 'Purchase'}`;
      const message = updateMessages[updateType] || `Your payment status has been updated: ${updateType}`;
      
      const actionUrl = `/purchases/${purchase._id}`;
      const actionText = 'View Purchase';

      await this.sendNotification({
        userId: purchase.userId,
        title,
        message,
        type: 'payment_update',
        relatedEntityType: 'purchase',
        relatedEntityId: purchase._id,
        isImportant: updateType === 'failed' || updateType === 'refunded',
        deliveryMethod: 'both',
        actionUrl,
        actionText,
        metadata: {
          purchaseId: purchase._id,
          updateType,
          amount: purchase.amount,
          details
        }
      });

    } catch (error) {
      console.error('Error sending payment update notification:', error);
    }
  }

  /**
   * Send system notification
   */
  static async sendSystemNotification(userId, title, message, isImportant = false) {
    try {
      await this.sendNotification({
        userId,
        title,
        message,
        type: 'system',
        isImportant,
        deliveryMethod: 'in_app',
        metadata: {
          systemNotification: true
        }
      });

    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotification(userIds, title, message, type = 'system', options = {}) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title,
        message,
        type,
        isImportant: options.isImportant || false,
        deliveryMethod: options.deliveryMethod || 'in_app',
        metadata: options.metadata || {}
      }));

      const createdNotifications = await Notification.insertMany(notifications);

      // Log bulk notification
      notificationLogger.logBulkNotificationSent({
        notificationCount: createdNotifications.length,
        userIds,
        type,
        title,
        deliveryMethod: options.deliveryMethod || 'in_app'
      });

      return createdNotifications;

    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const notifications = await Notification.getUserNotifications(userId, options);
      return notifications;

    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId, notificationIds = []) {
    try {
      const result = await Notification.markAsRead(userId, notificationIds);
      
      // Log read action
      notificationLogger.logNotificationsRead({
        userId,
        notificationIds,
        count: result.modifiedCount
      });

      return result;

    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Archive notifications
   */
  static async archiveNotifications(userId, notificationIds = []) {
    try {
      const result = await Notification.archiveNotifications(userId, notificationIds);
      
      // Log archive action
      notificationLogger.logNotificationsArchived({
        userId,
        notificationIds,
        count: result.modifiedCount
      });

      return result;

    } catch (error) {
      console.error('Error archiving notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification counts for user
   */
  static async getNotificationCounts(userId) {
    try {
      const counts = await Notification.getNotificationCounts(userId);
      const countMap = {};
      
      counts.forEach(count => {
        countMap[count._id] = count.count;
      });

      return {
        unread: countMap.unread || 0,
        read: countMap.read || 0,
        archived: countMap.archived || 0,
        total: (countMap.unread || 0) + (countMap.read || 0) + (countMap.archived || 0)
      };

    } catch (error) {
      console.error('Error getting notification counts:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;

    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;
