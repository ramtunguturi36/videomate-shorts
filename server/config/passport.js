import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Google OAuth Strategy - only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }
    
    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.isEmailVerified = true;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      name: profile.displayName,
      email: profile.emails[0].value,
      googleId: profile.id,
      isEmailVerified: true,
      lastLogin: new Date(),
      password: 'google-oauth-user' // Placeholder, will be ignored
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
  }));
} else {
  console.log('Google OAuth not configured - skipping Google Strategy initialization');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, { id: user._id, type: 'user' });
});

// Deserialize user from session
passport.deserializeUser(async (data, done) => {
  try {
    if (data.type === 'admin') {
      const admin = await Admin.findById(data.id).select('-password');
      done(null, admin);
    } else {
      const user = await User.findById(data.id).select('-password');
      done(null, user);
    }
  } catch (error) {
    done(error, null);
  }
});
