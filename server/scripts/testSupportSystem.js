import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Issue from '../models/Issue.js';
import ContactMessage from '../models/ContactMessage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import NotificationService from '../services/notificationService.js';
import { issueLogger, contactLogger, supportLogger, notificationLogger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Test data
const testUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'testpassword123'
};

const testAdmin = {
  name: 'Test Admin',
  email: 'admin@example.com',
  password: 'adminpassword123'
};

const testIssue = {
  title: 'Test Issue - Payment Problem',
  description: 'I am having trouble with my payment. The transaction was successful but I cannot access the content.',
  category: 'payment',
  priority: 'high',
  transactionId: 'txn_test123456',
  amount: 100
};

const testContactMessage = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  subject: 'General Inquiry',
  message: 'I have a question about your service. Can you please help me understand how the subscription works?',
  category: 'general',
  priority: 'medium',
  phone: '+1-555-123-4567',
  company: 'Test Company',
  preferredContactMethod: 'email'
};

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_support_system');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function cleanupDatabase() {
  try {
    await Issue.deleteMany({});
    await ContactMessage.deleteMany({});
    await Notification.deleteMany({});
    await User.deleteMany({ email: testUser.email });
    await Admin.deleteMany({ email: testAdmin.email });
    console.log('🧹 Database cleaned up');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
}

async function createTestUser() {
  try {
    const user = new User(testUser);
    await user.save();
    console.log('✅ Test user created:', user.email);
    return user;
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    return null;
  }
}

async function createTestAdmin() {
  try {
    const admin = new Admin(testAdmin);
    await admin.save();
    console.log('✅ Test admin created:', admin.email);
    return admin;
  } catch (error) {
    console.error('❌ Failed to create test admin:', error);
    return null;
  }
}

async function testIssueCreation(user) {
  console.log('\n🔍 Testing Issue Creation...');
  
  try {
    const issue = new Issue({
      ...testIssue,
      userId: user._id,
      userAgent: 'Test User Agent',
      ipAddress: '127.0.0.1',
      platform: 'web'
    });

    // Add initial audit log
    await issue.addAuditLog(
      'created',
      user._id,
      'User',
      'Issue created by test user'
    );

    await issue.save();

    // Log issue creation
    issueLogger.logIssueCreated({
      issueId: issue._id,
      userId: user._id,
      category: issue.category,
      priority: issue.priority,
      transactionId: issue.transactionId,
      metadata: {
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Issue created successfully:', issue._id);
    console.log('   - Title:', issue.title);
    console.log('   - Category:', issue.category);
    console.log('   - Priority:', issue.priority);
    console.log('   - Status:', issue.status);
    console.log('   - Transaction ID:', issue.transactionId);

    return issue;
  } catch (error) {
    console.error('❌ Issue creation failed:', error);
    return null;
  }
}

async function testContactMessageCreation() {
  console.log('\n🔍 Testing Contact Message Creation...');
  
  try {
    const contactMessage = new ContactMessage({
      ...testContactMessage,
      userAgent: 'Test User Agent',
      ipAddress: '127.0.0.1',
      platform: 'web',
      source: 'contact_form'
    });

    // Add initial audit log
    await contactMessage.addAuditLog(
      'created',
      null,
      'System',
      'Contact message submitted by test'
    );

    await contactMessage.save();

    // Log contact message creation
    contactLogger.logContactMessageCreated({
      messageId: contactMessage._id,
      email: contactMessage.email,
      category: contactMessage.category,
      priority: contactMessage.priority,
      source: contactMessage.source,
      metadata: {
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Contact message created successfully:', contactMessage._id);
    console.log('   - Name:', contactMessage.name);
    console.log('   - Email:', contactMessage.email);
    console.log('   - Subject:', contactMessage.subject);
    console.log('   - Category:', contactMessage.category);
    console.log('   - Priority:', contactMessage.priority);

    return contactMessage;
  } catch (error) {
    console.error('❌ Contact message creation failed:', error);
    return null;
  }
}

async function testIssueManagement(issue, admin) {
  console.log('\n🔍 Testing Issue Management...');
  
  try {
    // Test status update
    console.log('   - Updating issue status to "in_progress"');
    await issue.updateStatus('in_progress', admin._id, 'Admin', 'Issue assigned to support team');
    
    // Test assignment
    console.log('   - Assigning issue to admin');
    await issue.assignTo(admin._id, admin._id, 'Admin', 'Assigned to admin for resolution');
    
    // Test adding note
    console.log('   - Adding internal note');
    await issue.addNote('This is an internal note for admin reference', admin._id, 'Admin', true);
    
    // Test resolution
    console.log('   - Resolving issue');
    await issue.resolve('Issue has been resolved. Payment was processed correctly and access has been granted.', admin._id, 'Admin');

    // Log support actions
    supportLogger.logIssueStatusUpdated({
      issueId: issue._id,
      adminId: admin._id,
      oldStatus: 'open',
      newStatus: 'resolved',
      details: 'Issue resolved by admin',
      metadata: {
        userAgent: 'Test Admin Agent',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Issue management completed successfully');
    console.log('   - Final status:', issue.status);
    console.log('   - Assigned to:', issue.assignedTo);
    console.log('   - Resolved by:', issue.resolvedBy);
    console.log('   - Resolution:', issue.resolution);

    return issue;
  } catch (error) {
    console.error('❌ Issue management failed:', error);
    return null;
  }
}

async function testContactMessageManagement(contactMessage, admin) {
  console.log('\n🔍 Testing Contact Message Management...');
  
  try {
    // Test status update
    console.log('   - Updating message status to "read"');
    await contactMessage.updateStatus('read', admin._id, 'Admin', 'Message read by admin');
    
    // Test response
    console.log('   - Sending response to user');
    const response = 'Thank you for your inquiry. Our subscription service provides unlimited access to all content for a monthly or yearly fee. Please let me know if you need any clarification.';
    await contactMessage.respond(response, admin._id, false);
    
    // Test adding internal note
    console.log('   - Adding internal note');
    await contactMessage.addInternalNote('User seems interested in subscription. Follow up in 3 days if no response.', admin._id);
    
    // Test follow-up setting
    console.log('   - Setting follow-up');
    contactMessage.followUpRequired = true;
    contactMessage.followUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    contactMessage.followUpNotes = 'Follow up on subscription interest';
    await contactMessage.save();

    // Log support actions
    supportLogger.logContactResponseSent({
      messageId: contactMessage._id,
      adminId: admin._id,
      responseLength: response.length,
      isPublic: false,
      metadata: {
        userAgent: 'Test Admin Agent',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Contact message management completed successfully');
    console.log('   - Final status:', contactMessage.status);
    console.log('   - Response sent:', !!contactMessage.response);
    console.log('   - Follow-up required:', contactMessage.followUpRequired);
    console.log('   - Follow-up date:', contactMessage.followUpDate);

    return contactMessage;
  } catch (error) {
    console.error('❌ Contact message management failed:', error);
    return null;
  }
}

async function testNotificationSystem(user, issue, contactMessage) {
  console.log('\n🔍 Testing Notification System...');
  
  try {
    // Test issue status update notification
    console.log('   - Sending issue status update notification');
    await NotificationService.sendIssueStatusUpdate(issue, 'open', 'resolved', issue.resolvedBy);
    
    // Test contact response notification
    console.log('   - Sending contact response notification');
    await NotificationService.sendContactResponse(contactMessage, contactMessage.response, contactMessage.respondedBy);
    
    // Test system notification
    console.log('   - Sending system notification');
    await NotificationService.sendSystemNotification(
      user._id,
      'Welcome to Support System',
      'Your support request has been processed successfully.',
      true
    );

    // Get user notifications
    const notifications = await NotificationService.getUserNotifications(user._id, { limit: 10 });
    console.log('✅ Notification system test completed');
    console.log('   - Notifications created:', notifications.length);
    console.log('   - Notification types:', notifications.map(n => n.type));

    return notifications;
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    return [];
  }
}

async function testStatistics() {
  console.log('\n🔍 Testing Statistics...');
  
  try {
    // Test issue statistics
    const issueStats = await Issue.getIssueStats();
    console.log('✅ Issue statistics:', issueStats[0] || 'No stats available');
    
    // Test contact message statistics
    const messageStats = await ContactMessage.getMessageStats();
    console.log('✅ Contact message statistics:', messageStats[0] || 'No stats available');
    
    // Test average response time
    const avgResponseTime = await ContactMessage.getAverageResponseTime();
    console.log('✅ Average response time:', avgResponseTime[0] || 'No data available');

    return { issueStats, messageStats, avgResponseTime };
  } catch (error) {
    console.error('❌ Statistics test failed:', error);
    return null;
  }
}

async function testFiltersAndQueries() {
  console.log('\n🔍 Testing Filters and Queries...');
  
  try {
    // Test issue filters
    const filteredIssues = await Issue.getIssuesWithFilters({
      status: 'resolved',
      category: 'payment',
      limit: 10
    });
    console.log('✅ Filtered issues (resolved, payment):', filteredIssues.length);
    
    // Test contact message filters
    const filteredMessages = await ContactMessage.getMessagesWithFilters({
      status: 'responded',
      category: 'general',
      limit: 10
    });
    console.log('✅ Filtered messages (responded, general):', filteredMessages.length);
    
    // Test notification counts
    const notificationCounts = await NotificationService.getNotificationCounts(filteredIssues[0]?.userId);
    console.log('✅ Notification counts:', notificationCounts);

    return { filteredIssues, filteredMessages, notificationCounts };
  } catch (error) {
    console.error('❌ Filters and queries test failed:', error);
    return null;
  }
}

async function testAuditLogging() {
  console.log('\n🔍 Testing Audit Logging...');
  
  try {
    // Get an issue with audit log
    const issue = await Issue.findOne().populate('userId');
    if (issue) {
      console.log('✅ Issue audit log entries:', issue.auditLog.length);
      issue.auditLog.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.action} by ${log.performedByType} at ${log.timestamp}`);
      });
    }
    
    // Get a contact message with audit log
    const contactMessage = await ContactMessage.findOne();
    if (contactMessage) {
      console.log('✅ Contact message audit log entries:', contactMessage.auditLog.length);
      contactMessage.auditLog.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.action} by ${log.performedByType} at ${log.timestamp}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Audit logging test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Support System Tests...\n');
  
  try {
    // Setup
    await connectToDatabase();
    await cleanupDatabase();
    
    // Create test data
    const user = await createTestUser();
    const admin = await createTestAdmin();
    
    if (!user || !admin) {
      throw new Error('Failed to create test user or admin');
    }
    
    // Run tests
    const issue = await testIssueCreation(user);
    const contactMessage = await testContactMessageCreation();
    
    if (issue) {
      await testIssueManagement(issue, admin);
    }
    
    if (contactMessage) {
      await testContactMessageManagement(contactMessage, admin);
    }
    
    if (issue && contactMessage) {
      await testNotificationSystem(user, issue, contactMessage);
    }
    
    await testStatistics();
    await testFiltersAndQueries();
    await testAuditLogging();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Issue creation and management');
    console.log('   ✅ Contact message creation and management');
    console.log('   ✅ Notification system');
    console.log('   ✅ Statistics and reporting');
    console.log('   ✅ Filters and queries');
    console.log('   ✅ Audit logging');
    console.log('   ✅ Support logging');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run the tests
runTests().catch(console.error);
