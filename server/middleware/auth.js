import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    
    // Check if it's an admin token
    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: 'Invalid admin token.' });
      }
      req.admin = admin;
      req.userType = 'admin';
    } else {
      // Regular user token
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid user token.' });
      }
      req.user = user;
      req.userType = 'user';
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Token verification failed.' });
  }
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

// Check if user is regular user
export const requireUser = (req, res, next) => {
  if (req.userType !== 'user') {
    return res.status(403).json({ message: 'User access required.' });
  }
  next();
};

// Optional auth - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
      
      if (decoded.type === 'admin') {
        const admin = await Admin.findById(decoded.id).select('-password');
        if (admin && admin.isActive) {
          req.admin = admin;
          req.userType = 'admin';
        }
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
          req.userType = 'user';
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
