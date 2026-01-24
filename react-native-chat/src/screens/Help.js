import React, { useContext } from 'react';
import { View, Alert, StyleSheet, ScrollView, Text, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Help = () => {
  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  const handleContactUs = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you want to reach us:',
      [
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@chatapp.com'),
        },
        {
          text: 'Website',
          onPress: () => Linking.openURL('https://chatapp.com/support'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAppInfo = () => {
    Alert.alert(
      '🔒 Secure Chat App',
      `Version: 1.0.0\nDeveloper: Cemil Tan\n\nFeatures:\n• End-to-end encryption\n• Sensitive data masking\n• Voice messages\n• Image sharing\n• Group chats\n\nYour privacy is our priority.`,
      [{ text: 'OK' }]
    );
  };

  const handleEncryptionInfo = () => {
    Alert.alert(
      '🔐 Encryption & Privacy',
      `Your messages are protected with:\n\n• AES-256 Encryption\n• Automatic sensitive data detection\n• Local key storage\n• No server-side decryption\n\nStatus: ${encryptionEnabled ? 'Enabled ✓' : 'Disabled ✗'}`,
      [
        { text: 'OK' },
        {
          text: 'Learn More',
          onPress: () => Linking.openURL('https://chatapp.com/privacy'),
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'We take your privacy seriously. Your messages are encrypted and we never access your data.',
      [
        { text: 'OK' },
        {
          text: 'Read Full Policy',
          onPress: () => Linking.openURL('https://chatapp.com/privacy-policy'),
        },
      ]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Terms of Service',
      'By using this app, you agree to our terms of service.',
      [
        { text: 'OK' },
        {
          text: 'Read Terms',
          onPress: () => Linking.openURL('https://chatapp.com/terms'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <Cell
          title="Contact Us"
          subtitle="Questions? Need help?"
          icon="mail-outline"
          tintColor={colors.primary}
          onPress={handleContactUs}
        />
        
        <Cell
          title="FAQ"
          subtitle="Frequently asked questions"
          icon="help-circle-outline"
          tintColor={colors.primary}
          onPress={() => Alert.alert('Coming Soon', 'FAQ section will be available soon!')}
        />
        
        <Cell
          title="Report a Problem"
          subtitle="Something not working?"
          icon="bug-outline"
          tintColor={colors.error}
          onPress={() => Alert.alert('Report Problem', 'Describe the issue you are facing.')}
        />
      </View>

      {/* Privacy & Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        
        <Cell
          title="Encryption Info"
          subtitle={encryptionEnabled ? 'End-to-end encrypted' : 'Encryption disabled'}
          icon="shield-checkmark-outline"
          tintColor={encryptionEnabled ? colors.success : colors.textSecondary}
          onPress={handleEncryptionInfo}
        />
        
        <Cell
          title="Privacy Policy"
          subtitle="How we protect your data"
          icon="document-text-outline"
          tintColor={colors.primary}
          onPress={handlePrivacyPolicy}
        />
        
        <Cell
          title="Terms of Service"
          subtitle="App terms and conditions"
          icon="reader-outline"
          tintColor={colors.primary}
          onPress={handleTerms}
        />
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <Cell
          title="App Info"
          subtitle="Version 1.0.0"
          icon="information-circle-outline"
          tintColor={colors.primary}
          onPress={handleAppInfo}
          showForwardIcon={false}
        />
        
        <Cell
          title="Rate Us"
          subtitle="Enjoying the app? Rate us!"
          icon="star-outline"
          tintColor="#FFD700"
          onPress={() => Alert.alert('Thank You!', 'Your feedback helps us improve.')}
        />
        
        <Cell
          title="Share App"
          subtitle="Tell your friends"
          icon="share-social-outline"
          tintColor={colors.primary}
          onPress={() => Alert.alert('Share', 'Share this app with your friends!')}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        <Text style={styles.footerText}>Your privacy is protected with encryption</Text>
      </View>

      <View style={styles.creditsFooter}>
        <Text style={styles.creditsText}>Made with ❤️ by Cemil Tan</Text>
        <Text style={styles.creditsSubtext}>© 2025 Secure Chat App</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  creditsFooter: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  creditsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  creditsSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default Help;
