import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { createPlan } from '../config/razorpay.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupRazorpayPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videofeed');
    console.log('Connected to MongoDB');

    // Get all subscription plans
    const plans = await SubscriptionPlan.find({}).sort({ sortOrder: 1 });
    console.log(`Found ${plans.length} subscription plans`);

    for (const plan of plans) {
      if (plan.razorpayPlanId) {
        console.log(`Plan "${plan.name}" already has Razorpay ID: ${plan.razorpayPlanId}`);
        continue;
      }

      if (plan.price === 0) {
        console.log(`Skipping free plan "${plan.name}" - no Razorpay plan needed`);
        continue;
      }

      try {
        console.log(`Creating Razorpay plan for "${plan.name}"...`);
        
        // Create Razorpay plan
        const razorpayPlanData = {
          period: plan.billingCycle === 'yearly' ? 'yearly' : 'monthly',
          interval: 1,
          item: {
            name: plan.name,
            description: plan.description,
            amount: plan.price * 100, // Convert to paise
            currency: 'INR'
          },
          notes: {
            planId: plan._id.toString(),
            billingCycle: plan.billingCycle
          }
        };

        const razorpayPlan = await createPlan(razorpayPlanData);
        console.log(`✅ Created Razorpay plan: ${razorpayPlan.id}`);

        // Update our plan with Razorpay plan ID
        plan.razorpayPlanId = razorpayPlan.id;
        await plan.save();
        console.log(`✅ Updated plan "${plan.name}" with Razorpay ID`);

      } catch (error) {
        console.error(`❌ Error creating Razorpay plan for "${plan.name}":`, error.message);
      }
    }

    // Show final status
    console.log('\nFinal status:');
    const updatedPlans = await SubscriptionPlan.find({}).sort({ sortOrder: 1 });
    updatedPlans.forEach(plan => {
      console.log(`- ${plan.name}: ${plan.razorpayPlanId ? '✅ Linked' : '❌ Not linked'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error setting up Razorpay plans:', error);
    process.exit(1);
  }
}

setupRazorpayPlans();
