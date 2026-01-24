import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState, useEffect, createContext } from 'react';

export const VoiceSettingsContext = createContext();

// Default voice masking settings
const DEFAULT_VOICE_SETTINGS = {
  pitchShift: true,
  pitchSteps: 4, // Semitones to shift (positive = higher, negative = lower)
  useAiMasking: true,
  noiseLevel: 0.005, // Amount of noise to add (0.0 to 0.1)
  formantShift: -2, // Formant shifting for voice masking
  preEmphasis: true, // High-pass filter
  normalize: true, // Normalize audio levels
};

export const VoiceSettingsProvider = ({ children }) => {
  const [voiceSettings, setVoiceSettings] = useState(DEFAULT_VOICE_SETTINGS);
  const [voiceMaskingEnabled, setVoiceMaskingEnabled] = useState(true);

  useEffect(() => {
    const loadVoiceSettings = async () => {
      try {
        // Load voice settings from storage
        const storedSettings = await AsyncStorage.getItem('voice_settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setVoiceSettings({ ...DEFAULT_VOICE_SETTINGS, ...parsed });
          console.log('🎤 Voice settings loaded');
        }

        // Load voice masking toggle
        const maskingEnabled = await AsyncStorage.getItem('voice_masking_enabled');
        if (maskingEnabled !== null) {
          setVoiceMaskingEnabled(JSON.parse(maskingEnabled));
        }
      } catch (error) {
        console.error('❌ Error loading voice settings:', error);
      }
    };

    loadVoiceSettings();
  }, []);

  const updateVoiceSettings = async (newSettings) => {
    try {
      const updated = { ...voiceSettings, ...newSettings };
      setVoiceSettings(updated);
      await AsyncStorage.setItem('voice_settings', JSON.stringify(updated));
      console.log('🎤 Voice settings updated:', updated);
      return true;
    } catch (error) {
      console.error('❌ Error updating voice settings:', error);
      return false;
    }
  };

  const toggleVoiceMasking = async (enabled) => {
    try {
      setVoiceMaskingEnabled(enabled);
      await AsyncStorage.setItem('voice_masking_enabled', JSON.stringify(enabled));
      console.log('🎤 Voice masking toggled:', enabled);
      return true;
    } catch (error) {
      console.error('❌ Error toggling voice masking:', error);
      return false;
    }
  };

  const resetVoiceSettings = async () => {
    try {
      setVoiceSettings(DEFAULT_VOICE_SETTINGS);
      await AsyncStorage.setItem('voice_settings', JSON.stringify(DEFAULT_VOICE_SETTINGS));
      console.log('🔄 Voice settings reset to defaults');
      return true;
    } catch (error) {
      console.error('❌ Error resetting voice settings:', error);
      return false;
    }
  };

  const value = useMemo(
    () => ({
      voiceSettings,
      voiceMaskingEnabled,
      updateVoiceSettings,
      toggleVoiceMasking,
      resetVoiceSettings,
    }),
    [voiceSettings, voiceMaskingEnabled]
  );

  return (
    <VoiceSettingsContext.Provider value={value}>
      {children}
    </VoiceSettingsContext.Provider>
  );
};

VoiceSettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

