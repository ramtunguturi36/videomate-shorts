import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDefaultPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videofeed');
    console.log('Connected to MongoDB');

    // Initialize default plans
    await SubscriptionPlan.createDefaultPlans();
    console.log('Default subscription plans initialized successfully');

    // Check what was created
    const plans = await SubscriptionPlan.find({}).sort({ sortOrder: 1 });
    console.log(`\nCreated ${plans.length} subscription plans:`);
    plans.forEach(plan => {
      console.log(`- ${plan.name}: ₹${plan.price} (${plan.billingCycle}) - Active: ${plan.isActive}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error initializing default plans:', error);
    process.exit(1);
  }
}

initializeDefaultPlans();
