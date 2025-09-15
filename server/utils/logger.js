import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define the format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define the format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports,
});

// Payment-specific logger
export const paymentLogger = {
  // Log payment initiation
  logPaymentInitiated: (data) => {
    logger.info('Payment initiated', {
      type: 'PAYMENT_INITIATED',
      userId: data.userId,
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      metadata: data.metadata
    });
  },

  // Log payment success
  logPaymentSuccess: (data) => {
    logger.info('Payment successful', {
      type: 'PAYMENT_SUCCESS',
      userId: data.userId,
      transactionId: data.transactionId,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      purchaseIds: data.purchaseIds,
      metadata: data.metadata
    });
  },

  // Log payment failure
  logPaymentFailure: (data) => {
    logger.error('Payment failed', {
      type: 'PAYMENT_FAILURE',
      userId: data.userId,
      transactionId: data.transactionId,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata
    });
  },

  // Log webhook received
  logWebhookReceived: (data) => {
    logger.info('Webhook received', {
      type: 'WEBHOOK_RECEIVED',
      event: data.event,
      webhookId: data.webhookId,
      signature: data.signature ? 'present' : 'missing',
      payload: data.payload
    });
  },

  // Log webhook processed
  logWebhookProcessed: (data) => {
    logger.info('Webhook processed', {
      type: 'WEBHOOK_PROCESSED',
      event: data.event,
      webhookId: data.webhookId,
      status: data.status,
      processingTime: data.processingTime,
      metadata: data.metadata
    });
  },

  // Log webhook error
  logWebhookError: (data) => {
    logger.error('Webhook processing error', {
      type: 'WEBHOOK_ERROR',
      event: data.event,
      webhookId: data.webhookId,
      error: data.error,
      payload: data.payload
    });
  }
};

// Subscription-specific logger
export const subscriptionLogger = {
  // Log subscription created
  logSubscriptionCreated: (data) => {
    logger.info('Subscription created', {
      type: 'SUBSCRIPTION_CREATED',
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      plan: data.plan,
      amount: data.amount,
      metadata: data.metadata
    });
  },

  // Log subscription activated
  logSubscriptionActivated: (data) => {
    logger.info('Subscription activated', {
      type: 'SUBSCRIPTION_ACTIVATED',
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      plan: data.plan,
      startDate: data.startDate,
      endDate: data.endDate
    });
  },

  // Log subscription cancelled
  logSubscriptionCancelled: (data) => {
    logger.info('Subscription cancelled', {
      type: 'SUBSCRIPTION_CANCELLED',
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      reason: data.reason,
      cancelledAt: data.cancelledAt
    });
  },

  // Log subscription expired
  logSubscriptionExpired: (data) => {
    logger.warn('Subscription expired', {
      type: 'SUBSCRIPTION_EXPIRED',
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      expiredAt: data.expiredAt
    });
  }
};

// Access control logger
export const accessLogger = {
  // Log image access granted
  logImageAccessGranted: (data) => {
    logger.info('Image access granted', {
      type: 'IMAGE_ACCESS_GRANTED',
      userId: data.userId,
      imageId: data.imageId,
      accessType: data.accessType,
      expiryDate: data.expiryDate,
      metadata: data.metadata
    });
  },

  // Log image access denied
  logImageAccessDenied: (data) => {
    logger.warn('Image access denied', {
      type: 'IMAGE_ACCESS_DENIED',
      userId: data.userId,
      imageId: data.imageId,
      reason: data.reason,
      metadata: data.metadata
    });
  },

  // Log access expiry
  logAccessExpired: (data) => {
    logger.info('Access expired', {
      type: 'ACCESS_EXPIRED',
      userId: data.userId,
      imageId: data.imageId,
      purchaseId: data.purchaseId,
      expiredAt: data.expiredAt
    });
  }
};

// Security logger
export const securityLogger = {
  // Log suspicious activity
  logSuspiciousActivity: (data) => {
    logger.warn('Suspicious activity detected', {
      type: 'SUSPICIOUS_ACTIVITY',
      userId: data.userId,
      activity: data.activity,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata
    });
  },

  // Log rate limit exceeded
  logRateLimitExceeded: (data) => {
    logger.warn('Rate limit exceeded', {
      type: 'RATE_LIMIT_EXCEEDED',
      userId: data.userId,
      endpoint: data.endpoint,
      limit: data.limit,
      window: data.window,
      ipAddress: data.ipAddress
    });
  }
};

// General application logger
export const appLogger = {
  // Log application startup
  logAppStartup: (data) => {
    logger.info('Application started', {
      type: 'APP_STARTUP',
      port: data.port,
      environment: data.environment,
      version: data.version,
      timestamp: new Date().toISOString()
    });
  },

  // Log database connection
  logDatabaseConnection: (data) => {
    logger.info('Database connected', {
      type: 'DATABASE_CONNECTED',
      database: data.database,
      host: data.host,
      timestamp: new Date().toISOString()
    });
  },

  // Log external service connection
  logServiceConnection: (data) => {
    logger.info('External service connected', {
      type: 'SERVICE_CONNECTED',
      service: data.service,
      status: data.status,
      timestamp: new Date().toISOString()
    });
  }
};

// Error logger with stack trace
export const errorLogger = {
  logError: (error, context = {}) => {
    logger.error('Application error', {
      type: 'APPLICATION_ERROR',
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date().toISOString()
    });
  },

  logValidationError: (error, context = {}) => {
    logger.warn('Validation error', {
      type: 'VALIDATION_ERROR',
      message: error.message,
      field: error.field,
      value: error.value,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logger
export const performanceLogger = {
  logSlowQuery: (data) => {
    logger.warn('Slow database query', {
      type: 'SLOW_QUERY',
      query: data.query,
      duration: data.duration,
      threshold: data.threshold,
      timestamp: new Date().toISOString()
    });
  },

  logSlowRequest: (data) => {
    logger.warn('Slow HTTP request', {
      type: 'SLOW_REQUEST',
      method: data.method,
      url: data.url,
      duration: data.duration,
      statusCode: data.statusCode,
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  }
};

// Issue tracking logger
export const issueLogger = {
  // Log issue created
  logIssueCreated: (data) => {
    logger.info('Issue created', {
      type: 'ISSUE_CREATED',
      issueId: data.issueId,
      userId: data.userId,
      category: data.category,
      priority: data.priority,
      transactionId: data.transactionId,
      purchaseId: data.purchaseId,
      metadata: data.metadata
    });
  },

  // Log issue status updated
  logIssueStatusUpdated: (data) => {
    logger.info('Issue status updated', {
      type: 'ISSUE_STATUS_UPDATED',
      issueId: data.issueId,
      adminId: data.adminId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      details: data.details,
      metadata: data.metadata
    });
  },

  // Log issue resolved
  logIssueResolved: (data) => {
    logger.info('Issue resolved', {
      type: 'ISSUE_RESOLVED',
      issueId: data.issueId,
      adminId: data.adminId,
      resolution: data.resolution,
      metadata: data.metadata
    });
  },

  // Log issue assigned
  logIssueAssigned: (data) => {
    logger.info('Issue assigned', {
      type: 'ISSUE_ASSIGNED',
      issueId: data.issueId,
      assignedTo: data.assignedTo,
      assignedBy: data.assignedBy,
      metadata: data.metadata
    });
  }
};

// Contact message logger
export const contactLogger = {
  // Log contact message created
  logContactMessageCreated: (data) => {
    logger.info('Contact message created', {
      type: 'CONTACT_MESSAGE_CREATED',
      messageId: data.messageId,
      userId: data.userId,
      email: data.email,
      category: data.category,
      priority: data.priority,
      source: data.source,
      metadata: data.metadata
    });
  },

  // Log contact response sent
  logContactResponseSent: (data) => {
    logger.info('Contact response sent', {
      type: 'CONTACT_RESPONSE_SENT',
      messageId: data.messageId,
      adminId: data.adminId,
      responseLength: data.responseLength,
      isPublic: data.isPublic,
      metadata: data.metadata
    });
  },

  // Log contact status updated
  logContactStatusUpdated: (data) => {
    logger.info('Contact status updated', {
      type: 'CONTACT_STATUS_UPDATED',
      messageId: data.messageId,
      adminId: data.adminId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      details: data.details,
      metadata: data.metadata
    });
  },

  // Log contact resolved
  logContactResolved: (data) => {
    logger.info('Contact resolved', {
      type: 'CONTACT_RESOLVED',
      messageId: data.messageId,
      adminId: data.adminId,
      metadata: data.metadata
    });
  }
};

// Support system logger
export const supportLogger = {
  // Log issue status update
  logIssueStatusUpdated: (data) => {
    logger.info('Issue status updated', {
      type: 'SUPPORT_ISSUE_STATUS_UPDATED',
      issueId: data.issueId,
      adminId: data.adminId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      details: data.details,
      metadata: data.metadata
    });
  },

  // Log issue resolved
  logIssueResolved: (data) => {
    logger.info('Issue resolved', {
      type: 'SUPPORT_ISSUE_RESOLVED',
      issueId: data.issueId,
      adminId: data.adminId,
      resolution: data.resolution,
      metadata: data.metadata
    });
  },

  // Log contact status update
  logContactStatusUpdated: (data) => {
    logger.info('Contact status updated', {
      type: 'SUPPORT_CONTACT_STATUS_UPDATED',
      messageId: data.messageId,
      adminId: data.adminId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      details: data.details,
      metadata: data.metadata
    });
  },

  // Log contact response sent
  logContactResponseSent: (data) => {
    logger.info('Contact response sent', {
      type: 'SUPPORT_CONTACT_RESPONSE_SENT',
      messageId: data.messageId,
      adminId: data.adminId,
      responseLength: data.responseLength,
      isPublic: data.isPublic,
      metadata: data.metadata
    });
  },

  // Log contact resolved
  logContactResolved: (data) => {
    logger.info('Contact resolved', {
      type: 'SUPPORT_CONTACT_RESOLVED',
      messageId: data.messageId,
      adminId: data.adminId,
      metadata: data.metadata
    });
  }
};

// Notification logger
export const notificationLogger = {
  // Log notification created
  logNotificationCreated: (data) => {
    logger.info('Notification created', {
      type: 'NOTIFICATION_CREATED',
      notificationId: data.notificationId,
      userId: data.userId,
      notificationType: data.type,
      title: data.title,
      deliveryMethod: data.deliveryMethod,
      metadata: data.metadata
    });
  },

  // Log email sent
  logEmailSent: (data) => {
    logger.info('Email notification sent', {
      type: 'EMAIL_NOTIFICATION_SENT',
      notificationId: data.notificationId,
      userId: data.userId,
      email: data.email,
      notificationType: data.type
    });
  },

  // Log bulk notification sent
  logBulkNotificationSent: (data) => {
    logger.info('Bulk notification sent', {
      type: 'BULK_NOTIFICATION_SENT',
      notificationCount: data.notificationCount,
      userIds: data.userIds,
      notificationType: data.type,
      title: data.title,
      deliveryMethod: data.deliveryMethod
    });
  },

  // Log notifications read
  logNotificationsRead: (data) => {
    logger.info('Notifications marked as read', {
      type: 'NOTIFICATIONS_READ',
      userId: data.userId,
      notificationIds: data.notificationIds,
      count: data.count
    });
  },

  // Log notifications archived
  logNotificationsArchived: (data) => {
    logger.info('Notifications archived', {
      type: 'NOTIFICATIONS_ARCHIVED',
      userId: data.userId,
      notificationIds: data.notificationIds,
      count: data.count
    });
  },

  // Log notification deleted
  logNotificationDeleted: (data) => {
    logger.info('Notification deleted', {
      type: 'NOTIFICATION_DELETED',
      notificationId: data.notificationId,
      userId: data.userId,
      notificationType: data.type
    });
  }
};

// Content management logger
export const contentLogger = {
  // Log content created
  logContentCreated: (data) => {
    logger.info('Content created', {
      type: 'CONTENT_CREATED',
      contentId: data.contentId,
      contentType: data.contentType,
      adminId: data.adminId,
      filename: data.filename,
      fileSize: data.fileSize,
      metadata: data.metadata
    });
  },

  // Log content updated
  logContentUpdated: (data) => {
    logger.info('Content updated', {
      type: 'CONTENT_UPDATED',
      contentId: data.contentId,
      contentType: data.contentType,
      adminId: data.adminId,
      changes: data.changes,
      metadata: data.metadata
    });
  },

  // Log content deleted
  logContentDeleted: (data) => {
    logger.info('Content deleted', {
      type: 'CONTENT_DELETED',
      contentId: data.contentId,
      contentType: data.contentType,
      adminId: data.adminId,
      filename: data.filename,
      metadata: data.metadata
    });
  },

  // Log content moved
  logContentMoved: (data) => {
    logger.info('Content moved', {
      type: 'CONTENT_MOVED',
      contentIds: data.contentIds,
      contentType: data.contentType,
      targetFolder: data.targetFolder,
      adminId: data.adminId,
      movedCount: data.movedCount,
      metadata: data.metadata
    });
  },

  // Log folder created
  logFolderCreated: (data) => {
    logger.info('Folder created', {
      type: 'FOLDER_CREATED',
      folderName: data.folderName,
      adminId: data.adminId,
      metadata: data.metadata
    });
  },

  // Log folder deleted
  logFolderDeleted: (data) => {
    logger.info('Folder deleted', {
      type: 'FOLDER_DELETED',
      folderName: data.folderName,
      adminId: data.adminId,
      metadata: data.metadata
    });
  }
};

// Analytics logger
export const analyticsLogger = {
  // Log analytics accessed
  logAnalyticsAccessed: (data) => {
    logger.info('Analytics accessed', {
      type: 'ANALYTICS_ACCESSED',
      analyticsType: data.type,
      adminId: data.adminId,
      filters: data.filters,
      metadata: data.metadata
    });
  },

  // Log real-time stats accessed
  logRealTimeStatsAccessed: (data) => {
    logger.info('Real-time stats accessed', {
      type: 'REAL_TIME_STATS_ACCESSED',
      adminId: data.adminId,
      metadata: data.metadata
    });
  },

  // Log dashboard accessed
  logDashboardAccessed: (data) => {
    logger.info('Dashboard accessed', {
      type: 'DASHBOARD_ACCESSED',
      adminId: data.adminId,
      filters: data.filters,
      metadata: data.metadata
    });
  },

  // Log analytics exported
  logAnalyticsExported: (data) => {
    logger.info('Analytics exported', {
      type: 'ANALYTICS_EXPORTED',
      exportType: data.type,
      adminId: data.adminId,
      format: data.format,
      filters: data.filters,
      metadata: data.metadata
    });
  }
};

// Admin logger
export const adminLogger = {
  // Log plan created
  logPlanCreated: (data) => {
    logger.info('Subscription plan created', {
      type: 'PLAN_CREATED',
      adminId: data.adminId,
      planId: data.planId,
      planName: data.planName,
      price: data.price,
      billingCycle: data.billingCycle,
      metadata: data.metadata
    });
  },

  // Log plan updated
  logPlanUpdated: (data) => {
    logger.info('Subscription plan updated', {
      type: 'PLAN_UPDATED',
      adminId: data.adminId,
      planId: data.planId,
      planName: data.planName,
      changes: data.changes,
      metadata: data.metadata
    });
  },

  // Log plan deleted
  logPlanDeleted: (data) => {
    logger.info('Subscription plan deleted', {
      type: 'PLAN_DELETED',
      adminId: data.adminId,
      planId: data.planId,
      planName: data.planName,
      metadata: data.metadata
    });
  },

  // Log default plans initialized
  logDefaultPlansInitialized: (data) => {
    logger.info('Default subscription plans initialized', {
      type: 'DEFAULT_PLANS_INITIALIZED',
      adminId: data.adminId,
      plansCount: data.plansCount,
      metadata: data.metadata
    });
  },

  // Log admin login
  logAdminLogin: (data) => {
    logger.info('Admin login', {
      type: 'ADMIN_LOGIN',
      adminId: data.adminId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata
    });
  },

  // Log admin action
  logAdminAction: (data) => {
    logger.info('Admin action performed', {
      type: 'ADMIN_ACTION',
      adminId: data.adminId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details,
      metadata: data.metadata
    });
  }
};

// Transaction monitoring logger
export const transactionLogger = {
  // Log transaction monitoring accessed
  logTransactionMonitoringAccessed: (data) => {
    logger.info('Transaction monitoring accessed', {
      type: 'TRANSACTION_MONITORING_ACCESSED',
      adminId: data.adminId,
      filters: data.filters,
      metadata: data.metadata
    });
  },

  // Log transaction details accessed
  logTransactionDetailsAccessed: (data) => {
    logger.info('Transaction details accessed', {
      type: 'TRANSACTION_DETAILS_ACCESSED',
      transactionId: data.transactionId,
      adminId: data.adminId,
      metadata: data.metadata
    });
  },

  // Log transaction status updated
  logTransactionStatusUpdated: (data) => {
    logger.info('Transaction status updated', {
      type: 'TRANSACTION_STATUS_UPDATED',
      transactionId: data.transactionId,
      adminId: data.adminId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      reason: data.reason,
      metadata: data.metadata
    });
  },

  // Log transaction refunded
  logTransactionRefunded: (data) => {
    logger.info('Transaction refunded', {
      type: 'TRANSACTION_REFUNDED',
      transactionId: data.transactionId,
      adminId: data.adminId,
      refundAmount: data.refundAmount,
      reason: data.reason,
      metadata: data.metadata
    });
  },

  // Log transaction stats accessed
  logTransactionStatsAccessed: (data) => {
    logger.info('Transaction stats accessed', {
      type: 'TRANSACTION_STATS_ACCESSED',
      adminId: data.adminId,
      filters: data.filters,
      metadata: data.metadata
    });
  },

  // Log user transaction history accessed
  logUserTransactionHistoryAccessed: (data) => {
    logger.info('User transaction history accessed', {
      type: 'USER_TRANSACTION_HISTORY_ACCESSED',
      userId: data.userId,
      adminId: data.adminId,
      metadata: data.metadata
    });
  },

  // Log transactions exported
  logTransactionsExported: (data) => {
    logger.info('Transactions exported', {
      type: 'TRANSACTIONS_EXPORTED',
      adminId: data.adminId,
      format: data.format,
      filters: data.filters,
      transactionCount: data.transactionCount,
      metadata: data.metadata
    });
  }
};

export default logger;
