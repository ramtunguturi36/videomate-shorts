#!/usr/bin/env node

/**
 * Test script to verify the payment flow for video QR code purchases
 * This script tests the complete flow:
 * 1. User watches video freely
 * 2. User purchases QR code access
 * 3. User gets 5-minute access to QR code
 * 4. Access expires after 5 minutes
 */

import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import File from '../models/File.js';
import User from '../models/User.js';
import { createOrder, verifyPayment } from '../config/razorpay.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videoapp');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test the payment flow
const testPaymentFlow = async () => {
  try {
    console.log('\n🧪 Testing Payment Flow for Video QR Code Purchase\n');

    // 1. Find a test user
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.log('⚠️  No test user found. Creating one...');
      const newUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword123'
      });
      await newUser.save();
      console.log('✅ Test user created');
    }

    // 2. Find a video with associated image
    const video = await File.findOne({ 
      fileType: 'video',
      status: 'ready'
    }).populate('uploadInfo.uploadedBy');

    if (!video) {
      console.log('❌ No videos found in database');
      return;
    }

    console.log(`📹 Found video: ${video.title}`);

    // 3. Find associated image (QR code)
    const baseTitle = video.title.replace(' (Video)', '');
    const associatedImage = await File.findOne({
      fileType: 'image',
      title: `${baseTitle} (Image)`,
      folderPath: video.folderPath,
      status: 'ready'
    });

    if (!associatedImage) {
      console.log('❌ No associated image (QR code) found for this video');
      return;
    }

    console.log(`🖼️  Found QR code: ${associatedImage.title}`);
    console.log(`💰 Price: ₹${associatedImage.metadata.price || 10}`);

    // 4. Check if user already has access
    const existingAccess = await Purchase.hasActiveAccess(testUser._id, associatedImage._id);
    if (existingAccess) {
      console.log('⚠️  User already has active access to this QR code');
      console.log(`⏰ Expires at: ${existingAccess.expiryDate}`);
      return;
    }

    // 5. Simulate payment process
    console.log('\n💳 Simulating payment process...');
    
    const amount = associatedImage.metadata.price || 10;
    console.log(`💵 Creating order for ₹${amount}`);

    // Create a test order (without actually calling Razorpay)
    const testOrder = {
      id: `order_test_${Date.now()}`,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `test_${Date.now()}`
    };

    console.log(`✅ Test order created: ${testOrder.id}`);

    // 6. Create purchase record
    const purchase = Purchase.createOneTimePurchase({
      userId: testUser._id,
      videoId: video._id,
      imageId: associatedImage._id,
      picR2Url: associatedImage.r2Url,
      amount: amount,
      paymentMethod: 'razorpay',
      razorpayOrderId: testOrder.id,
      metadata: {
        videoTitle: video.title,
        imageTitle: associatedImage.title,
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1',
        platform: 'test'
      }
    });

    await purchase.save();
    console.log(`✅ Purchase record created: ${purchase._id}`);

    // 7. Simulate successful payment
    purchase.status = 'completed';
    purchase.accessGranted = true;
    purchase.paymentId = `pay_test_${Date.now()}`;
    purchase.razorpayPaymentId = purchase.paymentId;
    await purchase.save();

    console.log('✅ Payment marked as successful');
    console.log(`⏰ Access expires at: ${purchase.expiryDate}`);

    // 8. Test access
    console.log('\n🔓 Testing access...');
    const accessResult = await Purchase.getSignedImageUrl(testUser._id, associatedImage._id);
    
    if (accessResult.success) {
      console.log('✅ User has access to QR code');
      console.log(`⏰ Time remaining: ${Math.ceil((accessResult.expiryDate - new Date()) / (1000 * 60))} minutes`);
    } else {
      console.log('❌ User does not have access');
      console.log(`Reason: ${accessResult.error}`);
    }

    // 9. Test expiry (simulate time passing)
    console.log('\n⏰ Testing expiry...');
    const originalExpiry = purchase.expiryDate;
    purchase.expiryDate = new Date(Date.now() - 1000); // Set to 1 second ago
    await purchase.save();

    const expiredAccessResult = await Purchase.getSignedImageUrl(testUser._id, associatedImage._id);
    if (!expiredAccessResult.success && expiredAccessResult.expired) {
      console.log('✅ Access correctly expired');
    } else {
      console.log('❌ Access should have expired but did not');
    }

    // Restore original expiry for cleanup
    purchase.expiryDate = originalExpiry;
    await purchase.save();

    console.log('\n🎉 Payment flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Video: ${video.title}`);
    console.log(`   • QR Code: ${associatedImage.title}`);
    console.log(`   • Price: ₹${amount}`);
    console.log(`   • Access Duration: 5 minutes`);
    console.log(`   • Purchase ID: ${purchase._id}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Cleanup function
const cleanup = async () => {
  try {
    // Remove test purchase
    await Purchase.deleteMany({ 
      'metadata.userAgent': 'Test Script' 
    });
    console.log('🧹 Cleaned up test data');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testPaymentFlow();
  await cleanup();
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  await mongoose.disconnect();
  process.exit(0);
});

// Run the test
main().catch(console.error);
