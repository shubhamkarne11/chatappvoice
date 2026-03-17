import React, { useContext, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio as ExpoAudio } from 'expo-av';
import { colors } from '../config/constants';
import { VoiceSettingsContext } from '../contexts/VoiceSettingsContext';
import voiceAIService from '../utils/voiceAI';

// Simple distortion curve for robotic effect
const createDistortionCurve = (amount = 160, sampleRate = 44100) => {
  const k = typeof amount === 'number' ? amount : 50;
  const nSamples = sampleRate;
  const curve = new Float32Array(nSamples);
  const deg = Math.PI / 180;
  for (let i = 0; i < nSamples; i += 1) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const VoiceSettings = () => {
  const voiceContext = useContext(VoiceSettingsContext);
  
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
    updateVoiceSettings = async () => {},
    toggleVoiceMasking = async () => {},
    resetVoiceSettings = async () => {},
  } = voiceContext || {};

  const [localSettings, setLocalSettings] = useState(voiceSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiveStreamOn, setIsLiveStreamOn] = useState(false);
  const [liveStreamError, setLiveStreamError] = useState('');
  const [isPreviewRecording, setIsPreviewRecording] = useState(false);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState('');

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const ringOscRef = useRef(null);
  const previewRecordingRef = useRef(null);

  const handleSave = async () => {
    const success = await updateVoiceSettings(localSettings);
    if (success) {
      setIsEditing(false);
      Alert.alert('Success', 'Voice settings saved!');
    } else {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings?',
      'This will restore all voice masking settings to defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultSettings = {
              pitchShift: true,
              pitchSteps: 4,
              useAiMasking: true,
              noiseLevel: 0.005,
              formantShift: -2,
              preEmphasis: true,
              normalize: true,
            };
            setLocalSettings(defaultSettings);
            await resetVoiceSettings();
            Alert.alert('Success', 'Settings reset to defaults');
          },
        },
      ]
    );
  };

  const updateSetting = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value });
    setIsEditing(true);
  };

  const stopLiveStream = () => {
    try {
      setIsLiveStreamOn(false);

      if (noiseSourceRef.current) {
        try {
          noiseSourceRef.current.stop();
        } catch {
          // ignore
        }
        noiseSourceRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        mediaStreamRef.current = null;
      }

      if (ringOscRef.current) {
        try {
          ringOscRef.current.stop();
        } catch {
          // ignore
        }
        ringOscRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  const toggleLiveStream = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Web Only Feature',
        'Real-time masked monitoring is currently available only when running the app in the web browser.'
      );
      return;
    }

    if (isLiveStreamOn) {
      stopLiveStream();
      return;
    }

    try {
      setLiveStreamError('');

      const hasMedia =
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';

      if (!hasMedia) {
        setLiveStreamError('Browser does not support live microphone access.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextCtor =
        (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;

      if (!AudioContextCtor) {
        setLiveStreamError('Browser does not support Web Audio API.');
        stopLiveStream();
        return;
      }

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      const gainNode = audioContext.createGain();
      // Slight level boost when masking is on, but not too loud
      gainNode.gain.value = voiceMaskingEnabled && localSettings.normalize ? 1.2 : 1.0;

      const highpass = audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      // Child-like: remove most low frequencies so voice is thinner and brighter
      highpass.frequency.value = voiceMaskingEnabled && localSettings.preEmphasis ? 900 : 200;

      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      // Keep highs but cap a bit so it is not harsh
      lowpass.frequency.value = voiceMaskingEnabled ? 6500 : 9000;

      // First formant-style boost in upper mids (child-like tone)
      const formant1 = audioContext.createBiquadFilter();
      formant1.type = 'peaking';
      formant1.frequency.value = 2800;
      formant1.Q.value = 1.1;
      formant1.gain.value = voiceMaskingEnabled ? 7 : 0;

      // Second, gentler boost a bit higher for extra brightness
      const formant2 = audioContext.createBiquadFilter();
      formant2.type = 'peaking';
      formant2.frequency.value = 4200;
      formant2.Q.value = 0.9;
      formant2.gain.value = voiceMaskingEnabled ? 4 : 0;

      // Very soft distortion: just to make it less "studio clean"
      const distortion = audioContext.createWaveShaper();
      if (voiceMaskingEnabled) {
        distortion.curve = createDistortionCurve(25, audioContext.sampleRate || 44100);
        distortion.oversample = '2x';
      } else {
        distortion.curve = createDistortionCurve(0, audioContext.sampleRate || 44100);
      }

      const noiseGain = audioContext.createGain();
      const baseNoise = localSettings.noiseLevel || 0.003;
      // Tiny bit of noise; main "child" effect comes from EQ, not noise
      noiseGain.gain.value = voiceMaskingEnabled ? Math.max(baseNoise, 0.004) : 0;

      const bufferSize = Math.max(2 * audioContext.sampleRate, 44100);
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i += 1) {
        output[i] = (Math.random() * 2 - 1) * 0.8;
      }

      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      noiseSourceRef.current = noiseSource;

      // Mic path: source -> gain -> highpass -> lowpass -> formant1 -> formant2 -> gentle distortion -> speakers
      source.connect(gainNode);
      gainNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(formant1);
      formant1.connect(formant2);
      formant2.connect(distortion);
      distortion.connect(audioContext.destination);

      noiseSource.connect(noiseGain);
      noiseGain.connect(audioContext.destination);

      noiseSource.start();

      setIsLiveStreamOn(true);
    } catch (error) {
      console.error('Live stream error:', error);
      setLiveStreamError('Failed to start live stream. Please check microphone permissions.');
      stopLiveStream();
    }
  };

  const startPreviewRecording = async () => {
    try {
      setPreviewStatus('');

      const { status } = await ExpoAudio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please grant microphone permission to record a preview.'
        );
        return;
      }

      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await ExpoAudio.Recording.createAsync(
        ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY
      );

      previewRecordingRef.current = recording;
      setIsPreviewRecording(true);
    } catch (error) {
      console.error('Preview recording start error:', error);
      Alert.alert('Error', 'Failed to start preview recording.');
    }
  };

  const stopPreviewAndProcess = async () => {
    if (!previewRecordingRef.current) {
      return;
    }

    try {
      setIsPreviewRecording(false);
      setIsPreviewProcessing(true);
      setPreviewStatus('Processing with AI masking...');

      await previewRecordingRef.current.stopAndUnloadAsync();
      const uri = previewRecordingRef.current.getURI();
      previewRecordingRef.current = null;

      if (!uri) {
        setPreviewStatus('No audio captured in preview.');
        setIsPreviewProcessing(false);
        return;
      }

      const health = await voiceAIService.checkHealth();
      if (health.status === 'error') {
        setPreviewStatus('Voice masking server is offline. Start the server and try again.');
        setIsPreviewProcessing(false);
        return;
      }

      const processedUri = await voiceAIService.processVoice(uri, {
        pitchShift: voiceMaskingEnabled && localSettings.pitchShift,
        pitchSteps: localSettings.pitchSteps || 4,
        useAiMasking: voiceMaskingEnabled && localSettings.useAiMasking,
        encrypt: false,
      });

      if (!processedUri) {
        setPreviewStatus('AI server returned no audio.');
        setIsPreviewProcessing(false);
        return;
      }

      if (Platform.OS === 'web') {
        const AudioConstructor =
          (typeof window !== 'undefined' && window.Audio) ||
          (typeof globalThis !== 'undefined' && globalThis.Audio);

        if (!AudioConstructor) {
          setPreviewStatus('Browser cannot play audio preview.');
        } else {
          const audio = new AudioConstructor(processedUri);
          audio.play().catch((err) => {
            console.error('Preview playback error (web):', err);
            setPreviewStatus('Unable to play preview audio in browser.');
          });
        }
      } else {
        try {
          const { sound } = await ExpoAudio.Sound.createAsync({ uri: processedUri });
          await sound.playAsync();
        } catch (err) {
          console.error('Preview playback error (native):', err);
          setPreviewStatus('Unable to play preview audio.');
        }
      }

      setPreviewStatus('Played AI-masked preview (same pipeline as chat).');
    } catch (error) {
      console.error('Preview processing error:', error);
      setPreviewStatus(error.message || 'Failed to process preview with AI.');
    } finally {
      setIsPreviewProcessing(false);
    }
  };

  if (!voiceContext) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="mic" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Voice Masking Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure how your voice messages are processed
          </Text>
        </View>
      </View>

      {/* Voice Masking Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Voice Masking</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mic-outline" size={20} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Enable Voice Masking</Text>
                <Text style={styles.settingSubtitle}>
                  {voiceMaskingEnabled ? 'Voice masking is active' : 'Voice masking is disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={voiceMaskingEnabled}
              onValueChange={toggleVoiceMasking}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={voiceMaskingEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Live Masked Voice Preview (Web) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="volume-high-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Live Masked Voice Preview</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.previewDescription}>
            Option 1: Hear your own voice masked in real time while you speak (browser only).
          </Text>

          <TouchableOpacity
            style={[
              styles.previewButton,
              isLiveStreamOn ? styles.previewButtonStop : styles.previewButtonStart,
            ]}
            onPress={toggleLiveStream}
            disabled={isPreviewProcessing}
          >
            <Ionicons
              name={isLiveStreamOn ? 'stop-circle' : 'play-circle'}
              size={20}
              color={colors.textInverse}
            />
            <Text style={styles.previewButtonText}>
              {isLiveStreamOn ? 'Stop Live Stream' : 'Start Real-Time Masking'}
            </Text>
          </TouchableOpacity>

          {liveStreamError ? (
            <Text style={styles.previewError}>{liveStreamError}</Text>
          ) : null}

          {isLiveStreamOn && !liveStreamError ? (
            <Text style={styles.previewNote}>
              Streaming live: speak into your mic and you will hear the masked version immediately from the speakers.
            </Text>
          ) : null}

          <View style={styles.previewDivider}>
            <Text style={styles.previewDividerText}>OR</Text>
          </View>

          <Text style={styles.previewDescriptionSecondary}>
            Option 2: Record a short sample and send it through the same AI masking server used for chat voice messages,
            then hear the processed result.
          </Text>

          <TouchableOpacity
            style={[
              styles.previewButton,
              isPreviewRecording || isPreviewProcessing ? styles.previewButtonStop : styles.previewButtonStart,
            ]}
            onPress={isPreviewRecording ? stopPreviewAndProcess : startPreviewRecording}
            disabled={isPreviewProcessing}
          >
            <Ionicons
              name={isPreviewRecording || isPreviewProcessing ? 'stop-circle' : 'play-circle'}
              size={20}
              color={colors.textInverse}
            />
            <Text style={styles.previewButtonText}>
              {isPreviewProcessing
                ? 'Processing with AI...'
                : isPreviewRecording
                ? 'Stop & Mask Preview'
                : 'Record AI-Masked Preview'}
            </Text>
          </TouchableOpacity>

          {previewStatus ? (
            <Text style={styles.previewStatus}>{previewStatus}</Text>
          ) : null}
        </View>
      </View>

      {/* Pitch Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="musical-notes-outline" size={20} color={colors.success} />
          <Text style={styles.sectionTitle}>Pitch Settings</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="trending-up-outline" size={20} color={colors.success} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Pitch Shifting</Text>
                <Text style={styles.settingSubtitle}>
                  Change voice pitch (higher or lower)
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.pitchShift}
              onValueChange={(value) => updateSetting('pitchShift', value)}
              trackColor={{ false: colors.border, true: colors.success + '50' }}
              thumbColor={localSettings.pitchShift ? colors.success : colors.textSecondary}
            />
          </View>

          {localSettings.pitchShift && (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Pitch Steps: {localSettings.pitchSteps > 0 ? '+' : ''}{localSettings.pitchSteps}
              </Text>
              <Text style={styles.sliderDescription}>
                {localSettings.pitchSteps > 0 
                  ? `Higher pitch (+${localSettings.pitchSteps} semitones)`
                  : localSettings.pitchSteps < 0
                  ? `Lower pitch (${localSettings.pitchSteps} semitones)`
                  : 'Normal pitch'}
              </Text>
              <View style={styles.sliderControls}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateSetting('pitchSteps', Math.max(-12, localSettings.pitchSteps - 1))}
                >
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.sliderValue}>
                  <Text style={styles.sliderValueText}>{localSettings.pitchSteps}</Text>
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => updateSetting('pitchSteps', Math.min(12, localSettings.pitchSteps + 1))}
                >
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* AI Masking Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>AI Masking</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-filter-outline" size={20} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>AI Voice Masking</Text>
                <Text style={styles.settingSubtitle}>
                  Apply AI-based voice transformation
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.useAiMasking}
              onValueChange={(value) => updateSetting('useAiMasking', value)}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={localSettings.useAiMasking ? colors.primary : colors.textSecondary}
            />
          </View>

          {localSettings.useAiMasking && (
            <>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  Formant Shift: {localSettings.formantShift > 0 ? '+' : ''}{localSettings.formantShift}
                </Text>
                <Text style={styles.sliderDescription}>
                  Changes vocal tract characteristics (voice timbre)
                </Text>
                <View style={styles.sliderControls}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateSetting('formantShift', Math.max(-6, localSettings.formantShift - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <View style={styles.sliderValue}>
                    <Text style={styles.sliderValueText}>{localSettings.formantShift}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateSetting('formantShift', Math.min(6, localSettings.formantShift + 1))}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  Noise Level: {(localSettings.noiseLevel * 1000).toFixed(1)}‰
                </Text>
                <Text style={styles.sliderDescription}>
                  Subtle noise for additional privacy (0.0 to 1.0)
                </Text>
                <View style={styles.sliderControls}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateSetting('noiseLevel', Math.max(0, localSettings.noiseLevel - 0.001))}
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <View style={styles.sliderValue}>
                    <Text style={styles.sliderValueText}>{(localSettings.noiseLevel * 1000).toFixed(1)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => updateSetting('noiseLevel', Math.min(0.1, localSettings.noiseLevel + 0.001))}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Audio Processing */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Audio Processing</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Pre-emphasis Filter</Text>
                <Text style={styles.settingSubtitle}>
                  High-pass filter for clarity
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.preEmphasis}
              onValueChange={(value) => updateSetting('preEmphasis', value)}
              trackColor={{ false: colors.border, true: colors.textSecondary + '50' }}
              thumbColor={localSettings.preEmphasis ? colors.textSecondary : colors.border}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high-outline" size={20} color={colors.textSecondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Normalize Audio</Text>
                <Text style={styles.settingSubtitle}>
                  Ensure consistent volume levels
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.normalize}
              onValueChange={(value) => updateSetting('normalize', value)}
              trackColor={{ false: colors.border, true: colors.textSecondary + '50' }}
              thumbColor={localSettings.normalize ? colors.textSecondary : colors.border}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {isEditing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
            Reset to Defaults
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.footerText}>
          Voice masking settings apply to all new voice messages. Existing messages are not affected.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sliderContainer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sliderDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderValue: {
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sliderValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  resetButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  previewDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  previewDescriptionSecondary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  previewButtonStart: {
    backgroundColor: colors.primary,
  },
  previewButtonStop: {
    backgroundColor: colors.error,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
  previewNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  previewError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
    fontWeight: '500',
  },
  previewStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  previewDivider: {
    marginTop: 14,
    marginBottom: 6,
    alignItems: 'center',
  },
  previewDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});

export default VoiceSettings;

