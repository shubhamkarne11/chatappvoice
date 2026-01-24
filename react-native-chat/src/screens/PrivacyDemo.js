import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';
import { EncryptionContext } from '../contexts/EncryptionContext';
import {
  detectSensitiveData,
  maskSensitiveData,
  encryptMessage,
  decryptMessage,
  processMessageForPrivacy,
  simulateAttackerView,
  generateSecureKey,
} from '../utils/privacyUtils';

export default function PrivacyDemo() {
  const [message, setMessage] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [result, setResult] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [showAttackerView, setShowAttackerView] = useState(false);
  
  const encryptionContext = useContext(EncryptionContext);
  const { 
    encryptionKey = generateSecureKey(),
    keywords = [],
    encryptionEnabled = true 
  } = encryptionContext || {};

  const handleProcessMessage = () => {
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to process');
      return;
    }

    const customKw = customKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const allKeywords = [...keywords, ...customKw];
    const processed = processMessageForPrivacy(message, allKeywords, encryptEnabled);
    const attackerView = simulateAttackerView({
      ...processed,
      sender: 'You',
      receiver: 'Recipient',
      timestamp: new Date().toISOString()
    });

    setResult({
      ...processed,
      attackerView,
      keywordsUsed: allKeywords,
      encryptionKeyUsed: encryptionKey
    });
    setDecryptedMessage('');
    setShowDecrypted(false);
    setShowAttackerView(false);
  };

  const handleDecrypt = () => {
    if (result && result.encrypted) {
      const decrypted = decryptMessage(result.encrypted, encryptionKey);
      setDecryptedMessage(decrypted);
      setShowDecrypted(true);
    }
  };

  const handleClear = () => {
    setMessage('');
    setResult(null);
    setDecryptedMessage('');
    setShowDecrypted(false);
    setShowAttackerView(false);
  };

  const handleCopyEncrypted = () => {
    if (result?.encrypted) {
      Alert.alert('Copied!', 'Encrypted text copied to clipboard');
      // In real app: Clipboard.setString(result.encrypted);
    }
  };

  const quickTestMessages = [
    'My password is abc123',
    'Call me at 9876543210',
    'Account balance: ₹50000',
    'Email: test@gmail.com',
    'Normal message without sensitive data'
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="shield-checkmark" size={40} color={colors.textInverse} />
        </View>
        <Text style={styles.title}>Privacy Testing Lab</Text>
        <Text style={styles.subtitle}>
          Test encryption, masking & privacy features
        </Text>
        <View style={styles.statusBadge}>
          <Ionicons 
            name={encryptionEnabled ? "checkmark-circle" : "close-circle"} 
            size={14} 
            color={encryptionEnabled ? colors.success : colors.error} 
          />
          <Text style={styles.statusText}>
            Encryption {encryptionEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      {/* Quick Test Messages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Test Messages</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickTestContainer}
        >
          {quickTestMessages.map((msg, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickTestChip}
              onPress={() => setMessage(msg)}
            >
              <Text style={styles.quickTestText} numberOfLines={2}>{msg}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Message Input */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="chatbox-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Your Message</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type your message here..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
          <View style={styles.inputActions}>
            <Text style={styles.charCount}>{message.length} characters</Text>
            {message.length > 0 && (
              <TouchableOpacity onPress={() => setMessage('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Custom Keywords */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Custom Keywords</Text>
        </View>
        <TextInput
          style={styles.keywordInput}
          placeholder="e.g., confidential, private, secret"
          placeholderTextColor={colors.textSecondary}
          value={customKeywords}
          onChangeText={setCustomKeywords}
        />
        <Text style={styles.helperText}>
          Comma-separated keywords to detect as sensitive
        </Text>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Enable Encryption</Text>
                <Text style={styles.settingSubtitle}>
                  Encrypt detected sensitive messages
                </Text>
              </View>
            </View>
            <Switch
              value={encryptEnabled}
              onValueChange={setEncryptEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={encryptEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.processButton} 
          onPress={handleProcessMessage}
          activeOpacity={0.8}
        >
          <Ionicons name="play-circle" size={22} color={colors.textInverse} />
          <Text style={styles.processButtonText}>Process Message</Text>
        </TouchableOpacity>

        {result && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Section */}
      {result && (
        <View style={styles.resultsContainer}>
          {/* Detection Result */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Detection Result</Text>
            <View style={[
              styles.detectionCard,
              result.isSensitive ? styles.detectionSensitive : styles.detectionNormal
            ]}>
              <View style={styles.detectionHeader}>
                <Ionicons 
                  name={result.isSensitive ? "alert-circle" : "checkmark-circle"} 
                  size={32} 
                  color={result.isSensitive ? colors.error : colors.success} 
                />
                <View style={styles.detectionInfo}>
                  <Text style={styles.detectionTitle}>
                    {result.isSensitive ? 'Sensitive Data Detected' : 'No Sensitive Data'}
                  </Text>
                  <Text style={styles.detectionSubtitle}>
                    {result.isSensitive 
                      ? 'Message will be encrypted and masked' 
                      : 'Message is safe to send as-is'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Original Message */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
              <Text style={styles.sectionTitle}>Original Message</Text>
            </View>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{result.original}</Text>
            </View>
          </View>

          {/* Masked Message */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Ionicons name="eye-off-outline" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>Masked Message</Text>
            </View>
            <View style={[styles.messageCard, styles.maskedCard]}>
              <Text style={styles.messageText}>{result.masked}</Text>
            </View>
            <Text style={styles.helperText}>
              This is what will be displayed in the chat
            </Text>
          </View>

          {/* Encrypted Message */}
          {result.isSensitive && result.encrypted && (
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Ionicons name="lock-closed" size={20} color={colors.success} />
                <Text style={styles.sectionTitle}>Encrypted Message</Text>
                <TouchableOpacity onPress={handleCopyEncrypted} style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.messageCard, styles.encryptedCard]}>
                <Text style={styles.encryptedText} numberOfLines={4}>
                  {result.encrypted}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Stored securely - only decryptable with the correct key
              </Text>
            </View>
          )}

          {/* Attacker View */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.attackerHeader}
              onPress={() => setShowAttackerView(!showAttackerView)}
            >
              <View style={styles.labelRow}>
                <Ionicons name="eye-outline" size={20} color={colors.error} />
                <Text style={styles.sectionTitle}>What Attackers See (MITM)</Text>
              </View>
              <Ionicons 
                name={showAttackerView ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.text} 
              />
            </TouchableOpacity>
            
            {showAttackerView && (
              <View style={styles.attackerCard}>
                <View style={styles.attackerRow}>
                  <Text style={styles.attackerLabel}>Sender:</Text>
                  <Text style={styles.attackerValue}>{result.attackerView.sender}</Text>
                </View>
                <View style={styles.attackerRow}>
                  <Text style={styles.attackerLabel}>Receiver:</Text>
                  <Text style={styles.attackerValue}>{result.attackerView.receiver}</Text>
                </View>
                <View style={styles.attackerRow}>
                  <Text style={styles.attackerLabel}>Message:</Text>
                  <Text style={styles.attackerValue}>{result.attackerView.masked_text}</Text>
                </View>
                <View style={styles.attackerRow}>
                  <Text style={styles.attackerLabel}>Encrypted Blob:</Text>
                  <Text style={styles.attackerValue} numberOfLines={2}>
                    {result.attackerView.encrypted_original || 'N/A'}
                  </Text>
                </View>
                <View style={styles.attackerRow}>
                  <Text style={styles.attackerLabel}>Can Decrypt?</Text>
                  <Text style={[styles.attackerValue, { color: colors.error }]}>
                    ❌ NO - Key Required
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Decryption Section */}
          {result.encrypted && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔓 Receiver's View</Text>
              {!showDecrypted ? (
                <TouchableOpacity 
                  style={styles.decryptButton}
                  onPress={handleDecrypt}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-open" size={22} color={colors.textInverse} />
                  <Text style={styles.decryptButtonText}>Decrypt Message</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.messageCard, styles.decryptedCard]}>
                  <View style={styles.decryptedHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.decryptedTitle}>Decrypted Successfully</Text>
                  </View>
                  <Text style={styles.messageText}>{decryptedMessage}</Text>
                  <TouchableOpacity 
                    style={styles.hideButton}
                    onPress={() => setShowDecrypted(false)}
                  >
                    <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.hideButtonText}>Hide Decrypted</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Keywords Used */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Keywords Monitored</Text>
            <View style={styles.keywordsList}>
              {result.keywordsUsed.slice(0, 15).map((keyword, index) => (
                <View key={index} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
              {result.keywordsUsed.length > 15 && (
                <View style={styles.keywordChip}>
                  <Text style={styles.keywordText}>+{result.keywordsUsed.length - 15} more</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoTitle}>How It Works</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="search" size={18} color={colors.text} />
          <Text style={styles.infoText}>
            Scans message for sensitive patterns (emails, phones, keywords)
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="eye-off" size={18} color={colors.text} />
          <Text style={styles.infoText}>
            Masks detected sensitive data with ***
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="lock-closed" size={18} color={colors.text} />
          <Text style={styles.infoText}>
            Encrypts original with AES-256 (military-grade)
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={18} color={colors.text} />
          <Text style={styles.infoText}>
            Only receiver with key can decrypt
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 Your privacy is protected with end-to-end encryption
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textInverse,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  quickTestContainer: {
    marginTop: 8,
  },
  quickTestChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
    width: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTestText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  messageInput: {
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  keywordInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    fontSize: 15,
    color: colors.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  processButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  processButtonText: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clearButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.textSecondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsContainer: {
    marginTop: 8,
  },
  detectionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  detectionSensitive: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '50',
  },
  detectionNormal: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '50',
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detectionInfo: {
    flex: 1,
  },
  detectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  detectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maskedCard: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '50',
  },
  encryptedCard: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '50',
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  encryptedText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  attackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attackerCard: {
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.error + '30',
  },
  attackerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  attackerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    width: 120,
  },
  attackerValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  decryptButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  decryptButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  decryptedCard: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '50',
    borderWidth: 2,
  },
  decryptedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
  },
  decryptedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.success + '30',
  },
  hideButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  keywordText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  infoSection: {
    margin: 20,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
