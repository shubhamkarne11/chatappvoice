# Firebase Storage CORS Configuration Guide

## Problem
When running your React Native app on web (localhost:8081), Firebase Storage uploads fail with CORS errors. This is because Firebase Storage requires CORS to be explicitly configured for web browsers.

## Solution: Configure CORS for Firebase Storage

### Option 1: Using Google Cloud SDK (gsutil) - RECOMMENDED

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # Download from: https://cloud.google.com/sdk/docs/install
   # Or use winget on Windows:
   winget install Google.CloudSDK
   ```

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
   (Replace `YOUR_PROJECT_ID` with your Firebase project ID from `app.config.js`)

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set firebase-storage-cors.json gs://YOUR_STORAGE_BUCKET
   ```
   (Replace `YOUR_STORAGE_BUCKET` with your storage bucket name, e.g., `chatappy-d0272.firebasestorage.app`)

5. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://YOUR_STORAGE_BUCKET
   ```

### Option 2: Using Google Cloud Console (Web UI)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **Cloud Storage** > **Buckets**
4. Click on your storage bucket (e.g., `chatappy-d0272.firebasestorage.app`)
5. Go to the **Configuration** tab
6. Click **Edit CORS configuration**
7. Paste the contents of `firebase-storage-cors.json`:
   ```json
   [
     {
       "origin": ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000", "http://127.0.0.1:8081"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
       "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
8. Click **Save**

### Option 3: Quick Script (Windows PowerShell)

Create a file `setup-cors.ps1`:
```powershell
# Replace these variables
$PROJECT_ID = "YOUR_PROJECT_ID"
$STORAGE_BUCKET = "YOUR_STORAGE_BUCKET"

# Authenticate (will open browser)
gcloud auth login

# Set project
gcloud config set project $PROJECT_ID

# Apply CORS
gsutil cors set firebase-storage-cors.json "gs://$STORAGE_BUCKET"

# Verify
gsutil cors get "gs://$STORAGE_BUCKET"
```

Run it:
```powershell
.\setup-cors.ps1
```

## For Production

When deploying to production, add your production domain to the CORS configuration:

```json
[
  {
    "origin": [
      "http://localhost:8081",
      "http://localhost:19006",
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

## Verify It Works

After configuring CORS:
1. Restart your Expo dev server
2. Try uploading an image or voice message
3. Check the browser console - CORS errors should be gone

## Important Notes

- **Mobile apps don't need CORS** - This only affects web browsers
- **CORS changes can take a few minutes to propagate**
- **You only need to configure this once per storage bucket**
- **Make sure you're using the correct storage bucket name** (check your `.env` or `app.config.js`)

## Troubleshooting

If uploads still fail after configuring CORS:

1. **Check the bucket name**: Make sure you're using the correct storage bucket name
2. **Wait a few minutes**: CORS changes can take time to propagate
3. **Clear browser cache**: Sometimes browsers cache CORS preflight responses
4. **Check Firebase Storage Rules**: Make sure your Storage Security Rules allow uploads
5. **Verify authentication**: Ensure the user is properly authenticated before uploading

## Storage Security Rules

Also make sure your Firebase Storage Security Rules allow uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Update these rules in Firebase Console > Storage > Rules.

