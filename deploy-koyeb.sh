#!/bin/bash

# VideoMate Shorts - Koyeb Deployment Script
# This script helps you deploy your application to Koyeb

echo "🚀 VideoMate Shorts - Koyeb Deployment Script"
echo "=============================================="

# Check if Koyeb CLI is installed
if ! command -v koyeb &> /dev/null; then
    echo "❌ Koyeb CLI is not installed."
    echo "📥 Install it from: https://github.com/koyeb/koyeb-cli"
    echo "   Or use the web interface at: https://app.koyeb.com"
    exit 1
fi

# Check if user is logged in
if ! koyeb auth whoami &> /dev/null; then
    echo "🔐 Please login to Koyeb first:"
    echo "   koyeb auth login"
    exit 1
fi

echo "✅ Koyeb CLI is installed and you're logged in"

# Check if koyeb.yaml exists
if [ ! -f "koyeb.yaml" ]; then
    echo "❌ koyeb.yaml file not found!"
    echo "   Make sure you're in the project root directory"
    exit 1
fi

echo "✅ koyeb.yaml configuration found"

# Ask for confirmation
read -p "🤔 Do you want to deploy to Koyeb? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🚀 Starting deployment..."

# Deploy using koyeb.yaml
echo "📦 Deploying services from koyeb.yaml..."
koyeb service create --config koyeb.yaml

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to https://app.koyeb.com to view your services"
    echo "2. Set up your secrets in the Koyeb dashboard:"
    echo "   - mongodb-uri"
    echo "   - jwt-secret"
    echo "   - google-client-id (if using Google OAuth)"
    echo "   - google-client-secret (if using Google OAuth)"
    echo "   - r2-account-id"
    echo "   - r2-access-key-id"
    echo "   - r2-secret-access-key"
    echo "   - r2-bucket-name"
    echo "   - r2-public-url"
    echo "   - razorpay-key-id"
    echo "   - razorpay-key-secret"
    echo ""
    echo "3. Your services will be available at:"
    echo "   - Backend: https://videomate-shorts-api-{region}.koyeb.app"
    echo "   - Frontend: https://videomate-shorts-frontend-{region}.koyeb.app"
    echo ""
    echo "📖 For detailed instructions, see KOYEB_DEPLOYMENT.md"
else
    echo "❌ Deployment failed!"
    echo "📖 Check the error messages above and see KOYEB_DEPLOYMENT.md for troubleshooting"
    exit 1
fi
