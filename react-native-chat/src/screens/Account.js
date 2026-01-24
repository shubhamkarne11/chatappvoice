import React, { useContext, useState } from 'react';
import { View, Alert, StyleSheet, ScrollView, Text, Switch, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Account = () => {
  // ✅ SAFETY CHECK: Add default values
  const encryptionContext = useContext(EncryptionContext);
  
  const { 
    encryptionEnabled = true,
    toggleEncryption = async () => {},
    keywords = [],
    addKeyword = async () => {},
    removeKeyword = async () => {},
    resetKeywords = async () => {}
  } = encryptionContext || {};

  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const onSignOut = () => {
    signOut(auth).catch((error) => console.log('Error logging out: ', error));
  };

  const deleteAccount = async () => {
    try {
      // Clear encryption keys and data
      await AsyncStorage.removeItem('encryption_key');
      await AsyncStorage.removeItem('custom_keywords');
      
      // Delete user data
      await deleteDoc(doc(database, 'users', auth?.currentUser.email));
      await deleteUser(auth?.currentUser);
    } catch (error) {
      console.log('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  };

  const handleToggleEncryption = async (value) => {
    if (toggleEncryption) {
      await toggleEncryption(value);
      Alert.alert(
        value ? 'Encryption Enabled' : 'Encryption Disabled',
        value 
          ? 'Your messages are now end-to-end encrypted' 
          : 'Warning: Messages will not be encrypted'
      );
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && addKeyword) {
      addKeyword(newKeyword);
      setNewKeyword('');
      setShowKeywordInput(false);
      Alert.alert('Success', `Added "${newKeyword}" to sensitive keywords`);
    }
  };

  const handleRemoveKeyword = (keyword) => {
    Alert.alert(
      'Remove Keyword?',
      `Remove "${keyword}" from sensitive keywords?`,
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (removeKeyword) {
              removeKeyword(keyword);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleResetKeywords = () => {
    Alert.alert(
      'Reset Keywords?',
      'This will remove all custom keywords and restore defaults.',
      [
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            if (resetKeywords) {
              resetKeywords();
              Alert.alert('Success', 'Keywords reset to defaults');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showEncryptionInfo = () => {
    Alert.alert(
      '🔒 How Encryption Works',
      'Your messages are encrypted using AES-256 encryption before being sent to the server.\n\n• Only you and your chat partner can read messages\n• Not even the server can decrypt your messages\n• Sensitive data is automatically detected and masked',
      [{ text: 'Got it' }]
    );
  };

  // ✅ SAFETY CHECK: Show loading if context not ready
  if (!encryptionContext) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Privacy & Security Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>End-to-End Encryption</Text>
                <Text style={styles.settingSubtitle}>
                  {encryptionEnabled ? 'Messages are encrypted' : 'Encryption disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={encryptionEnabled}
              onValueChange={handleToggleEncryption}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={encryptionEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={showEncryptionInfo}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoButtonText}>How encryption works</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Keywords Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key" size={24} color={colors.success} />
          <Text style={styles.sectionTitle}>Sensitive Keywords</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.keywordDescription}>
            Messages containing these keywords will be automatically encrypted and masked.
          </Text>

          <ScrollView 
            style={styles.keywordListContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.keywordList}>
              {keywords.map((keyword, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.keywordChip}
                  onPress={() => handleRemoveKeyword(keyword)}
                >
                  <Text style={styles.keywordText}>{keyword}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {keywords.length > 0 && (
            <Text style={styles.keywordCount}>
              {keywords.length} {keywords.length === 1 ? 'keyword' : 'keywords'} total
            </Text>
          )}

          {showKeywordInput ? (
            <View style={styles.keywordInputContainer}>
              <TextInput
                style={styles.keywordInput}
                placeholder="Enter keyword..."
                value={newKeyword}
                onChangeText={setNewKeyword}
                autoFocus
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddKeyword}>
                <Ionicons name="checkmark" size={20} color={colors.textInverse} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.textSecondary }]} 
                onPress={() => {
                  setShowKeywordInput(false);
                  setNewKeyword('');
                }}
              >
                <Ionicons name="close" size={20} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.keywordActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowKeywordInput(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Add Keyword</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleResetKeywords}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  Reset to Defaults
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={24} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Account Settings</Text>
        </View>

        <Cell
          title="Blocked Users"
          icon="close-circle-outline"
          tintColor={colors.primary}
          onPress={() => {
            Alert.alert('Coming Soon', 'Blocked users feature will be available soon!');
          }}
        />

        <Cell
          title="Privacy Policy"
          icon="document-text-outline"
          tintColor={colors.primary}
          onPress={() => {
            Alert.alert('Privacy Policy', 'Your data is encrypted and secure. We do not share your information with third parties.');
          }}
        />

        <Cell
          title="Export Data"
          icon="download-outline"
          tintColor={colors.primary}
          onPress={() => {
            Alert.alert('Coming Soon', 'Export your encrypted chat data as a backup.');
          }}
        />
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={24} color={colors.error} />
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
        </View>

        <Cell
          title="Logout"
          icon="log-out-outline"
          tintColor={colors.textSecondary}
          onPress={() => {
            Alert.alert(
              'Logout?',
              'You will need to login again to access your account',
              [
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: () => {
                    onSignOut();
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ],
              { cancelable: true }
            );
          }}
          showForwardIcon={false}
        />

        <Cell
          title="Delete Account"
          icon="trash-outline"
          tintColor={colors.error}
          onPress={() => {
            Alert.alert(
              'Delete Account?',
              'This will permanently delete your account, encryption keys, and all message history. This action cannot be undone.',
              [
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    deleteAccount();
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ],
              { cancelable: true }
            );
          }}
          showForwardIcon={false}
        />
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={16} color={colors.textSecondary} />
        <Text style={styles.footerText}>Your privacy is protected with AES-256 encryption</Text>
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  dangerSection: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  infoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  keywordDescription: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  keywordListContainer: {
    maxHeight: 200,
    marginBottom: 12,
  },
  keywordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  keywordText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  keywordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  keywordInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default Account;
