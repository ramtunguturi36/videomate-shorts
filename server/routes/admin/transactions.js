import express from 'express';
import { verifyToken, requireAdmin } from '../auth.js';
import AnalyticsService from '../../services/analyticsService.js';
import Transaction from '../../models/Transaction.js';
import Purchase from '../../models/Purchase.js';
import User from '../../models/User.js';
import { transactionLogger } from '../../utils/logger.js';

const router = express.Router();

// ==================== TRANSACTION MONITORING ====================

// Get transaction monitoring data
router.get('/monitoring', verifyToken, requireAdmin, async (req, res) => {
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
    } = req.query;
    const adminId = req.admin._id;

    const monitoring = await AnalyticsService.getTransactionMonitoring({
      userId,
      dateFrom,
      dateTo,
      status,
      paymentMethod,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    // Log transaction monitoring access
    transactionLogger.logTransactionMonitoringAccessed({
      adminId,
      filters: { userId, dateFrom, dateTo, status, paymentMethod },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Transaction monitoring data retrieved successfully',
      monitoring
    });

  } catch (error) {
    console.error('Error getting transaction monitoring:', error);
    res.status(500).json({
      message: 'Failed to get transaction monitoring data',
      error: error.message
    });
  }
});

// Get transaction details
router.get('/:transactionId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.admin._id;

    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'name email')
      .populate('purchases');

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    // Get related purchases with details
    const purchases = await Purchase.find({ transactionId: transaction._id })
      .populate('videoId', 'title filename')
      .populate('imageId', 'title filename');

    // Log transaction details access
    transactionLogger.logTransactionDetailsAccessed({
      transactionId: transaction._id,
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Transaction details retrieved successfully',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        razorpayOrderId: transaction.razorpayOrderId,
        razorpayPaymentId: transaction.razorpayPaymentId,
        razorpaySignature: transaction.razorpaySignature,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        purchases: purchases.map(purchase => ({
          id: purchase._id,
          videoId: purchase.videoId,
          imageId: purchase.imageId,
          amount: purchase.amount,
          status: purchase.status,
          expiryDate: purchase.expiryDate,
          createdAt: purchase.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      message: 'Failed to get transaction details',
      error: error.message
    });
  }
});

// Update transaction status
router.put('/:transactionId/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.admin._id;

    if (!status || !['pending', 'completed', 'failed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status'
      });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    const oldStatus = transaction.status;
    transaction.status = status;
    transaction.updatedAt = new Date();
    await transaction.save();

    // Update related purchases if transaction is completed
    if (status === 'completed') {
      await Purchase.updateMany(
        { transactionId: transaction._id },
        { status: 'completed' }
      );
    }

    // Log transaction status update
    transactionLogger.logTransactionStatusUpdated({
      transactionId: transaction._id,
      adminId,
      oldStatus,
      newStatus: status,
      reason,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Transaction status updated successfully',
      transaction: {
        id: transaction._id,
        status: transaction.status,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({
      message: 'Failed to update transaction status',
      error: error.message
    });
  }
});

// Refund transaction
router.post('/:transactionId/refund', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.admin._id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        message: 'Can only refund completed transactions'
      });
    }

    const refundAmount = amount || transaction.amount;
    if (refundAmount > transaction.amount) {
      return res.status(400).json({
        message: 'Refund amount cannot exceed transaction amount'
      });
    }

    // Update transaction status
    transaction.status = 'refunded';
    transaction.updatedAt = new Date();
    await transaction.save();

    // Update related purchases
    await Purchase.updateMany(
      { transactionId: transaction._id },
      { status: 'refunded' }
    );

    // Log refund
    transactionLogger.logTransactionRefunded({
      transactionId: transaction._id,
      adminId,
      refundAmount,
      reason,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Transaction refunded successfully',
      transaction: {
        id: transaction._id,
        status: transaction.status,
        refundAmount,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error('Error refunding transaction:', error);
    res.status(500).json({
      message: 'Failed to refund transaction',
      error: error.message
    });
  }
});

// ==================== TRANSACTION STATISTICS ====================

// Get transaction statistics
router.get('/stats/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const adminId = req.admin._id;

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

    // Get transaction statistics
    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          refundedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get payment method statistics
    const paymentMethodStats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily transaction trends
    const dailyTrends = await Transaction.aggregate([
      { $match: { ...matchStage, status: 'completed' } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = {
      overview: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        completedTransactions: 0,
        completedAmount: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        refundedTransactions: 0
      },
      paymentMethods: paymentMethodStats,
      dailyTrends
    };

    // Log statistics access
    transactionLogger.logTransactionStatsAccessed({
      adminId,
      filters: { dateFrom, dateTo },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Transaction statistics retrieved successfully',
      stats: result
    });

  } catch (error) {
    console.error('Error getting transaction statistics:', error);
    res.status(500).json({
      message: 'Failed to get transaction statistics',
      error: error.message
    });
  }
});

// ==================== USER TRANSACTION HISTORY ====================

// Get user transaction history
router.get('/user/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const adminId = req.admin._id;

    // Build query
    const query = { userId };
    if (status) query.status = status;

    // Get user transactions
    const transactions = await Transaction.find(query)
      .populate('purchases')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Transaction.countDocuments(query);

    // Get user details
    const user = await User.findById(userId).select('name email createdAt');

    // Get user statistics
    const userStats = await Transaction.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          averageTransaction: { $avg: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Log user transaction history access
    transactionLogger.logUserTransactionHistoryAccessed({
      userId,
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'User transaction history retrieved successfully',
      user,
      transactions: transactions.map(transaction => ({
        id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        purchases: transaction.purchases
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      stats: userStats[0] || {
        totalTransactions: 0,
        totalSpent: 0,
        averageTransaction: 0,
        completedTransactions: 0,
        completedAmount: 0
      }
    });

  } catch (error) {
    console.error('Error getting user transaction history:', error);
    res.status(500).json({
      message: 'Failed to get user transaction history',
      error: error.message
    });
  }
});

// ==================== EXPORT TRANSACTIONS ====================

// Export transactions
router.post('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      dateFrom,
      dateTo,
      status,
      paymentMethod,
      format = 'json'
    } = req.body;
    const adminId = req.admin._id;

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

    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Log export
    transactionLogger.logTransactionsExported({
      adminId,
      format,
      filters: { userId, dateFrom, dateTo, status, paymentMethod },
      transactionCount: transactions.length,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertTransactionsToCSV(transactions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        message: 'Transactions exported successfully',
        transactions: transactions.map(transaction => ({
          id: transaction._id,
          transactionId: transaction.transactionId,
          userId: transaction.userId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          razorpayOrderId: transaction.razorpayOrderId,
          razorpayPaymentId: transaction.razorpayPaymentId,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        })),
        exportedAt: new Date().toISOString(),
        totalCount: transactions.length
      });
    }

  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      message: 'Failed to export transactions',
      error: error.message
    });
  }
});

// Helper function to convert transactions to CSV
function convertTransactionsToCSV(transactions) {
  const headers = [
    'ID',
    'Transaction ID',
    'User Name',
    'User Email',
    'Amount',
    'Currency',
    'Status',
    'Payment Method',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Created At',
    'Updated At'
  ];

  const rows = [headers.join(',')];

  transactions.forEach(transaction => {
    const row = [
      transaction._id,
      transaction.transactionId,
      transaction.userId?.name || '',
      transaction.userId?.email || '',
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.paymentMethod,
      transaction.razorpayOrderId || '',
      transaction.razorpayPaymentId || '',
      transaction.createdAt,
      transaction.updatedAt
    ].map(field => `"${field}"`).join(',');
    rows.push(row);
  });

  return rows.join('\n');
}

export default router;
