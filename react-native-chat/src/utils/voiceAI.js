import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Helper function to convert ArrayBuffer to base64 (works in React Native)
const arrayBufferToBase64 = (buffer) => {
  if (Platform.OS === 'web' && typeof btoa !== 'undefined') {
    // Use btoa on web
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  } else {
    // React Native compatible: convert in chunks to avoid stack overflow
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      // Convert chunk to array to avoid apply() issues
      const chunkArray = Array.from(chunk);
      binary += String.fromCharCode.apply(null, chunkArray);
    }
    // Use base64 encoding - in React Native, we can use Buffer or a polyfill
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(binary, 'binary').toString('base64');
    }
    // Fallback: manual base64 encoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < binary.length) {
      const a = binary.charCodeAt(i++);
      const b = i < binary.length ? binary.charCodeAt(i++) : 0;
      const c = i < binary.length ? binary.charCodeAt(i++) : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
    }
    return result;
  }
};

const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.1.2:8000';

export class VoiceAIService {
  constructor() {
    this.apiUrl = API_URL;
  }

  /**
   * Process voice with AI masking
   */
  async processVoice(audioUri, options = {}) {
    try {
      const {
        pitchShift = true,
        pitchSteps = 4,
        useAiMasking = true,
        encrypt = true,
      } = options;

      console.log('🎤 Processing voice with options:', options);

      // Create form data
      const formData = new FormData();
      
      // For React Native
      if (Platform.OS !== 'web') {
        const audioFile = {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'voice.m4a',
        };
        formData.append('audio_file', audioFile);
        console.log('📎 Attaching audio file from React Native:', audioUri);
      } else {
        // For web - handle blob URLs
        console.log('📎 Fetching audio blob from:', audioUri);
        const response = await fetch(audioUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log('📎 Audio blob size:', blob.size, 'bytes, type:', blob.type);
        // Use the correct file extension based on blob type
        const extension = blob.type.includes('m4a') ? 'm4a' : 
                         blob.type.includes('wav') ? 'wav' : 
                         blob.type.includes('webm') ? 'webm' : 'm4a';
        formData.append('audio_file', blob, `voice.${extension}`);
      }

      formData.append('pitch_shift', pitchShift.toString());
      formData.append('pitch_steps', pitchSteps.toString());
      formData.append('use_ai_masking', useAiMasking.toString());
      formData.append('encrypt', encrypt.toString());

       console.log('📤 Sending to server:', `${this.apiUrl}/api/process-voice`);

      // Send to server with increased timeout for audio processing
      const response = await axios.post(
        `${this.apiUrl}/api/process-voice`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: Platform.OS !== 'web' ? 'arraybuffer' : 'blob',
          timeout: 60000, // Increased to 60 seconds for audio processing
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 Upload progress: ${percentCompleted}%`);
          },
        }
      );

      console.log('✅ Voice processed successfully');

      // Save processed file
      const processedUri = `${FileSystem.documentDirectory}masked_${Date.now()}.${encrypt ? 'enc' : 'wav'}`;
      
      if (Platform.OS !== 'web') {
        // Convert arraybuffer to base64 for React Native
        const arrayBuffer = response.data;
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        await FileSystem.writeAsStringAsync(processedUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('💾 Saved processed voice to:', processedUri);
        return processedUri;
      } else {
        const url = URL.createObjectURL(response.data);
        return url;
      }
    } catch (error) {
      console.error('❌ Voice processing error:', error);
      console.error('Error details:', error.message);
      
      // Try to read the error response from server
      if (error.response && error.response.data) {
        try {
          let errorMessage = error.message;
          if (Platform.OS === 'web' && error.response.data instanceof Blob) {
            const errorText = await error.response.data.text();
            try {
              const errorJson = JSON.parse(errorText);
              console.error('📋 Server error details:', errorJson);
              errorMessage = errorJson.error || error.message;
              if (errorJson.traceback) {
                console.error('📋 Server traceback:', errorJson.traceback);
              }
            } catch (parseErr) {
              // If it's not JSON, use the text directly
              errorMessage = errorText || error.message;
              console.error('📋 Server error (non-JSON):', errorMessage);
            }
          } else if (typeof error.response.data === 'object') {
            console.error('📋 Server error details:', error.response.data);
            errorMessage = error.response.data.error || error.message;
          }
          // Create a new error with the server message
          const serverError = new Error(errorMessage);
          serverError.originalError = error;
          throw serverError;
        } catch (parseError) {
          console.error('Could not parse server error:', parseError);
          // If parsing fails, just throw the original error
        }
      }
      
      throw error;
    }
  }

  /**
   * Decrypt voice file
   */
  async decryptVoice(encryptedUri) {
    try {
      const formData = new FormData();
      
      if (Platform.OS !== 'web') {
        const encryptedFile = {
          uri: encryptedUri,
          type: 'application/octet-stream',
          name: 'voice.enc',
        };
        formData.append('encrypted_file', encryptedFile);
      } else {
        const response = await fetch(encryptedUri);
        const blob = await response.blob();
        formData.append('encrypted_file', blob, 'voice.enc');
      }

      const response = await axios.post(
        `${this.apiUrl}/api/decrypt-voice`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: Platform.OS !== 'web' ? 'arraybuffer' : 'blob',
        }
      );

      // Save decrypted file
      const decryptedUri = `${FileSystem.documentDirectory}decrypted_${Date.now()}.wav`;
      
      if (Platform.OS !== 'web') {
        // Convert arraybuffer to base64 for React Native
        const arrayBuffer = response.data;
        const base64data = arrayBufferToBase64(arrayBuffer);

        await FileSystem.writeAsStringAsync(decryptedUri, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return decryptedUri;
      } else {
        const url = URL.createObjectURL(response.data);
        return url;
      }
    } catch (error) {
      console.error('Voice decryption error:', error);
      throw error;
    }
  }

  /**
   * Check server health
   */
  async checkHealth() {
    try {
      console.log('🏥 Checking server health:', `${this.apiUrl}/health`);
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      console.log('✅ Server health:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }
}

export default new VoiceAIService();
