# VideoMate Shorts - Koyeb Deployment Script (PowerShell)
# This script helps you deploy your application to Koyeb

Write-Host "🚀 VideoMate Shorts - Koyeb Deployment Script" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Check if Koyeb CLI is installed
try {
    $null = Get-Command koyeb -ErrorAction Stop
    Write-Host "✅ Koyeb CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Koyeb CLI is not installed." -ForegroundColor Red
    Write-Host "📥 Install it from: https://github.com/koyeb/koyeb-cli" -ForegroundColor Yellow
    Write-Host "   Or use the web interface at: https://app.koyeb.com" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    $null = koyeb auth whoami 2>$null
    Write-Host "✅ You're logged in to Koyeb" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please login to Koyeb first:" -ForegroundColor Yellow
    Write-Host "   koyeb auth login" -ForegroundColor Yellow
    exit 1
}

# Check if koyeb.yaml exists
if (-not (Test-Path "koyeb.yaml")) {
    Write-Host "❌ koyeb.yaml file not found!" -ForegroundColor Red
    Write-Host "   Make sure you're in the project root directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ koyeb.yaml configuration found" -ForegroundColor Green

# Ask for confirmation
$confirmation = Read-Host "🤔 Do you want to deploy to Koyeb? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Starting deployment..." -ForegroundColor Green

# Deploy using koyeb.yaml
Write-Host "📦 Deploying services from koyeb.yaml..." -ForegroundColor Blue
try {
    koyeb service create --config koyeb.yaml
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://app.koyeb.com to view your services" -ForegroundColor White
    Write-Host "2. Set up your secrets in the Koyeb dashboard:" -ForegroundColor White
    Write-Host "   - mongodb-uri" -ForegroundColor Gray
    Write-Host "   - jwt-secret" -ForegroundColor Gray
    Write-Host "   - google-client-id (if using Google OAuth)" -ForegroundColor Gray
    Write-Host "   - google-client-secret (if using Google OAuth)" -ForegroundColor Gray
    Write-Host "   - r2-account-id" -ForegroundColor Gray
    Write-Host "   - r2-access-key-id" -ForegroundColor Gray
    Write-Host "   - r2-secret-access-key" -ForegroundColor Gray
    Write-Host "   - r2-bucket-name" -ForegroundColor Gray
    Write-Host "   - r2-public-url" -ForegroundColor Gray
    Write-Host "   - razorpay-key-id" -ForegroundColor Gray
    Write-Host "   - razorpay-key-secret" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Your services will be available at:" -ForegroundColor White
    Write-Host "   - Backend: https://videomate-shorts-api-{region}.koyeb.app" -ForegroundColor Gray
    Write-Host "   - Frontend: https://videomate-shorts-frontend-{region}.koyeb.app" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📖 For detailed instructions, see KOYEB_DEPLOYMENT.md" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "📖 Check the error messages above and see KOYEB_DEPLOYMENT.md for troubleshooting" -ForegroundColor Yellow
    exit 1
}
