import express from 'express';
import { verifyToken, requireAdmin, requireUser } from '../middleware/auth.js';
import Issue from '../models/Issue.js';
import Purchase from '../models/Purchase.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { issueLogger, supportLogger } from '../utils/logger.js';

const router = express.Router();

// ==================== USER ROUTES ====================

// Create new issue
router.post('/create', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      transactionId,
      purchaseId
    } = req.body;
    
    const userId = req.user.id;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        message: 'Title, description, and category are required'
      });
    }

    // Validate transaction/purchase if provided
    let purchase = null;
    if (transactionId) {
      const transaction = await Transaction.findOne({ 
        transactionId: transactionId,
        userId: userId 
      });
      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found or does not belong to user'
        });
      }
    }

    if (purchaseId) {
      purchase = await Purchase.findOne({ 
        _id: purchaseId,
        userId: userId 
      });
      if (!purchase) {
        return res.status(404).json({
          message: 'Purchase not found or does not belong to user'
        });
      }
    }

    // Create issue
    const issue = new Issue({
      userId,
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || 'medium',
      transactionId: transactionId || null,
      purchaseId: purchaseId || null,
      paymentMethod: purchase?.paymentMethod || null,
      amount: purchase?.amount || null,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      platform: 'web',
      tags: []
    });

    // Add initial audit log
    await issue.addAuditLog(
      'created',
      userId,
      'User',
      'Issue created by user'
    );

    await issue.save();

    // Log issue creation
    issueLogger.logIssueCreated({
      issueId: issue._id,
      userId,
      category,
      priority,
      transactionId,
      purchaseId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Issue created successfully',
      issue: {
        id: issue._id,
        title: issue.title,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        createdAt: issue.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({
      message: 'Failed to create issue',
      error: error.message
    });
  }
});

// Get user's issues
router.get('/my-issues', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, category } = req.query;

    const filters = {
      userId,
      status,
      category,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const issues = await Issue.getIssuesWithFilters(filters);
    const total = await Issue.countDocuments({ userId });

    res.json({
      message: 'Issues retrieved successfully',
      issues: issues.map(issue => ({
        id: issue._id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        formattedStatus: issue.formattedStatus,
        formattedPriority: issue.formattedPriority,
        timeSinceCreation: issue.timeSinceCreation,
        transactionId: issue.transactionId,
        amount: issue.amount,
        assignedTo: issue.assignedTo,
        resolvedAt: issue.resolvedAt,
        resolution: issue.resolution,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting user issues:', error);
    res.status(500).json({
      message: 'Failed to get issues',
      error: error.message
    });
  }
});

// Get specific issue details
router.get('/:issueId', verifyToken, async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.user.id;

    const issue = await Issue.findOne({ 
      _id: issueId,
      userId: userId 
    })
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('purchaseId', 'amount status expiryDate');

    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found or does not belong to user'
      });
    }

    res.json({
      message: 'Issue details retrieved successfully',
      issue: {
        id: issue._id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        formattedStatus: issue.formattedStatus,
        formattedPriority: issue.formattedPriority,
        timeSinceCreation: issue.timeSinceCreation,
        transactionId: issue.transactionId,
        purchaseId: issue.purchaseId,
        amount: issue.amount,
        assignedTo: issue.assignedTo,
        resolvedAt: issue.resolvedAt,
        resolution: issue.resolution,
        notes: issue.notes.filter(note => !note.isInternal), // Only show non-internal notes
        auditLog: issue.auditLog,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting issue details:', error);
    res.status(500).json({
      message: 'Failed to get issue details',
      error: error.message
    });
  }
});

// Add note to issue
router.post('/:issueId/notes', verifyToken, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        message: 'Note content is required'
      });
    }

    const issue = await Issue.findOne({ 
      _id: issueId,
      userId: userId 
    });

    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found or does not belong to user'
      });
    }

    await issue.addNote(content.trim(), userId, 'User', false);

    res.json({
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      message: 'Failed to add note',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all issues with filters (Admin only)
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      assignedTo,
      userId,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const filters = {
      status,
      category,
      priority,
      assignedTo,
      userId,
      dateFrom,
      dateTo,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const issues = await Issue.getIssuesWithFilters(filters);
    const total = await Issue.countDocuments();

    res.json({
      message: 'Issues retrieved successfully',
      issues: issues.map(issue => ({
        id: issue._id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        formattedStatus: issue.formattedStatus,
        formattedPriority: issue.formattedPriority,
        timeSinceCreation: issue.timeSinceCreation,
        transactionId: issue.transactionId,
        purchaseId: issue.purchaseId,
        amount: issue.amount,
        userId: issue.userId,
        assignedTo: issue.assignedTo,
        resolvedBy: issue.resolvedBy,
        resolvedAt: issue.resolvedAt,
        resolution: issue.resolution,
        notes: issue.notes,
        auditLog: issue.auditLog,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting all issues:', error);
    res.status(500).json({
      message: 'Failed to get issues',
      error: error.message
    });
  }
});

// Get issue statistics (Admin only)
router.get('/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filters = { dateFrom, dateTo };
    const stats = await Issue.getIssueStats(filters);

    res.json({
      message: 'Issue statistics retrieved successfully',
      stats: stats[0] || {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
        high: 0,
        payment: 0,
        technical: 0
      }
    });

  } catch (error) {
    console.error('Error getting issue stats:', error);
    res.status(500).json({
      message: 'Failed to get issue statistics',
      error: error.message
    });
  }
});

// Get specific issue details (Admin only)
router.get('/admin/:issueId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('purchaseId', 'amount status expiryDate');

    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    res.json({
      message: 'Issue details retrieved successfully',
      issue: {
        id: issue._id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        formattedStatus: issue.formattedStatus,
        formattedPriority: issue.formattedPriority,
        timeSinceCreation: issue.timeSinceCreation,
        transactionId: issue.transactionId,
        purchaseId: issue.purchaseId,
        amount: issue.amount,
        userId: issue.userId,
        assignedTo: issue.assignedTo,
        resolvedBy: issue.resolvedBy,
        resolvedAt: issue.resolvedAt,
        resolution: issue.resolution,
        notes: issue.notes,
        auditLog: issue.auditLog,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting issue details:', error);
    res.status(500).json({
      message: 'Failed to get issue details',
      error: error.message
    });
  }
});

// Update issue status (Admin only)
router.put('/admin/:issueId/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status, details } = req.body;
    const adminId = req.admin._id;

    if (!status) {
      return res.status(400).json({
        message: 'Status is required'
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    await issue.updateStatus(status, adminId, 'Admin', details);

    // Log status update
    supportLogger.logIssueStatusUpdated({
      issueId: issue._id,
      adminId,
      oldStatus: issue.auditLog[issue.auditLog.length - 2]?.newValue,
      newStatus: status,
      details,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Issue status updated successfully',
      issue: {
        id: issue._id,
        status: issue.status,
        formattedStatus: issue.formattedStatus,
        updatedAt: issue.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({
      message: 'Failed to update issue status',
      error: error.message
    });
  }
});

// Assign issue (Admin only)
router.put('/admin/:issueId/assign', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { assignedTo, details } = req.body;
    const adminId = req.admin._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    await issue.assignTo(assignedTo, adminId, 'Admin', details);

    res.json({
      message: 'Issue assigned successfully',
      issue: {
        id: issue._id,
        assignedTo: issue.assignedTo,
        updatedAt: issue.updatedAt
      }
    });

  } catch (error) {
    console.error('Error assigning issue:', error);
    res.status(500).json({
      message: 'Failed to assign issue',
      error: error.message
    });
  }
});

// Add internal note (Admin only)
router.post('/admin/:issueId/notes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { content, isInternal = true } = req.body;
    const adminId = req.admin._id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        message: 'Note content is required'
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    await issue.addNote(content.trim(), adminId, 'Admin', isInternal);

    res.json({
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      message: 'Failed to add note',
      error: error.message
    });
  }
});

// Resolve issue (Admin only)
router.put('/admin/:issueId/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { resolution } = req.body;
    const adminId = req.admin._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    await issue.resolve(resolution || 'Issue resolved', adminId, 'Admin');

    // Log resolution
    supportLogger.logIssueResolved({
      issueId: issue._id,
      adminId,
      resolution,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Issue resolved successfully',
      issue: {
        id: issue._id,
        status: issue.status,
        resolution: issue.resolution,
        resolvedAt: issue.resolvedAt,
        resolvedBy: issue.resolvedBy
      }
    });

  } catch (error) {
    console.error('Error resolving issue:', error);
    res.status(500).json({
      message: 'Failed to resolve issue',
      error: error.message
    });
  }
});

// Reopen issue (Admin only)
router.put('/admin/:issueId/reopen', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        message: 'Issue not found'
      });
    }

    await issue.reopen(adminId, 'Admin', reason);

    res.json({
      message: 'Issue reopened successfully',
      issue: {
        id: issue._id,
        status: issue.status,
        updatedAt: issue.updatedAt
      }
    });

  } catch (error) {
    console.error('Error reopening issue:', error);
    res.status(500).json({
      message: 'Failed to reopen issue',
      error: error.message
    });
  }
});

export default router;
