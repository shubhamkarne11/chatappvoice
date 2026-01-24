# Firebase Storage CORS Setup Script
# This script configures CORS for Firebase Storage to allow web uploads

# IMPORTANT: Replace these variables with your actual values
$PROJECT_ID = "chatappy-d0272"  # Your Firebase Project ID
$STORAGE_BUCKET = "chatappy-d0272.firebasestorage.app"  # Your Storage Bucket Name

Write-Host "🚀 Setting up Firebase Storage CORS configuration..." -ForegroundColor Green
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Or use: winget install Google.CloudSDK" -ForegroundColor Yellow
    exit 1
}

# Check if gsutil is available
try {
    $gsutilVersion = gsutil --version 2>&1
    Write-Host "✅ gsutil found" -ForegroundColor Green
} catch {
    Write-Host "❌ gsutil not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   Project ID: $PROJECT_ID"
Write-Host "   Storage Bucket: $STORAGE_BUCKET"
Write-Host ""

# Authenticate (will open browser)
Write-Host "🔐 Authenticating with Google Cloud..." -ForegroundColor Yellow
gcloud auth login

# Set project
Write-Host "📁 Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Apply CORS configuration
Write-Host ""
Write-Host "⚙️  Applying CORS configuration..." -ForegroundColor Yellow
if (Test-Path "firebase-storage-cors.json") {
    gsutil cors set firebase-storage-cors.json "gs://$STORAGE_BUCKET"
    Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ firebase-storage-cors.json not found!" -ForegroundColor Red
    Write-Host "Please make sure the file exists in the current directory." -ForegroundColor Yellow
    exit 1
}

# Verify CORS is set
Write-Host ""
Write-Host "🔍 Verifying CORS configuration..." -ForegroundColor Yellow
gsutil cors get "gs://$STORAGE_BUCKET"

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart your Expo dev server"
Write-Host "   2. Try uploading an image or voice message"
Write-Host "   3. Check the browser console - CORS errors should be gone"
Write-Host ""

