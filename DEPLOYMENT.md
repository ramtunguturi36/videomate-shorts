# VideoMate Shorts - Render Deployment Guide

This guide will help you deploy your VideoMate Shorts application to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub (already done ✅)
3. **Environment Variables**: You'll need to set up your environment variables

## Deployment Steps

### 1. Create Render Account and Connect GitHub

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Import your repository: `ramtunguturi36/videomate-shorts`

### 2. Deploy Using render.yaml (Recommended)

The project includes a `render.yaml` file that will automatically configure:
- **Backend API Service** (Node.js)
- **Frontend Static Site** (React)
- **MongoDB Database**

#### Steps:
1. In Render dashboard, click "New +"
2. Select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to deploy

### 3. Set Environment Variables

After deployment, you need to configure these environment variables in Render:

#### Backend Service Environment Variables:
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket-name.your-account-id.r2.cloudflarestorage.com
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

#### Frontend Service Environment Variables:
```
VITE_API_URL=https://your-backend-service-url.onrender.com
```

### 4. Manual Deployment (Alternative)

If you prefer manual setup:

#### Backend Service:
1. Create new "Web Service"
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node
   - **Plan**: Free

#### Frontend Service:
1. Create new "Static Site"
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: Static

#### Database:
1. Create new "MongoDB" database
2. Choose free plan
3. Note the connection string

## Important Notes

### Free Plan Limitations:
- **Sleep Mode**: Free services sleep after 15 minutes of inactivity
- **Build Time**: 90 minutes per month
- **Bandwidth**: 100GB per month

### Production Considerations:
- **HTTPS**: Render provides free SSL certificates
- **Environment Variables**: Keep sensitive data secure
- **Database**: MongoDB Atlas recommended for production
- **File Storage**: Cloudflare R2 for scalable file storage

### Troubleshooting:

1. **Build Failures**: Check build logs in Render dashboard
2. **Environment Variables**: Ensure all required variables are set
3. **Database Connection**: Verify MongoDB connection string
4. **CORS Issues**: Check CLIENT_URL environment variable

## Post-Deployment

1. **Test API Endpoints**: Verify backend is working
2. **Test Frontend**: Check if React app loads correctly
3. **Test Authentication**: Verify login/register functionality
4. **Test File Upload**: Check Cloudflare R2 integration
5. **Test Payments**: Verify Razorpay integration

## Monitoring

- **Logs**: Available in Render dashboard
- **Metrics**: Monitor service health and performance
- **Uptime**: Free plan includes basic monitoring

## Scaling

When ready to scale:
1. Upgrade to paid plans for better performance
2. Use MongoDB Atlas for production database
3. Implement CDN for static assets
4. Add monitoring and alerting

---

**Need Help?** Check Render's documentation or contact support.
