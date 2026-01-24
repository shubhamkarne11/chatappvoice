# SoundShield Project Setup Guide

Follow the steps below to set up and run the project correctly on your system.

---

## 1. Frontend Setup (React Native App)

### Step 1: Navigate to the React Native project folder

```
cd react-native-chat
```

### Step 2: Install project dependencies

```
npm install --legacy-peer-deps
```

### Step 3: Install audio package

```
npm install expo-av
```

### Step 4: Reinstall dependencies to ensure proper setup

```
npm install
```

### Step 5: Install FFmpeg on Windows

```
winget install ffmpeg
```

### Step 6: Verify FFmpeg installation

Run the following command to check the installation path:

```
where ffmpeg
```

Make sure the displayed path is correctly added to your system environment variables.

---

## 2. Backend Setup (Python Server)

### Step 1: Navigate to the backend folder

```
cd voice-ai-server
```

### Step 2: Create a virtual environment

```
python -m venv venv
```

### Step 3: Activate the virtual environment

For Windows PowerShell:

```
.\venv\Scripts\activate
```

### Step 4: Install required Python dependencies

```
pip install -r requirements.txt
```

### Step 5: Start the backend server

```
python app.py
```

---

## 3. Run the Mobile Application

Open a new terminal window and return to the frontend folder. Then run:

```
npx expo start -c
```

Scan the generated QR code using the Expo Go app on your mobile device to launch the application.

---

## Important Notes

- Keep both terminals running:
  - One for the Python backend server  
  - One for the Expo frontend application  

- Your mobile phone and computer must be connected to the same WiFi network.  
- Do not upload the following folders to GitHub:
  - `venv`
  - `node_modules`

---

### You are now ready to use the SoundShield application.