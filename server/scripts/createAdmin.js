import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-app');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new Admin({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // This will be hashed automatically
      permissions: {
        canManageUsers: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManagePayments: true,
        canAccessReports: true
      }
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login.');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
