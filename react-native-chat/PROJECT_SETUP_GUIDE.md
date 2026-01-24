# Complete Project Setup Guide

## 📋 Overview
This document contains all commands, installations, and changes made to set up the React Native Chat App with Voice AI Masking feature.

---

## 🚀 Initial Setup Commands

### 1. React Native Chat App Setup

```bash
# Navigate to project directory
cd react-native-chat

# Install all dependencies
npm install

# OR if using yarn
yarn install
```

### 2. Voice AI Server Setup (Python)

```bash
# Navigate to voice AI server directory
cd voice-ai-server

# Create virtual environment (Windows)
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. FFmpeg Installation (Required for Voice Processing)

```bash
# Install FFmpeg using winget (Windows)
winget install ffmpeg

# Verify installation
where ffmpeg
```

**Expected output:**
```
C:\Users\YOUR_USERNAME\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0-full_build\bin\ffmpeg.exe
```

---

## 📦 Dependencies Installed

### React Native Chat (`react-native-chat/package.json`)

**Key Dependencies Added:**
- `expo-av`: ~15.0.1 (Audio recording and playback)
- `expo-file-system`: ~19.0.17 (File operations)
- `axios`: ^1.7.7 (HTTP requests to voice AI server)
- `crypto-js`: ^4.2.0 (Client-side encryption)
- `firebase`: ^11.0.2 (Firestore database)

### Voice AI Server (`voice-ai-server/requirements.txt`)

**Python Packages:**
- `flask==3.0.0` (Web framework)
- `flask-cors==4.0.0` (CORS support)
- `torch>=2.5.0` (PyTorch for AI)
- `torchaudio>=2.5.0` (Audio processing)
- `librosa==0.10.1` (Audio analysis)
- `soundfile==0.12.1` (Audio file I/O)
- `pydub==0.25.1` (Audio manipulation)
- `audioread==3.0.1` (Audio format support)
- `cryptography==41.0.5` (Encryption/Decryption)

---

## 🔧 Configuration Changes

### 1. Firebase Configuration
**File:** `react-native-chat/src/config/firebase.js`

**Changes:**
- Added comment about CORS configuration
- No Firebase Storage used (only Firestore)

### 2. Environment Variables
**File:** `react-native-chat/.env` (Create if not exists)

**Required Variables:**
```
EXPO_PUBLIC_API_KEY=your_firebase_api_key
EXPO_PUBLIC_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_APP_ID=your_firebase_app_id
EXPO_PUBLIC_MEASUREMENT_ID=your_measurement_id
```

---

## 🎯 Key Code Changes Made

### 1. Voice Recording Implementation
**File:** `react-native-chat/src/screens/Chat.js`

**Changes:**
- Replaced `expo-audio` with `expo-av` for recording
- Added `startRecording()` function using `Audio.Recording.createAsync()`
- Added `stopRecording()` function with AI processing integration
- Added recording duration timer
- Added cleanup on component unmount

### 2. Voice AI Service
**File:** `react-native-chat/src/utils/voiceAI.js`

**Changes:**
- Created `VoiceAIService` class
- Added `processVoice()` method to send audio to Python server
- Added `decryptVoice()` method for decryption
- Added `checkHealth()` method to verify server status
- Implemented base64 conversion for React Native compatibility
- Added timeout handling (60 seconds)
- Enhanced error handling with server traceback display

### 3. Voice Message Sending (No Firebase Storage)
**File:** `react-native-chat/src/screens/Chat.js`

**Changes:**
- Replaced `uploadVoiceAsync()` with `sendVoiceMessage()`
- Voice messages now stored as base64 data URIs in Firestore
- No Firebase Storage uploads (privacy-focused)
- Added MIME type detection and handling
- Added blob-to-base64 conversion for web

### 4. Voice Playback
**File:** `react-native-chat/src/screens/Chat.js`

**Changes:**
- Renamed `Audio` import to `ExpoAudio` to avoid conflicts
- Added `handlePlayAudio()` function
- Web: Uses browser `Audio` API
- Native: Uses `expo-av` Sound API
- Added base64 data URI to file conversion for native playback
- Added cleanup for audio resources

### 5. UI Layout Fixes
**File:** `react-native-chat/src/screens/Chat.js`

**Changes:**
- Fixed message visibility (messages no longer hidden behind input bar)
- Added `WEB_INPUT_BOTTOM_GAP` and `NATIVE_INPUT_BOTTOM_GAP` constants
- Adjusted `paddingBottom` in `messagesContainerStyle`
- Adjusted `bottomOffset` for GiftedChat
- Reduced gap between last message and input bar (90px)

### 6. Voice AI Server
**File:** `voice-ai-server/app.py`

**Changes:**
- Added FFmpeg detection and path configuration
- Added `find_ffmpeg()` function to locate FFmpeg executable
- Added dynamic PATH configuration for pydub
- Added audio format conversion (webm/mp3/m4a → WAV)
- Added comprehensive error logging
- Added health check endpoint (`/health`)
- Added voice processing endpoint (`/api/process-voice`)
- Added decryption endpoint (`/api/decrypt-voice`)

### 7. Component Fixes
**Files:**
- `react-native-chat/src/components/ChatHeader.js`
- `react-native-chat/src/components/ContactRow.js`

**Changes:**
- Removed `defaultProps` (deprecated in React)
- Moved default values to function parameters

### 8. Privacy Utils
**File:** `react-native-chat/src/utils/privacyUtils.js`

**Changes:**
- Enhanced `decryptMessage()` error handling
- Added validation for empty/invalid encrypted text
- Improved error messages for decryption failures

---

## 🏃 Running the Application

### Start React Native Chat App

```bash
# Navigate to react-native-chat directory
cd react-native-chat

# Start Expo development server
npm start

# OR for web only
npm run web

# OR for Android
npm run android

# OR for iOS
npm run ios
```

### Start Voice AI Server

```bash
# Navigate to voice-ai-server directory
cd voice-ai-server

# Activate virtual environment (if not already active)
venv\Scripts\activate

# Run Flask server
python app.py
```

**Server will start on:** `http://localhost:8000`

**Health Check:** `http://localhost:8000/health`

---

## 🔍 Verification Steps

### 1. Check FFmpeg Installation
```bash
where ffmpeg
ffmpeg -version
```

### 2. Check Voice AI Server
```bash
# In browser or using curl
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "message": "Voice AI Masking Server Running",
  "status": "ok",
  "version": "1.0.0"
}
```

### 3. Test Voice Recording
1. Open the chat app
2. Click microphone icon
3. Record a voice message
4. Stop recording
5. Verify message appears in chat
6. Click play button to verify playback

---

## 📝 Important Notes

### Firebase Setup
- **Firestore Database:** ✅ Enabled and configured
- **Firebase Storage:** ❌ NOT used (privacy-focused)
- **Authentication:** ✅ Required for chat access

### Voice Message Storage
- Voice messages are stored as **base64 data URIs** in Firestore
- No files are uploaded to Firebase Storage
- Messages are processed locally and sent directly to Firestore
- Maximum message size: ~1MB (Firestore document limit)

### FFmpeg Requirements
- FFmpeg must be installed and accessible
- Server automatically detects FFmpeg location
- If FFmpeg not found, voice processing will fail with clear error message

### Platform Differences
- **Web:** Uses browser Audio API for playback
- **Native (iOS/Android):** Uses expo-av Sound API
- **Recording:** Uses expo-av Recording API on all platforms

---

## 🐛 Troubleshooting

### Voice Recording Not Working
1. Check microphone permissions
2. Verify `expo-av` is installed
3. Check browser console for errors

### Voice Playback Error
1. Verify audio data is valid base64
2. Check MIME type is correct
3. Verify `expo-av` is properly imported as `ExpoAudio`

### Voice AI Server Not Responding
1. Check if server is running (`python app.py`)
2. Verify FFmpeg is installed
3. Check server logs for errors
4. Verify port 8000 is not in use

### Messages Hidden Behind Input Bar
1. Check `WEB_INPUT_BOTTOM_GAP` value (should be 90)
2. Verify `paddingBottom` in `messagesContainerStyle`
3. Check `bottomOffset` in GiftedChat props

---

## 📚 File Structure

```
allneeddocs/
├── react-native-chat/
│   ├── src/
│   │   ├── screens/
│   │   │   └── Chat.js (Main chat screen with voice features)
│   │   ├── utils/
│   │   │   ├── voiceAI.js (Voice AI service)
│   │   │   └── privacyUtils.js (Encryption utilities)
│   │   ├── components/
│   │   │   ├── ChatHeader.js
│   │   │   └── ContactRow.js
│   │   └── config/
│   │       └── firebase.js
│   ├── package.json
│   └── app.config.js
│
└── voice-ai-server/
    ├── app.py (Flask server)
    ├── requirements.txt
    └── models/
        └── voice_masking.py (AI model)
```

---

## ✅ Checklist for Handover

- [ ] FFmpeg installed and verified
- [ ] Python virtual environment created and activated
- [ ] All npm packages installed (`npm install`)
- [ ] All Python packages installed (`pip install -r requirements.txt`)
- [ ] Firebase configuration added to `.env`
- [ ] Voice AI server running (`python app.py`)
- [ ] React Native app running (`npm start`)
- [ ] Voice recording tested
- [ ] Voice playback tested
- [ ] Messages visible (not hidden behind input bar)

---

## 🎉 That's It!

Your friend can now:
1. Run `npm install` in `react-native-chat/`
2. Run `pip install -r requirements.txt` in `voice-ai-server/`
3. Start both servers
4. Test voice recording and playback

**No Firebase Storage configuration needed!** Everything works with Firestore only.

