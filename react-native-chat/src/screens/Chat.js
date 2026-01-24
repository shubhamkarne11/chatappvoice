//Fix 2
import PropTypes from 'prop-types';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import EmojiModal from 'react-native-emoji-modal';
import React, { useState,useRef,useEffect, useCallback, useContext } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Send, Bubble, GiftedChat, InputToolbar } from 'react-native-gifted-chat';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
// import voiceAIService from '../utils/voiceAI';
import {
  View,
  Text, 
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,        // ✅ ADD THIS
  Alert,
  Image,
  Keyboard,        // ✅ ADD THIS
  BackHandler,     // ✅ ADD THIS
} from 'react-native';

import { colors } from '../config/constants';
import { auth, database, storage } from '../config/firebase';
import { EncryptionContext } from '../contexts/EncryptionContext';
import { VoiceSettingsContext } from '../contexts/VoiceSettingsContext';
import { 
  detectSensitiveData, 
  maskSensitiveData, 
  encryptMessage, 
  decryptMessage 
} from '../utils/privacyUtils';
import voiceAIService from '../utils/voiceAI'; 

const RenderLoadingUpload = () => (
  <View style={styles.loadingContainerUpload}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Uploading...</Text>
    </View>
  </View>
);

const RenderLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const MIME_EXTENSION_MAP = {
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
};

const inferMimeTypeFromUri = (uri = '', fallback = 'audio/m4a') => {
  if (!uri || typeof uri !== 'string') {
    return fallback;
  }

  if (uri.startsWith('data:')) {
    const match = uri.match(/data:(.*);base64/);
    return match && match[1] ? match[1] : fallback;
  }

  const querylessUri = uri.split('?')[0];
  const extension = querylessUri.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'wav':
    case 'wave':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'webm':
      return 'audio/webm';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
    case 'mp4':
      return 'audio/m4a';
    case 'caf':
      return 'audio/x-caf';
    case 'enc':
      return 'application/octet-stream';
    default:
      return fallback;
  }
};

const extensionFromMimeType = (mimeType = 'audio/m4a') => {
  if (mimeType in MIME_EXTENSION_MAP) {
    return MIME_EXTENSION_MAP[mimeType];
  }
  if (mimeType === 'application/octet-stream') {
    return 'enc';
  }
  return 'm4a';
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result || '';
        const [meta, base64] = String(result).split(',');
        const mime = blob.type || meta.match(/data:(.*);base64/)?.[1] || 'audio/m4a';
        resolve({ base64: base64 || '', mimeType: mime });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });

const WEB_INPUT_BOTTOM_GAP = 90;
const NATIVE_INPUT_BOTTOM_GAP = 90;
const INPUT_BOTTOM_GAP = Platform.OS === 'web' ? WEB_INPUT_BOTTOM_GAP : NATIVE_INPUT_BOTTOM_GAP;

const RenderBubble = (props) => (
  <Bubble
    {...props}
    wrapperStyle={{
      right: { 
        backgroundColor: colors.messageSent,
        borderRadius: 20,
        borderTopRightRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 3,
        marginRight: 8,
        maxWidth: '80%',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
      },
      left: { 
        backgroundColor: colors.messageReceived,
        borderRadius: 20,
        borderTopLeftRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 3,
        marginLeft: 8,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.borderLight,
      },
    }}
    textStyle={{
      right: {
        color: colors.textInverse,
        fontSize: 15.5,
        lineHeight: 22,
        letterSpacing: 0.2,
      },
      left: {
        color: colors.text,
        fontSize: 15.5,
        lineHeight: 22,
        letterSpacing: 0.2,
      },
    }}
    tickStyle={{
      color: colors.textInverse,
    }}
    timeTextStyle={{
      right: {
        color: colors.textInverse,
        opacity: 0.8,
        fontSize: 11,
        fontWeight: '500',
      },
      left: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '500',
      },
    }}
  />
);

const SensitiveMessageBubble = (props) => {
  const { currentMessage } = props;
  const { encryptionKey } = useContext(EncryptionContext);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedText, setDecryptedText] = useState('');

  const handleDecrypt = () => {
    if (currentMessage.encryptedText && encryptionKey) {
      try {
        const decrypted = decryptMessage(currentMessage.encryptedText, encryptionKey);
        setDecryptedText(decrypted);
        setIsDecrypted(true);
      } catch (error) {
        console.error('Decryption failed:', error);
        Alert.alert('Error', 'Failed to decrypt message');
      }
    }
  };

  const handleMask = () => {
    setIsDecrypted(false);
    setDecryptedText('');
  };

  return (
    <View style={styles.sensitiveMessageContainer}>
      <Bubble
        {...props}
        currentMessage={{
          ...currentMessage,
          text: isDecrypted ? decryptedText : currentMessage.text
        }}
        wrapperStyle={{
          right: { 
            backgroundColor: colors.messageSent,
            borderRadius: 20,
            borderTopRightRadius: 4,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 3,
            marginRight: 8,
            maxWidth: '80%',
            shadowColor: colors.error,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
            borderWidth: 2,
            borderColor: colors.error + '30',
          },
          left: { 
            backgroundColor: colors.messageReceived,
            borderRadius: 20,
            borderTopLeftRadius: 4,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 3,
            marginLeft: 8,
            maxWidth: '80%',
            shadowColor: colors.error,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 2,
            borderColor: colors.error + '30',
          },
        }}
      />
      <View style={styles.sensitiveControls}>
        <View style={styles.sensitiveIndicator}>
          <Ionicons name="shield-checkmark" size={13} color={colors.error} />
          <Text style={styles.sensitiveText}>Encrypted</Text>
        </View>
        {!isDecrypted ? (
          <TouchableOpacity 
            style={styles.decryptButton} 
            onPress={handleDecrypt}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-open-outline" size={14} color={colors.textInverse} />
            <Text style={styles.decryptButtonText}>Decrypt</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.maskButton} 
            onPress={handleMask}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-off-outline" size={14} color={colors.textInverse} />
            <Text style={styles.maskButtonText}>Hide</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const RenderMessage = (props, onPlayAudio) => {
  const { currentMessage } = props;
  
  if (currentMessage.audio) {
    const isEncryptedAudio =
      currentMessage.audioEncrypted || currentMessage.audio?.startsWith('data:application/octet-stream');

    return (
      <View style={styles.audioMessageContainer}>
        <TouchableOpacity 
          style={styles.audioButton}
          disabled={isEncryptedAudio}
          onPress={() => {
            if (isEncryptedAudio) {
              Alert.alert('Encrypted Audio', 'Please decrypt this voice message before playback.');
              return;
            }

            if (onPlayAudio) {
              onPlayAudio(currentMessage);
            } else {
              console.log('Play audio:', currentMessage.audio);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.audioIconContainer}>
            <Ionicons name="play" size={20} color={colors.textInverse} />
          </View>
          <View style={styles.audioTextContainer}>
            <Text style={styles.audioText}>
              {isEncryptedAudio ? 'Encrypted Voice Message' : 'Voice Message'}
            </Text>
            <Text style={styles.audioDuration}>Tap to play</Text>
          </View>
          <View style={styles.audioWaveform}>
            {[...Array(12)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.waveformBar, 
                  { height: Math.random() * 20 + 8 }
                ]} 
              />
            ))}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle sensitive/encrypted messages
  if (currentMessage.isSensitive && currentMessage.needsDecryption) {
    return <SensitiveMessageBubble {...props} />;
  }
  
  return <RenderBubble {...props} />;
};

const RenderAttach = (props) => (
  <TouchableOpacity {...props} style={styles.addImageIcon} activeOpacity={0.7}>
    <View style={styles.iconButton}>
      <Ionicons name="image-outline" size={22} color={colors.primary} />
    </View>
  </TouchableOpacity>
);

const RenderInputToolbar = (props, handleEmojiPanel, isRecording, recordingDuration, startRecording, stopRecording) => (
  <View style={styles.inputToolbarWrapper}>
    <InputToolbar
      {...props}
      renderActions={() => RenderActions(handleEmojiPanel, isRecording, recordingDuration, startRecording, stopRecording)}
      containerStyle={styles.inputToolbar}
      textInputProps={{
        ...props.textInputProps,
        onSubmitEditing: (e) => {
          if (props.text && props.text.trim().length > 0) {
            props.onSend({ text: props.text.trim() }, true);
          }
          if (Platform.OS === 'web') {
            e.preventDefault();
          }
        },
        returnKeyType: 'send',
        blurOnSubmit: false,
        enablesReturnKeyAutomatically: true,
        ...(Platform.OS === 'web' && {
          onKeyPress: (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (props.text && props.text.trim().length > 0) {
                props.onSend({ text: props.text.trim() }, true);
              }
            }
          },
        }),
      }}
    />
    <Send {...props}>
      <View style={styles.sendIconContainer}>
        <Ionicons name="send" size={19} color={colors.textInverse} />
      </View>
    </Send>
  </View>
);

const RenderActions = (handleEmojiPanel, isRecording, recordingDuration, startRecording, stopRecording) => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity 
        style={styles.emojiIcon} 
        onPress={handleEmojiPanel}
        activeOpacity={0.7}
      >
        <View style={styles.iconButton}>
          <Ionicons name="happy-outline" size={22} color={colors.primary} />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.voiceIcon, isRecording && styles.recordingIcon]} 
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.7}
      >
        <View style={[styles.iconButton, isRecording && styles.recordingIconButton]}>
          <Ionicons 
            name={isRecording ? "stop-circle" : "mic-outline"} 
            size={22} 
            color={isRecording ? colors.textInverse : colors.primary} 
          />
        </View>
      </TouchableOpacity>
      
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingPulse} />
          <Text style={styles.recordingText}>
            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </View>
  );

function Chat({ route, navigation }) {
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingIntervalRef = useRef(null);
  const soundRef = useRef(null);
  const webAudioRef = useRef(null);

  const handlePlayAudio = useCallback(
    async (message) => {
      if (!message?.audio) {
        return;
      }

      const source = message.audio;

      try {
        if (Platform.OS === 'web') {
          if (webAudioRef.current) {
            try {
              webAudioRef.current.pause();
            } catch (pauseError) {
              console.warn('Unable to pause previous audio element', pauseError);
            }
            webAudioRef.current = null;
          }

          const AudioConstructor =
            (typeof window !== 'undefined' && window.Audio) ||
            (typeof globalThis !== 'undefined' && globalThis.Audio);

          if (!AudioConstructor) {
            throw new Error('Audio playback not supported in this environment.');
          }

          const audioElement = new AudioConstructor(source);
          webAudioRef.current = audioElement;
          audioElement.onended = () => {
            webAudioRef.current = null;
          };
          await audioElement.play();
          return;
        }

        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        let playbackUri = source;

        if (source.startsWith('data:')) {
          const base64Part = source.split(',')[1];
          if (!base64Part) {
            throw new Error('Invalid audio data');
          }

          const mimeType = inferMimeTypeFromUri(source);
          const extension = extensionFromMimeType(mimeType);
          const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
          const fileUri = `${directory}voice_${Date.now()}.${extension}`;

          await FileSystem.writeAsStringAsync(fileUri, base64Part, {
            encoding: FileSystem.EncodingType.Base64,
          });

          playbackUri = fileUri;
        }

        const { sound } = await ExpoAudio.Sound.createAsync({ uri: playbackUri });
        soundRef.current = sound;
        await sound.playAsync();

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.didJustFinish || status.isLoaded === false) {
            try {
              await sound.unloadAsync();
            } catch (unloadError) {
              console.warn('Unable to unload sound', unloadError);
            }
            if (soundRef.current === sound) {
              soundRef.current = null;
            }
          }
        });
      } catch (error) {
        console.error('Audio playback error:', error);
        Alert.alert('Playback Error', 'Unable to play this voice message. Please try again.');
      }
    },
    []
  );


  // ✅ ADD THE CLEANUP useEffect HERE (line ~415)
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      // Cleanup recording on unmount
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
      }
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      if (webAudioRef.current) {
        try {
          webAudioRef.current.pause();
        } catch (pauseError) {
          console.warn('Unable to pause web audio element during cleanup', pauseError);
        }
        webAudioRef.current = null;
      }
    };
  }, []);

  // ✅ SAFETY CHECK: Get encryption context with defaults
  const encryptionContext = useContext(EncryptionContext);
  const { 
    encryptionKey = null,
    keywords = [],
    encryptionEnabled = true 
  } = encryptionContext || {};

  // ✅ Get voice settings context
  const voiceSettingsContext = useContext(VoiceSettingsContext);
  const {
    voiceSettings = {
      pitchShift: true,
      pitchSteps: 4,
      useAiMasking: true,
      noiseLevel: 0.005,
      formantShift: -2,
      preEmphasis: true,
      normalize: true,
    },
    voiceMaskingEnabled = true,
  } = voiceSettingsContext || {};

  // ✅ SAFETY CHECK: Validate route params
  const chatId = route?.params?.id;
  
  if (!chatId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.text }}>
          Invalid chat ID
        </Text>
      </View>
    );
  }


  useEffect(() => {
  // ✅ Safety check: chatId must exist
  if (!chatId) {
    console.error('❌ No chatId provided!');
    return;
  }

  console.log('🔄 Setting up chat listener for chatId:', chatId);

  // ✅ Subscribe to Firestore chat document
  const unsubscribe = onSnapshot(
    doc(database, 'chats', chatId),
    (document) => {
      if (document.exists()) {
        const chatData = document.data();
        
        // ✅ Safety check: messages array exists
        if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
          setMessages(
            chatData.messages.map((message) => ({
              ...message,
              // ✅ Safe date conversion with fallback
              createdAt: message.createdAt?.toDate 
                ? message.createdAt.toDate() 
                : new Date(),
              // ✅ Safe optional fields
              image: message.image || '',
              audio: message.audio || '',
            }))
          );
          console.log('✅ Messages loaded:', chatData.messages.length);
        } else {
          console.log('⚠️ No messages found in chat');
          setMessages([]);
        }
      } else {
        console.error('❌ Chat document does not exist!');
        setMessages([]);
      }
    },
    (error) => {
      // ✅ Error handling
      console.error('❌ Error listening to chat:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    }
  );

  // ✅ Android Back Button Handler (only on mobile)
  let backHandler = null;
  if (Platform.OS === 'android') {
    backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      if (modal) {
        setModal(false);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });
  }

  // ✅ Keyboard listener (works on all platforms)
  const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
    if (modal) {
      setModal(false);
    }
  });

  // ✅ Cleanup function
  return () => {
    console.log('🧹 Cleaning up chat listeners');
    unsubscribe();
    
    // ✅ Only remove backHandler if it was created (Android only)
    if (backHandler) {
      backHandler.remove();
    }
    
    keyboardDidShowListener.remove();
  };
}, [chatId, modal]); // ✅ Dependencies: chatId and modal


  // useEffect(() => {
  //   const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {});
  //   const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {});

  //   return () => {
  //     keyboardDidShowListener.remove();
  //     keyboardDidHideListener.remove();
  //   };
  // }, []);

  const onSend = useCallback(
    async (m = []) => {
      try {
        const chatDocRef = doc(database, 'chats', chatId); // ✅ Changed from route.params.id
        const chatDocSnap = await getDoc(chatDocRef);

        if (!chatDocSnap.exists()) {
          console.error('Chat document does not exist');
          return;
        }

        const chatData = chatDocSnap.data();
        const data = chatData.messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toDate(),
          image: message.image ?? '',
          audio: message.audio ?? '',
        }));

        const messageToSend = m[0];
        let processedMessage = { ...messageToSend };

        // Only process text messages for privacy (not images or audio)
        if (messageToSend.text && !messageToSend.image && !messageToSend.audio && encryptionEnabled) {
          const isSensitive = detectSensitiveData(messageToSend.text, keywords);
          
          if (isSensitive) {
            // Message contains sensitive data - encrypt it
            const masked = maskSensitiveData(messageToSend.text, keywords);
            const encrypted = encryptMessage(messageToSend.text, encryptionKey);
            
            processedMessage = {
              ...messageToSend,
              text: masked, // Display masked text
              originalText: messageToSend.text, // Keep original for reference
              isSensitive: true,
              encryptedText: encrypted,
              needsDecryption: true,
            };

            console.log('📩 Sensitive message detected and encrypted');
          } else {
            // Normal message - no encryption needed
            processedMessage = {
              ...messageToSend,
              isSensitive: false,
              needsDecryption: false,
            };
          }
        }

        // Attach new message
        const messagesWillSend = [{ ...processedMessage, sent: true, received: false }];
        const chatMessages = GiftedChat.append(data, messagesWillSend);

        await setDoc(
          chatDocRef,
          {
            messages: chatMessages,
            lastUpdated: Date.now(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    },
    [chatId, encryptionKey, keywords, encryptionEnabled] // ✅ Changed from route.params.id
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      await uploadImageAsync(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting permissions...');
      
      // Step 1: Request permissions
      const { status } = await ExpoAudio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please grant microphone permission to record voice messages.'
        );
        return;
      }

      console.log('✅ Permission granted');

      // Step 2: Configure audio mode
      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Step 3: Create and start recording
      const { recording: newRecording } = await ExpoAudio.Recording.createAsync(
        ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Step 4: Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  };

  // const stopRecording = async () => {
  //   if (!recording) return;

  //   try {
  //     setIsRecording(false);
  //     clearInterval(recording._interval);
  //     await recording.stopAndUnloadAsync();
  //     const uri = recording.getURI();
  //     setRecording(null);
  //     setRecordingDuration(0);

  //     if (uri) {
  //       await sendVoiceMessage(uri);
  //     }
  //   } catch (err) {
  //     console.error('Failed to stop recording', err);
  //     Alert.alert('Error', 'Failed to stop recording');
  //   }
  // };


  // Update the stopRecording function
  // ✅ FIXED stopRecording function
  const stopRecording = async () => {
    try {
      if (!recording || !isRecording) {
        console.log('⚠️ Not currently recording');
        return;
      }

      console.log('🛑 Stopping recording...');
      
      // Stop the timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      setIsRecording(false);

      // Stop and get URI
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        console.log('✅ Recording saved to:', uri);
        
        // Check if AI server is running
        console.log('🎤 Checking voice AI server...');
        const health = await voiceAIService.checkHealth();
        
        if (health.status === 'error') {
          Alert.alert(
            'Voice Server Offline',
            'Voice masking server is not running. Send the original recording without masking?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Send Without Masking', 
                onPress: () => sendVoiceMessage(uri)
              },
            ]
          );
          return;
        }

        // Show processing indicator
        setUploading(true);

        try {
          console.log('🎤 Processing voice with AI masking...');
          
          // Add timeout wrapper to prevent hanging
          // Use voice settings from context
          const processPromise = voiceAIService.processVoice(uri, {
            pitchShift: voiceMaskingEnabled && voiceSettings.pitchShift,
            pitchSteps: voiceSettings.pitchSteps || 4,
            useAiMasking: voiceMaskingEnabled && voiceSettings.useAiMasking,
            encrypt: false, // Voice encryption disabled (privacy-focused)
          });

          // Add a timeout check
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Processing timeout - server may be slow')), 55000);
          });

          const processedUri = await Promise.race([processPromise, timeoutPromise]);

          console.log('✅ Voice processed successfully!');
          
          await sendVoiceMessage(processedUri, {
            skipLoading: true,
            metadata: {
              audioIsMasked: true,
            },
          });
          
        } catch (error) {
          console.error('❌ Voice processing failed:', error);
          
          let errorMessage = 'Failed to process voice. Send original?';
          
          if (error.message.includes('timeout')) {
            errorMessage = 'Voice processing is taking too long. The server might be busy. Try sending the original?';
          } else if (error.message.includes('ffmpeg') || error.message.includes('Could not load audio')) {
            errorMessage = `Server Error: ${error.message}\n\n💡 TIP: The server needs ffmpeg to process webm files. Please install ffmpeg on the server.\n\nSend original voice message?`;
          } else if (error.message && error.message.length > 0) {
            // Show the actual server error message (truncated if too long)
            const serverError = error.message.length > 200 
              ? error.message.substring(0, 200) + '...' 
              : error.message;
            errorMessage = `Server Error: ${serverError}\n\nSend original voice message?`;
          }
            
          Alert.alert(
            'Processing Failed',
            errorMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Send Original', 
                onPress: () => sendVoiceMessage(uri) 
              },
            ]
          );
        } finally {
          setUploading(false);
        }
      }
    } catch (err) {
      console.error('❌ Failed to stop recording:', err);
      setUploading(false);
      Alert.alert('Error', 'Failed to process voice: ' + err.message);
    }
  };




  const sendVoiceMessage = async (uri, options = {}) => {
    const { mimeType, skipLoading = false, metadata = {} } = options;

    if (!uri) {
      return;
    }

    if (!skipLoading) {
      setUploading(true);
    }

    try {
      let detectedMime = mimeType || inferMimeTypeFromUri(uri);
      let base64Data = '';

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Unable to read audio data (status ${response.status}).`);
        }

        const blob = await response.blob();
        const base64Payload = await blobToBase64(blob);
        base64Data = base64Payload.base64;
        detectedMime = mimeType || base64Payload.mimeType || detectedMime;
      } else {
        detectedMime = mimeType || inferMimeTypeFromUri(uri);
        base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64Data) {
        throw new Error('No audio data available to send.');
      }

      const randomString = uuid.v4();
      const dataUri = `data:${detectedMime};base64,${base64Data}`;
      const sizeApproxBytes = Math.round((base64Data.length * 3) / 4);

      const baseVoiceMessage = {
        _id: randomString,
        createdAt: new Date(),
        text: '',
        audio: dataUri,
        audioMimeType: detectedMime,
        audioSizeBytes: sizeApproxBytes,
        user: {
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: 'https://i.pravatar.cc/300',
        },
      };

      const { user: customUser, ...restMetadata } = metadata || {};
      Object.assign(baseVoiceMessage, restMetadata);

      if (customUser) {
        baseVoiceMessage.user = {
          ...baseVoiceMessage.user,
          ...customUser,
        };
      }

      onSend([baseVoiceMessage]);
    } catch (error) {
      console.error('Error preparing voice message:', error);
      Alert.alert('Voice Message Error', error.message || 'Unable to prepare voice message.');
    } finally {
      if (!skipLoading) {
        setUploading(false);
      }

      if (
        Platform.OS === 'web' &&
        typeof uri === 'string' &&
        uri.startsWith('blob:') &&
        typeof URL !== 'undefined'
      ) {
        try {
          URL.revokeObjectURL(uri);
        } catch (revokeError) {
          console.warn('Unable to revoke temporary object URL', revokeError);
        }
      }
    }
  };

  const uploadImageAsync = async (uri) => {
    setUploading(true);
    
    try {
      let blob;
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new TypeError('Network request failed'));
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send(null);
        });
      }

      const randomString = uuid.v4();
      const fileRef = ref(storage, randomString);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error('Upload error:', error);
          setUploading(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            onSend([
              {
                _id: randomString,
                createdAt: new Date(),
                text: '',
                image: downloadUrl,
                user: {
                  _id: auth?.currentUser?.email,
                  name: auth?.currentUser?.displayName,
                  avatar: 'https://i.pravatar.cc/300',
                },
              },
            ]);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploading(false);
    }
  };

  const handleEmojiPanel = useCallback(() => {
    setModal((prevModal) => {
      if (prevModal) {
        Keyboard.dismiss();
        return false;
      }
      Keyboard.dismiss();
      return true;
    });
  }, []);

  return (
    <View style={styles.container}>
      {uploading && <RenderLoadingUpload />}
      <View style={styles.chatWrapper}>
        <View style={styles.chatContent}>
          <GiftedChat
            messages={messages}
            showAvatarForEveryMessage={false}
            showUserAvatar={false}
            onSend={(messagesArr) => onSend(messagesArr)}
            imageStyle={{ 
              height: 220, 
              width: 220, 
              borderRadius: 16,
              margin: 4,
            }}
            messagesContainerStyle={{ 
              backgroundColor: colors.background,
              paddingBottom: INPUT_BOTTOM_GAP,
              paddingTop: 12,
              paddingHorizontal: 4,
              flexGrow: 1,
            }}
            textInputStyle={{ 
              backgroundColor: colors.backgroundSecondary, 
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15.5,
              maxHeight: 100,
              color: colors.text,
              marginHorizontal: 4,
              fontWeight: '400',
              lineHeight: 20,
              ...(Platform.OS === 'web' && {
                outline: 'none',
                overflowY: 'auto',
              }),
            }}
            user={{
              _id: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              avatar: 'https://i.pravatar.cc/300',
            }}
            renderBubble={(props) => RenderMessage(props, handlePlayAudio)}
            renderSend={(props) => RenderAttach({ ...props, onPress: pickImage })}
            renderUsernameOnMessage
            renderAvatarOnTop
            renderInputToolbar={(props) => 
          RenderInputToolbar(
            props, 
            handleEmojiPanel, 
            isRecording,
            recordingDuration, 
            startRecording, 
            stopRecording
          )
        }
            minInputToolbarHeight={Platform.OS === 'web' ? 76 : 72}
            onPressActionButton={handleEmojiPanel}
            renderLoading={RenderLoading}
            alwaysShowSend
            placeholder="Type a message..."
            isKeyboardInternallyHandled={false}
            bottomOffset={Platform.OS === 'web' ? WEB_INPUT_BOTTOM_GAP : 36}
            listViewProps={{
              showsVerticalScrollIndicator: true,
              contentContainerStyle: { 
                flexGrow: 1,
                paddingBottom: INPUT_BOTTOM_GAP,
              },
              style: {
                flex: 1,
                ...(Platform.OS === 'web' && {
                  overflowY: 'scroll',
                  height: '100%',
                }),
              },
              nestedScrollEnabled: true,
              scrollEnabled: true,
              bounces: true,
              removeClippedSubviews: false,
              keyboardShouldPersistTaps: 'handled',
            }}
            scrollToBottom
            infiniteScroll
          />
        </View>
      </View>

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={styles.emojiModal}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={styles.emojiBackgroundModal}
          columns={8}
          emojiSize={48}
          activeShortcutColor={colors.primary}
          onEmojiSelected={(emoji) => {
            onSend([
              {
                _id: uuid.v4(),
                createdAt: new Date(),
                text: emoji,
                user: {
                  _id: auth?.currentUser?.email,
                  name: auth?.currentUser?.displayName,
                  avatar: 'https://i.pravatar.cc/300',
                },
              },
            ]);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 2,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
    }),
  },
  chatWrapper: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      paddingBottom: WEB_INPUT_BOTTOM_GAP,
    }),
  },
  chatContent: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative',
    }),
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.messageSent,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 240,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  audioIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  audioDuration: {
    color: colors.textInverse,
    fontSize: 12,
    opacity: 0.9,
    marginTop: 3,
    fontWeight: '500',
  },
  audioMessageContainer: {
    marginVertical: 6,
  },
  audioText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  audioTextContainer: {
    flex: 1,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  waveformBar: {
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1.5,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addImageIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  emojiBackgroundModal: {
    backgroundColor: colors.backgroundSecondary,
  },
  emojiContainerModal: {
    height: 380,
    width: 420,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emojiIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiModal: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  inputToolbarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'web' ? 18 : 14,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    minHeight: 80,
    width: '100%',
    zIndex: 1000,
    flexShrink: 0,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      marginBottom: 0,
      boxShadow: '0 -6px 24px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
    }),
  },
  inputToolbar: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 52,
    maxHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainerUpload: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recordingPulse: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.error,
    marginRight: 7,
  },
  recordingIcon: {
    backgroundColor: 'transparent',
  },
  recordingIconButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  sendIconContainer: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    height: 52,
    width: 52,
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  voiceIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensitiveMessageContainer: {
    marginVertical: 5,
  },
  sensitiveControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  sensitiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sensitiveText: {
    fontSize: 11.5,
    color: colors.error,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  decryptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  decryptButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  maskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  maskButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

Chat.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string.isRequired,
      chatName: PropTypes.string,
    }),
  }).isRequired,
  navigation: PropTypes.object.isRequired,
};  

export default Chat;

