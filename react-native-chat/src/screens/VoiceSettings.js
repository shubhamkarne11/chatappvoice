import React, { useContext, useState } from 'react';
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
import { colors } from '../config/constants';
import { VoiceSettingsContext } from '../contexts/VoiceSettingsContext';

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
});

export default VoiceSettings;

