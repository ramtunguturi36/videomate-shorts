import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import ContactMessage from '../models/ContactMessage.js';
import { contactLogger, supportLogger } from '../utils/logger.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Submit contact form (Public - no auth required)
router.post('/submit', async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
      category,
      priority,
      phone,
      company,
      preferredContactMethod,
      source
    } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'Name, email, subject, and message are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address'
      });
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      preferredContactMethod: preferredContactMethod || 'email',
      source: source || 'contact_form',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      platform: 'web',
      tags: []
    });

    // Add initial audit log
    await contactMessage.addAuditLog(
      'created',
      null, // No user ID for anonymous submissions
      'System',
      'Contact message submitted'
    );

    await contactMessage.save();

    // Log contact message creation
    contactLogger.logContactMessageCreated({
      messageId: contactMessage._id,
      email,
      category,
      priority,
      source,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Contact message submitted successfully',
      messageId: contactMessage._id,
      estimatedResponseTime: '24-48 hours'
    });

  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({
      message: 'Failed to submit contact message',
      error: error.message
    });
  }
});

// Submit contact form (Authenticated user)
router.post('/submit-authenticated', verifyToken, async (req, res) => {
  try {
    const {
      subject,
      message,
      category,
      priority,
      phone,
      company,
      preferredContactMethod,
      source
    } = req.body;

    const userId = req.user.id;
    const user = req.user;

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        message: 'Subject and message are required'
      });
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      userId,
      name: user.name,
      email: user.email,
      subject: subject.trim(),
      message: message.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      preferredContactMethod: preferredContactMethod || 'email',
      source: source || 'contact_form',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      platform: 'web',
      tags: []
    });

    // Add initial audit log
    await contactMessage.addAuditLog(
      'created',
      userId,
      'User',
      'Contact message submitted by authenticated user'
    );

    await contactMessage.save();

    // Log contact message creation
    contactLogger.logContactMessageCreated({
      messageId: contactMessage._id,
      userId,
      email: user.email,
      category,
      priority,
      source,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Contact message submitted successfully',
      messageId: contactMessage._id,
      estimatedResponseTime: '24-48 hours'
    });

  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({
      message: 'Failed to submit contact message',
      error: error.message
    });
  }
});

// ==================== USER ROUTES ====================

// Get user's contact messages
router.get('/my-messages', verifyToken, async (req, res) => {
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

    const messages = await ContactMessage.getMessagesWithFilters(filters);
    const total = await ContactMessage.countDocuments({ userId });

    res.json({
      message: 'Contact messages retrieved successfully',
      messages: messages.map(msg => ({
        id: msg._id,
        subject: msg.subject,
        message: msg.message,
        category: msg.category,
        priority: msg.priority,
        status: msg.status,
        formattedStatus: msg.formattedStatus,
        formattedPriority: msg.formattedPriority,
        timeSinceCreation: msg.timeSinceCreation,
        responseTime: msg.responseTime,
        response: msg.response,
        respondedAt: msg.respondedAt,
        isPublic: msg.isPublic,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting user contact messages:', error);
    res.status(500).json({
      message: 'Failed to get contact messages',
      error: error.message
    });
  }
});

// Get specific contact message details
router.get('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ContactMessage.findOne({ 
      _id: messageId,
      userId: userId 
    })
    .populate('respondedBy', 'name email');

    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found or does not belong to user'
      });
    }

    res.json({
      message: 'Contact message details retrieved successfully',
      contactMessage: {
        id: message._id,
        subject: message.subject,
        message: message.message,
        category: message.category,
        priority: message.priority,
        status: message.status,
        formattedStatus: message.formattedStatus,
        formattedPriority: message.formattedPriority,
        timeSinceCreation: message.timeSinceCreation,
        responseTime: message.responseTime,
        response: message.response,
        respondedBy: message.respondedBy,
        respondedAt: message.respondedAt,
        isPublic: message.isPublic,
        auditLog: message.auditLog,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting contact message details:', error);
    res.status(500).json({
      message: 'Failed to get contact message details',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all contact messages with filters (Admin only)
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      respondedBy,
      userId,
      email,
      dateFrom,
      dateTo,
      search,
      followUpRequired
    } = req.query;

    const filters = {
      status,
      category,
      priority,
      respondedBy,
      userId,
      email,
      dateFrom,
      dateTo,
      search,
      followUpRequired,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const messages = await ContactMessage.getMessagesWithFilters(filters);
    const total = await ContactMessage.countDocuments();

    res.json({
      message: 'Contact messages retrieved successfully',
      messages: messages.map(msg => ({
        id: msg._id,
        name: msg.name,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        category: msg.category,
        priority: msg.priority,
        status: msg.status,
        formattedStatus: msg.formattedStatus,
        formattedPriority: msg.formattedPriority,
        timeSinceCreation: msg.timeSinceCreation,
        responseTime: msg.responseTime,
        response: msg.response,
        respondedBy: msg.respondedBy,
        respondedAt: msg.respondedAt,
        isPublic: msg.isPublic,
        followUpRequired: msg.followUpRequired,
        followUpDate: msg.followUpDate,
        userId: msg.userId,
        phone: msg.phone,
        company: msg.company,
        preferredContactMethod: msg.preferredContactMethod,
        source: msg.source,
        internalNotes: msg.internalNotes,
        auditLog: msg.auditLog,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting all contact messages:', error);
    res.status(500).json({
      message: 'Failed to get contact messages',
      error: error.message
    });
  }
});

// Get contact message statistics (Admin only)
router.get('/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filters = { dateFrom, dateTo };
    const stats = await ContactMessage.getMessageStats(filters);
    const avgResponseTime = await ContactMessage.getAverageResponseTime(filters);

    res.json({
      message: 'Contact message statistics retrieved successfully',
      stats: stats[0] || {
        total: 0,
        new: 0,
        read: 0,
        inProgress: 0,
        responded: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
        high: 0,
        support: 0,
        feedback: 0,
        bugReport: 0,
        followUpRequired: 0
      },
      averageResponseTime: avgResponseTime[0] || {
        averageResponseTimeMs: 0,
        minResponseTimeMs: 0,
        maxResponseTimeMs: 0,
        count: 0
      }
    });

  } catch (error) {
    console.error('Error getting contact message stats:', error);
    res.status(500).json({
      message: 'Failed to get contact message statistics',
      error: error.message
    });
  }
});

// Get specific contact message details (Admin only)
router.get('/admin/:messageId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ContactMessage.findById(messageId)
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email');

    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    res.json({
      message: 'Contact message details retrieved successfully',
      contactMessage: {
        id: message._id,
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        category: message.category,
        priority: message.priority,
        status: message.status,
        formattedStatus: message.formattedStatus,
        formattedPriority: message.formattedPriority,
        timeSinceCreation: message.timeSinceCreation,
        responseTime: message.responseTime,
        response: message.response,
        respondedBy: message.respondedBy,
        respondedAt: message.respondedAt,
        isPublic: message.isPublic,
        followUpRequired: message.followUpRequired,
        followUpDate: message.followUpDate,
        followUpNotes: message.followUpNotes,
        userId: message.userId,
        phone: message.phone,
        company: message.company,
        preferredContactMethod: message.preferredContactMethod,
        source: message.source,
        internalNotes: message.internalNotes,
        auditLog: message.auditLog,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting contact message details:', error);
    res.status(500).json({
      message: 'Failed to get contact message details',
      error: error.message
    });
  }
});

// Update contact message status (Admin only)
router.put('/admin/:messageId/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, details } = req.body;
    const adminId = req.admin._id;

    if (!status) {
      return res.status(400).json({
        message: 'Status is required'
      });
    }

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.updateStatus(status, adminId, 'Admin', details);

    // Log status update
    supportLogger.logContactStatusUpdated({
      messageId: message._id,
      adminId,
      oldStatus: message.auditLog[message.auditLog.length - 2]?.newValue,
      newStatus: status,
      details,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Contact message status updated successfully',
      contactMessage: {
        id: message._id,
        status: message.status,
        formattedStatus: message.formattedStatus,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating contact message status:', error);
    res.status(500).json({
      message: 'Failed to update contact message status',
      error: error.message
    });
  }
});

// Respond to contact message (Admin only)
router.put('/admin/:messageId/respond', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { response, isPublic = false } = req.body;
    const adminId = req.admin._id;

    if (!response || response.trim() === '') {
      return res.status(400).json({
        message: 'Response content is required'
      });
    }

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.respond(response.trim(), adminId, isPublic);

    // Log response
    supportLogger.logContactResponseSent({
      messageId: message._id,
      adminId,
      responseLength: response.length,
      isPublic,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Response sent successfully',
      contactMessage: {
        id: message._id,
        status: message.status,
        response: message.response,
        respondedAt: message.respondedAt,
        respondedBy: message.respondedBy,
        isPublic: message.isPublic
      }
    });

  } catch (error) {
    console.error('Error responding to contact message:', error);
    res.status(500).json({
      message: 'Failed to send response',
      error: error.message
    });
  }
});

// Add internal note (Admin only)
router.post('/admin/:messageId/notes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const adminId = req.admin._id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        message: 'Note content is required'
      });
    }

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.addInternalNote(content.trim(), adminId);

    res.json({
      message: 'Internal note added successfully'
    });

  } catch (error) {
    console.error('Error adding internal note:', error);
    res.status(500).json({
      message: 'Failed to add internal note',
      error: error.message
    });
  }
});

// Set follow-up (Admin only)
router.put('/admin/:messageId/follow-up', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { followUpRequired, followUpDate, followUpNotes } = req.body;
    const adminId = req.admin._id;

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    message.followUpRequired = followUpRequired;
    message.followUpDate = followUpDate ? new Date(followUpDate) : null;
    message.followUpNotes = followUpNotes?.trim() || null;
    message.updatedAt = new Date();

    await message.save();

    res.json({
      message: 'Follow-up updated successfully',
      contactMessage: {
        id: message._id,
        followUpRequired: message.followUpRequired,
        followUpDate: message.followUpDate,
        followUpNotes: message.followUpNotes
      }
    });

  } catch (error) {
    console.error('Error updating follow-up:', error);
    res.status(500).json({
      message: 'Failed to update follow-up',
      error: error.message
    });
  }
});

// Resolve contact message (Admin only)
router.put('/admin/:messageId/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const adminId = req.admin._id;

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.resolve(adminId, 'Contact message resolved');

    // Log resolution
    supportLogger.logContactResolved({
      messageId: message._id,
      adminId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Contact message resolved successfully',
      contactMessage: {
        id: message._id,
        status: message.status,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error resolving contact message:', error);
    res.status(500).json({
      message: 'Failed to resolve contact message',
      error: error.message
    });
  }
});

// Close contact message (Admin only)
router.put('/admin/:messageId/close', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin._id;

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.close(adminId, reason);

    res.json({
      message: 'Contact message closed successfully',
      contactMessage: {
        id: message._id,
        status: message.status,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error closing contact message:', error);
    res.status(500).json({
      message: 'Failed to close contact message',
      error: error.message
    });
  }
});

// Reopen contact message (Admin only)
router.put('/admin/:messageId/reopen', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin._id;

    const message = await ContactMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        message: 'Contact message not found'
      });
    }

    await message.reopen(adminId, reason);

    res.json({
      message: 'Contact message reopened successfully',
      contactMessage: {
        id: message._id,
        status: message.status,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Error reopening contact message:', error);
    res.status(500).json({
      message: 'Failed to reopen contact message',
      error: error.message
    });
  }
});

export default router;
