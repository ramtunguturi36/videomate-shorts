# VideoMate Shorts - Koyeb Deployment Guide

This guide will help you deploy your VideoMate Shorts application to Koyeb, a modern cloud platform that provides excellent performance and global distribution.

## Prerequisites

1. **Koyeb Account**: Sign up at [koyeb.com](https://koyeb.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **MongoDB Database**: Set up MongoDB Atlas or use Koyeb's managed database
4. **Environment Variables**: Prepare your environment variables

## Why Koyeb?

- **Global Edge Network**: Fast performance worldwide
- **Automatic HTTPS**: Free SSL certificates
- **Docker Support**: Native container deployment
- **Auto-scaling**: Automatic scaling based on traffic
- **Zero-downtime Deployments**: Blue-green deployments
- **Built-in Monitoring**: Application metrics and logs

## Deployment Methods

### Method 1: Using koyeb.yaml (Recommended)

The project includes a `koyeb.yaml` file for automatic deployment configuration.

#### Steps:
1. **Connect GitHub**:
   - Go to [Koyeb Console](https://app.koyeb.com)
   - Click "Create Service"
   - Select "GitHub" and connect your repository

2. **Deploy with Blueprint**:
   - Choose "Deploy from Blueprint"
   - Select your repository
   - Koyeb will automatically detect the `koyeb.yaml` file
   - Click "Deploy"

3. **Configure Secrets**:
   - Go to "Secrets" in your Koyeb dashboard
   - Add all the required secrets (see Environment Variables section)

### Method 2: Manual Service Creation

#### Backend Service:
1. **Create Web Service**:
   - Name: `videomate-shorts-api`
   - Runtime: Docker
   - Dockerfile: `server/Dockerfile`
   - Port: 8000

2. **Configure Environment**:
   - Set all environment variables (see below)
   - Choose regions: Frankfurt (fra) and Singapore (sin)
   - Instance type: nano (for free tier)

#### Frontend Service:
1. **Create Web Service**:
   - Name: `videomate-shorts-frontend`
   - Runtime: Docker
   - Dockerfile: `Dockerfile`
   - Port: 3000

2. **Configure Environment**:
   - Set frontend environment variables
   - Choose same regions as backend

## Environment Variables

### Backend Service Secrets

Create these secrets in Koyeb dashboard:

```bash
# Database
mongodb-uri: mongodb+srv://username:password@cluster.mongodb.net/videomate?retryWrites=true&w=majority

# Authentication
jwt-secret: your-super-secret-jwt-key-here

# Google OAuth (optional)
google-client-id: your-google-client-id
google-client-secret: your-google-client-secret

# Cloudflare R2 Storage
r2-account-id: your-cloudflare-account-id
r2-access-key-id: your-r2-access-key-id
r2-secret-access-key: your-r2-secret-access-key
r2-bucket-name: your-bucket-name
r2-public-url: https://your-bucket-name.your-account-id.r2.cloudflarestorage.com

# Razorpay Payments
razorpay-key-id: your-razorpay-key-id
razorpay-key-secret: your-razorpay-key-secret
```

### Backend Service Environment Variables

```bash
NODE_ENV=production
PORT=8000
JWT_EXPIRES_IN=24h
CLIENT_URL=https://videomate-shorts-frontend-{region}.koyeb.app
```

### Frontend Service Environment Variables

```bash
VITE_API_URL=https://videomate-shorts-api-{region}.koyeb.app/api
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
```

## Database Setup

### Option 1: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster
3. Create database user
4. Whitelist Koyeb IP ranges (0.0.0.0/0 for all)
5. Get connection string

### Option 2: Koyeb Managed Database
1. In Koyeb dashboard, create "Database"
2. Choose MongoDB
3. Select plan (free tier available)
4. Note the connection string

## Local Development with Docker

Use the included `docker-compose.yml` for local development:

```bash
# Copy environment variables
cp env.example .env

# Edit .env with your values
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Deployment Process

### 1. Initial Deployment
```bash
# Push your code to GitHub
git add .
git commit -m "Add Koyeb deployment configuration"
git push origin main

# Deploy to Koyeb (if using CLI)
koyeb service create --name videomate-shorts-api --dockerfile server/Dockerfile
```

### 2. Setting Up Secrets
1. Go to Koyeb Dashboard → Secrets
2. Create each secret with the values from your environment
3. Secrets are automatically injected into your services

### 3. Domain Configuration
1. Go to your service settings
2. Add custom domain (optional)
3. Koyeb provides free subdomain: `your-service-name-{region}.koyeb.app`

## Monitoring and Logs

### View Logs
```bash
# Using Koyeb CLI
koyeb logs --service videomate-shorts-api

# Or in dashboard
# Go to Service → Logs
```

### Health Checks
- Backend: `https://your-api-url.koyeb.app/api/health`
- Frontend: `https://your-frontend-url.koyeb.app/health`

### Metrics
- CPU and Memory usage
- Request latency
- Error rates
- Custom metrics

## Scaling Configuration

### Auto-scaling
```yaml
scaling:
  min_instances: 1
  max_instances: 3
  target_cpu_percent: 70
```

### Manual Scaling
1. Go to service settings
2. Adjust instance count
3. Choose instance types (nano, micro, small, medium, large)

## Security Features

### Built-in Security
- **HTTPS**: Automatic SSL certificates
- **DDoS Protection**: Built-in protection
- **Firewall**: Configurable network rules
- **Secrets Management**: Secure environment variables

### Additional Security
- **CORS**: Configured for production
- **Rate Limiting**: Implement in your application
- **Input Validation**: Server-side validation
- **Authentication**: JWT-based auth

## Performance Optimization

### Global Distribution
- Deploy in multiple regions (fra, sin, nyc, sfo)
- Automatic load balancing
- Edge caching for static assets

### Caching
- Static assets cached at edge
- API response caching (implement in your app)
- Database query optimization

## Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check build logs
   koyeb logs --service your-service-name
   ```

2. **Database Connection Issues**:
   - Verify MongoDB connection string
   - Check IP whitelist in MongoDB Atlas
   - Ensure database user has proper permissions

3. **CORS Issues**:
   - Verify CLIENT_URL environment variable
   - Check CORS configuration in server code

4. **File Upload Issues**:
   - Verify Cloudflare R2 credentials
   - Check bucket permissions
   - Ensure R2_PUBLIC_URL is correct

### Debug Commands
```bash
# Check service status
koyeb service list

# View service details
koyeb service get your-service-name

# Check logs
koyeb logs --service your-service-name --follow

# Restart service
koyeb service restart your-service-name
```

## Cost Optimization

### Free Tier Limits
- **Compute**: 512MB RAM, 0.1 vCPU
- **Bandwidth**: 100GB/month
- **Build Time**: 2 hours/month
- **Services**: 2 services max

### Paid Plans
- **Starter**: $7/month per service
- **Professional**: $25/month per service
- **Enterprise**: Custom pricing

## Migration from Render

### Key Differences
- **Docker-based**: Koyeb uses Docker containers
- **Global CDN**: Better performance worldwide
- **Auto-scaling**: More sophisticated scaling
- **Secrets Management**: Better security

### Migration Steps
1. **Export Environment Variables** from Render
2. **Create Secrets** in Koyeb dashboard
3. **Update Domain References** in your code
4. **Deploy to Koyeb** using koyeb.yaml
5. **Test Thoroughly** before switching DNS
6. **Update DNS** to point to Koyeb

## Best Practices

### Development
- Use feature branches for development
- Test locally with Docker Compose
- Use environment-specific configurations

### Production
- Enable monitoring and alerting
- Set up proper logging
- Implement health checks
- Use secrets for sensitive data
- Regular security updates

### Performance
- Optimize Docker images
- Use multi-stage builds
- Implement caching strategies
- Monitor resource usage

## Support and Resources

- **Koyeb Documentation**: [docs.koyeb.com](https://docs.koyeb.com)
- **Community**: [Discord](https://discord.gg/koyeb)
- **Status Page**: [status.koyeb.com](https://status.koyeb.com)
- **Support**: Available through dashboard

---

**Ready to deploy?** Follow the steps above and your VideoMate Shorts application will be running on Koyeb's global infrastructure!
