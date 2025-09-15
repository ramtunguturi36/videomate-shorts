import express from 'express';
import { verifyToken, requireAdmin } from '../auth.js';
import AnalyticsService from '../../services/analyticsService.js';
import { analyticsLogger } from '../../utils/logger.js';

const router = express.Router();

// ==================== REVENUE ANALYTICS ====================

// Get revenue analytics
router.get('/revenue', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo, period = 'daily' } = req.query;
    const adminId = req.admin._id;

    const analytics = await AnalyticsService.getRevenueAnalytics({
      dateFrom,
      dateTo,
      period
    });

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'revenue',
      adminId,
      filters: { dateFrom, dateTo, period },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Revenue analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    res.status(500).json({
      message: 'Failed to get revenue analytics',
      error: error.message
    });
  }
});

// ==================== CONTENT ANALYTICS ====================

// Get content analytics
router.get('/content', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query;
    const adminId = req.admin._id;

    const analytics = await AnalyticsService.getContentAnalytics({
      dateFrom,
      dateTo,
      limit: parseInt(limit)
    });

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'content',
      adminId,
      filters: { dateFrom, dateTo, limit },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Content analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Error getting content analytics:', error);
    res.status(500).json({
      message: 'Failed to get content analytics',
      error: error.message
    });
  }
});

// ==================== USER ANALYTICS ====================

// Get user analytics
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const adminId = req.admin._id;

    const analytics = await AnalyticsService.getUserAnalytics({
      dateFrom,
      dateTo
    });

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'users',
      adminId,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'User analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      message: 'Failed to get user analytics',
      error: error.message
    });
  }
});

// ==================== SUPPORT ANALYTICS ====================

// Get support analytics
router.get('/support', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const adminId = req.admin._id;

    const analytics = await AnalyticsService.getSupportAnalytics({
      dateFrom,
      dateTo
    });

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'support',
      adminId,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Support analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Error getting support analytics:', error);
    res.status(500).json({
      message: 'Failed to get support analytics',
      error: error.message
    });
  }
});

// ==================== REAL-TIME STATISTICS ====================

// Get real-time dashboard statistics
router.get('/realtime', verifyToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.admin._id;

    const stats = await AnalyticsService.getRealTimeStats();

    // Log real-time stats access
    analyticsLogger.logRealTimeStatsAccessed({
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Real-time statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Error getting real-time statistics:', error);
    res.status(500).json({
      message: 'Failed to get real-time statistics',
      error: error.message
    });
  }
});

// ==================== FOLDER ANALYTICS ====================

// Get folder analytics
router.get('/folders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.admin._id;

    const analytics = await AnalyticsService.getFolderAnalytics();

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'folders',
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Folder analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Error getting folder analytics:', error);
    res.status(500).json({
      message: 'Failed to get folder analytics',
      error: error.message
    });
  }
});

// ==================== PERFORMANCE METRICS ====================

// Get performance metrics
router.get('/performance', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const adminId = req.admin._id;

    const metrics = await AnalyticsService.getPerformanceMetrics({
      dateFrom,
      dateTo
    });

    // Log analytics access
    analyticsLogger.logAnalyticsAccessed({
      type: 'performance',
      adminId,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Performance metrics retrieved successfully',
      metrics
    });

  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
});

// ==================== COMPREHENSIVE DASHBOARD ====================

// Get comprehensive dashboard data
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const adminId = req.admin._id;

    // Get all analytics in parallel
    const [
      realTimeStats,
      revenueAnalytics,
      contentAnalytics,
      userAnalytics,
      supportAnalytics,
      folderAnalytics,
      performanceMetrics
    ] = await Promise.all([
      AnalyticsService.getRealTimeStats(),
      AnalyticsService.getRevenueAnalytics({ dateFrom, dateTo, period: 'daily' }),
      AnalyticsService.getContentAnalytics({ dateFrom, dateTo, limit: 5 }),
      AnalyticsService.getUserAnalytics({ dateFrom, dateTo }),
      AnalyticsService.getSupportAnalytics({ dateFrom, dateTo }),
      AnalyticsService.getFolderAnalytics(),
      AnalyticsService.getPerformanceMetrics({ dateFrom, dateTo })
    ]);

    const dashboardData = {
      realTime: realTimeStats,
      revenue: revenueAnalytics,
      content: contentAnalytics,
      users: userAnalytics,
      support: supportAnalytics,
      folders: folderAnalytics,
      performance: performanceMetrics
    };

    // Log dashboard access
    analyticsLogger.logDashboardAccessed({
      adminId,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Dashboard data retrieved successfully',
      dashboard: dashboardData
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      message: 'Failed to get dashboard data',
      error: error.message
    });
  }
});

// ==================== EXPORT ANALYTICS ====================

// Export analytics data
router.post('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type, dateFrom, dateTo, format = 'json' } = req.body;
    const adminId = req.admin._id;

    if (!type || !['revenue', 'content', 'users', 'support', 'performance'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid export type'
      });
    }

    let data;
    switch (type) {
      case 'revenue':
        data = await AnalyticsService.getRevenueAnalytics({ dateFrom, dateTo });
        break;
      case 'content':
        data = await AnalyticsService.getContentAnalytics({ dateFrom, dateTo });
        break;
      case 'users':
        data = await AnalyticsService.getUserAnalytics({ dateFrom, dateTo });
        break;
      case 'support':
        data = await AnalyticsService.getSupportAnalytics({ dateFrom, dateTo });
        break;
      case 'performance':
        data = await AnalyticsService.getPerformanceMetrics({ dateFrom, dateTo });
        break;
    }

    // Log export
    analyticsLogger.logAnalyticsExported({
      type,
      adminId,
      format,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        message: 'Analytics data exported successfully',
        type,
        data,
        exportedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      message: 'Failed to export analytics',
      error: error.message
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  // This is a simplified CSV conversion
  // In a real implementation, you'd want a proper CSV library
  const headers = Object.keys(data);
  const rows = [headers.join(',')];
  
  // Add data rows (simplified)
  if (Array.isArray(data)) {
    data.forEach(item => {
      const row = headers.map(header => item[header] || '').join(',');
      rows.push(row);
    });
  }
  
  return rows.join('\n');
}

export default router;
