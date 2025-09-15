import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videofeed');
    console.log('Connected to MongoDB');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing plans');

    // Create plans manually
    const plans = [
      {
        name: 'Free',
        description: 'Basic access to free content',
        price: 0,
        billingCycle: 'lifetime',
        duration: 365,
        features: [
          { name: 'Access to free videos', description: 'Watch free content', included: true },
          { name: 'Basic video player', description: 'Standard quality streaming', included: true },
          { name: 'Limited downloads', description: '5 downloads per month', included: true }
        ],
        limits: {
          maxImages: 0,
          maxVideos: -1,
          maxDownloads: 5,
          accessDuration: 5
        },
        sortOrder: 1,
        metadata: {
          color: 'gray',
          icon: 'user'
        }
      },
      {
        name: 'Premium Monthly',
        description: 'Unlimited access to all premium content',
        price: 29,
        billingCycle: 'monthly',
        duration: 30,
        features: [
          { name: 'Unlimited image access', description: 'Access all premium images', included: true },
          { name: 'HD quality streaming', description: 'High definition videos', included: true },
          { name: 'Unlimited downloads', description: 'Download any content', included: true },
          { name: 'Priority support', description: '24/7 customer support', included: true },
          { name: 'Ad-free experience', description: 'No advertisements', included: true }
        ],
        limits: {
          maxImages: -1,
          maxVideos: -1,
          maxDownloads: -1,
          accessDuration: -1
        },
        isPopular: true,
        sortOrder: 2,
        metadata: {
          color: 'blue',
          icon: 'star',
          badge: 'Most Popular'
        }
      },
      {
        name: 'Premium Yearly',
        description: 'Best value with unlimited access for a full year',
        price: 299,
        billingCycle: 'yearly',
        duration: 365,
        features: [
          { name: 'Unlimited image access', description: 'Access all premium images', included: true },
          { name: '4K quality streaming', description: 'Ultra high definition', included: true },
          { name: 'Unlimited downloads', description: 'Download any content', included: true },
          { name: 'Priority support', description: '24/7 customer support', included: true },
          { name: 'Ad-free experience', description: 'No advertisements', included: true },
          { name: 'Early access', description: 'Get new content first', included: true },
          { name: 'Custom playlists', description: 'Create your own collections', included: true }
        ],
        limits: {
          maxImages: -1,
          maxVideos: -1,
          maxDownloads: -1,
          accessDuration: -1
        },
        sortOrder: 3,
        metadata: {
          color: 'purple',
          icon: 'crown',
          badge: 'Best Value'
        }
      }
    ];

    // Create each plan
    for (const planData of plans) {
      const plan = new SubscriptionPlan(planData);
      await plan.save();
      console.log(`Created plan: ${plan.name} - ₹${plan.price}`);
    }

    // Verify creation
    const allPlans = await SubscriptionPlan.find({}).sort({ sortOrder: 1 });
    console.log(`\nTotal plans created: ${allPlans.length}`);
    allPlans.forEach(plan => {
      console.log(`- ${plan.name}: ₹${plan.price} (${plan.billingCycle}) - Active: ${plan.isActive}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating plans:', error);
    process.exit(1);
  }
}

createPlans();
