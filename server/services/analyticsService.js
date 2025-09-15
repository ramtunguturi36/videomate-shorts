import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import VideoFile from '../models/VideoFile.js';
import ImageFile from '../models/ImageFile.js';
import Issue from '../models/Issue.js';
import ContactMessage from '../models/ContactMessage.js';

class AnalyticsService {
  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo, period = 'daily' } = filters;
      
      // Build match stage for date filtering
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) {
          matchStage.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          matchStage.createdAt.$lte = new Date(dateTo);
        }
      }

      // Get revenue data
      const revenueData = await Transaction.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === 'daily' ? '%Y-%m-%d' : '%Y-%m',
                date: '$createdAt'
              }
            },
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            averageTransaction: { $avg: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get subscription revenue
      const subscriptionRevenue = await Subscription.aggregate([
        { $match: { ...matchStage, status: 'active' } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === 'daily' ? '%Y-%m-%d' : '%Y-%m',
                date: '$createdAt'
              }
            },
            subscriptionRevenue: { $sum: '$amount' },
            subscriptionCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Calculate totals
      const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
      const totalTransactions = revenueData.reduce((sum, item) => sum + item.transactionCount, 0);
      const totalSubscriptions = subscriptionRevenue.reduce((sum, item) => sum + item.subscriptionCount, 0);

      return {
        revenueData,
        subscriptionRevenue,
        totals: {
          totalRevenue,
          totalTransactions,
          totalSubscriptions,
          averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
        }
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get content analytics
   */
  static async getContentAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo, limit = 10 } = filters;
      
      // Build match stage for date filtering
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) {
          matchStage.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          matchStage.createdAt.$lte = new Date(dateTo);
        }
      }

      // Get top-selling videos
      const topVideos = await Purchase.aggregate([
        { $match: { ...matchStage, status: 'completed', videoId: { $exists: true } } },
        {
          $group: {
            _id: '$videoId',
            purchaseCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' }
          }
        },
        {
          $lookup: {
            from: 'videofiles',
            localField: '_id',
            foreignField: '_id',
            as: 'video'
          }
        },
        { $unwind: '$video' },
        {
          $project: {
            videoId: '$_id',
            title: '$video.title',
            filename: '$video.filename',
            purchaseCount: 1,
            totalRevenue: 1
          }
        },
        { $sort: { purchaseCount: -1 } },
        { $limit: limit }
      ]);

      // Get top-selling images
      const topImages = await Purchase.aggregate([
        { $match: { ...matchStage, status: 'completed', imageId: { $exists: true } } },
        {
          $group: {
            _id: '$imageId',
            purchaseCount: { $sum: 1 },
            totalRevenue: { $sum: '$amount' }
          }
        },
        {
          $lookup: {
            from: 'imagefiles',
            localField: '_id',
            foreignField: '_id',
            as: 'image'
          }
        },
        { $unwind: '$image' },
        {
          $project: {
            imageId: '$_id',
            title: '$image.title',
            filename: '$image.filename',
            purchaseCount: 1,
            totalRevenue: 1
          }
        },
        { $sort: { purchaseCount: -1 } },
        { $limit: limit }
      ]);

      // Get content statistics
      const contentStats = await Promise.all([
        VideoFile.countDocuments(),
        ImageFile.countDocuments(),
        Purchase.countDocuments({ status: 'completed' })
      ]);

      return {
        topVideos,
        topImages,
        stats: {
          totalVideos: contentStats[0],
          totalImages: contentStats[1],
          totalPurchases: contentStats[2]
        }
      };
    } catch (error) {
      console.error('Error getting content analytics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      
      // Build match stage for date filtering
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) {
          matchStage.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          matchStage.createdAt.$lte = new Date(dateTo);
        }
      }

      // Get user statistics
      const userStats = await User.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            newUsers: { $sum: 1 }
          }
        }
      ]);

      // Get active subscriptions
      const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });

      // Get user engagement metrics
      const userEngagement = await Purchase.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        {
          $group: {
            _id: '$userId',
            purchaseCount: { $sum: 1 },
            totalSpent: { $sum: '$amount' }
          }
        },
        {
          $group: {
            _id: null,
            activeUsers: { $sum: 1 },
            averagePurchasesPerUser: { $avg: '$purchaseCount' },
            averageSpentPerUser: { $avg: '$totalSpent' }
          }
        }
      ]);

      // Get user registration trends
      const registrationTrends = await User.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        stats: {
          totalUsers: userStats[0]?.totalUsers || 0,
          activeSubscriptions,
          activeUsers: userEngagement[0]?.activeUsers || 0,
          averagePurchasesPerUser: userEngagement[0]?.averagePurchasesPerUser || 0,
          averageSpentPerUser: userEngagement[0]?.averageSpentPerUser || 0
        },
        registrationTrends
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get transaction monitoring data
   */
  static async getTransactionMonitoring(filters = {}) {
    try {
      const {
        userId,
        dateFrom,
        dateTo,
        status,
        paymentMethod,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = {};
      if (userId) query.userId = mongoose.Types.ObjectId(userId);
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Get transactions with pagination
      const transactions = await Transaction.find(query)
        .populate('userId', 'name email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit)
        .skip((page - 1) * limit);

      // Get total count
      const total = await Transaction.countDocuments(query);

      // Get transaction statistics
      const stats = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 },
            averageAmount: { $avg: '$amount' },
            successfulCount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        transactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        },
        stats: stats[0] || {
          totalAmount: 0,
          totalCount: 0,
          averageAmount: 0,
          successfulCount: 0,
          failedCount: 0
        }
      };
    } catch (error) {
      console.error('Error getting transaction monitoring:', error);
      throw error;
    }
  }

  /**
   * Get support analytics
   */
  static async getSupportAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      
      // Build match stage for date filtering
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) {
          matchStage.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          matchStage.createdAt.$lte = new Date(dateTo);
        }
      }

      // Get issue statistics
      const issueStats = await Issue.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalIssues: { $sum: 1 },
            openIssues: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            inProgressIssues: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            resolvedIssues: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            urgentIssues: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
          }
        }
      ]);

      // Get contact message statistics
      const contactStats = await ContactMessage.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            newMessages: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
            respondedMessages: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
            resolvedMessages: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
          }
        }
      ]);

      return {
        issues: issueStats[0] || {
          totalIssues: 0,
          openIssues: 0,
          inProgressIssues: 0,
          resolvedIssues: 0,
          urgentIssues: 0
        },
        contacts: contactStats[0] || {
          totalMessages: 0,
          newMessages: 0,
          respondedMessages: 0,
          resolvedMessages: 0
        }
      };
    } catch (error) {
      console.error('Error getting support analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard statistics
   */
  static async getRealTimeStats() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Get today's stats
      const todayStats = await Promise.all([
        Transaction.countDocuments({ createdAt: { $gte: today }, status: 'completed' }),
        Transaction.aggregate([
          { $match: { createdAt: { $gte: today }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        User.countDocuments({ createdAt: { $gte: today } }),
        Issue.countDocuments({ createdAt: { $gte: today } })
      ]);

      // Get this month's stats
      const monthStats = await Promise.all([
        Transaction.countDocuments({ createdAt: { $gte: thisMonth }, status: 'completed' }),
        Transaction.aggregate([
          { $match: { createdAt: { $gte: thisMonth }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        User.countDocuments({ createdAt: { $gte: thisMonth } }),
        Subscription.countDocuments({ status: 'active' })
      ]);

      // Get yesterday's stats for comparison
      const yesterdayStats = await Promise.all([
        Transaction.countDocuments({ createdAt: { $gte: yesterday, $lt: today }, status: 'completed' }),
        Transaction.aggregate([
          { $match: { createdAt: { $gte: yesterday, $lt: today }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      return {
        today: {
          transactions: todayStats[0],
          revenue: todayStats[1][0]?.total || 0,
          newUsers: todayStats[2],
          newIssues: todayStats[3]
        },
        thisMonth: {
          transactions: monthStats[0],
          revenue: monthStats[1][0]?.total || 0,
          newUsers: monthStats[2],
          activeSubscriptions: monthStats[3]
        },
        yesterday: {
          transactions: yesterdayStats[0],
          revenue: yesterdayStats[1][0]?.total || 0
        },
        trends: {
          transactionGrowth: todayStats[0] - yesterdayStats[0],
          revenueGrowth: (todayStats[1][0]?.total || 0) - (yesterdayStats[1][0]?.total || 0)
        }
      };
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      throw error;
    }
  }

  /**
   * Get folder structure analytics
   */
  static async getFolderAnalytics() {
    try {
      // Get video folder distribution
      const videoFolders = await VideoFile.aggregate([
        {
          $group: {
            _id: '$folder',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get image folder distribution
      const imageFolders = await ImageFile.aggregate([
        {
          $group: {
            _id: '$folder',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        videoFolders,
        imageFolders
      };
    } catch (error) {
      console.error('Error getting folder analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      
      // Build match stage for date filtering
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) {
          matchStage.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          matchStage.createdAt.$lte = new Date(dateTo);
        }
      }

      // Get conversion rates
      const conversionData = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            }
          }
        }
      ]);

      // Get average response time for support
      const supportResponseTime = await ContactMessage.aggregate([
        { 
          $match: { 
            ...matchStage, 
            respondedAt: { $exists: true, $ne: null } 
          } 
        },
        {
          $project: {
            responseTime: {
              $subtract: ['$respondedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            averageResponseTime: { $avg: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' }
          }
        }
      ]);

      const conversion = conversionData[0] || {
        totalTransactions: 0,
        successfulTransactions: 0,
        totalRevenue: 0
      };

      return {
        conversion: {
          rate: conversion.totalTransactions > 0 
            ? (conversion.successfulTransactions / conversion.totalTransactions) * 100 
            : 0,
          totalTransactions: conversion.totalTransactions,
          successfulTransactions: conversion.successfulTransactions,
          totalRevenue: conversion.totalRevenue
        },
        support: {
          averageResponseTime: supportResponseTime[0]?.averageResponseTime || 0,
          minResponseTime: supportResponseTime[0]?.minResponseTime || 0,
          maxResponseTime: supportResponseTime[0]?.maxResponseTime || 0
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
