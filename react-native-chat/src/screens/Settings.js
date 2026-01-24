import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { 
  Text, 
  View, 
  Linking, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
} from 'react-native';

import Cell from '../components/Cell';
import { auth } from '../config/firebase';
import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Settings = ({ navigation }) => {
  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  async function openGithub(url) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open link');
    }
  }

  const handleInviteFriend = async () => {
    try {
      const result = await Share.share({
        message: '🔒 Join me on Secure Chat - the most private messaging app! End-to-end encrypted, zero data collection. Download now!',
        title: 'Invite to Secure Chat',
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate Our App',
      'Enjoying Secure Chat? Leave us a 5-star review!',
      [
        { text: 'Maybe Later' },
        { 
          text: 'Rate Now', 
          onPress: () => Alert.alert('Thank You!', 'Rating feature coming soon!') 
        },
      ]
    );
  };

 const getInitials = (name, email) => {
    if (name && typeof name === 'string' && name.trim().length > 0 && name !== 'No name') {
      return name
        .trim()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .join('')
        .substring(0, 2);
    }
    
    if (email && typeof email === 'string' && email.length > 0 && email !== 'No email') {
      return email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const userDisplayName = auth?.currentUser?.displayName || 'No name';
  const userEmail = auth?.currentUser?.email || 'No email';
  const userInitials = getInitials(userDisplayName, userEmail);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <TouchableOpacity 
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.8}
      >
        <View style={styles.profileLeft}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{userInitials}</Text>
            {encryptionEnabled && (
              <View style={styles.profileBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userDisplayName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Privacy & Security Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
        </View>

        <View style={styles.encryptionStatus}>
          <View style={styles.encryptionLeft}>
            <View style={[
              styles.encryptionIcon, 
              { backgroundColor: encryptionEnabled ? colors.success + '15' : colors.error + '15' }
            ]}>
              <Ionicons 
                name={encryptionEnabled ? "lock-closed" : "lock-open"} 
                size={20} 
                color={encryptionEnabled ? colors.success : colors.error} 
              />
            </View>
            <View style={styles.encryptionText}>
              <Text style={styles.encryptionTitle}>End-to-End Encryption</Text>
              <Text style={styles.encryptionSubtitle}>
                {encryptionEnabled ? 'Your messages are secure' : 'Encryption disabled'}
              </Text>
            </View>
          </View>
          <View style={[
            styles.encryptionBadge,
            encryptionEnabled ? styles.encryptionEnabled : styles.encryptionDisabled
          ]}>
            <Text style={styles.encryptionBadgeText}>
              {encryptionEnabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        <Cell
          title="Account Settings"
          subtitle="Privacy, logout, delete account"
          icon="key-outline"
          tintColor={colors.primary}
          onPress={() => navigation.navigate('Account')}
          style={styles.cell}
        />

        <Cell
          title="Voice Masking Settings"
          subtitle="Configure pitch, filters, and AI masking"
          icon="mic-outline"
          tintColor={colors.primary}
          onPress={() => navigation.navigate('VoiceSettings')}
          style={styles.cell}
        />

        <Cell
          title="Privacy Demo"
          subtitle="Test encryption & masking features"
          icon="flask-outline"
          tintColor={colors.primary}
          onPress={() => navigation.navigate('PrivacyDemo')}
          style={styles.cell}
        />

        <Cell
          title="Blocked Users"
          subtitle="Manage blocked contacts"
          icon="ban-outline"
          tintColor={colors.error}
          onPress={() => Alert.alert('Coming Soon', 'Blocked users management')}
          style={styles.cell}
        />
      </View>

      {/* App Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>App Settings</Text>
        </View>

        <Cell
          title="Notifications"
          subtitle="Manage notification preferences"
          icon="notifications-outline"
          tintColor={colors.primary}
          onPress={() => Alert.alert('Coming Soon', 'Notification settings')}
          style={styles.cell}
        />

        <Cell
          title="Data & Storage"
          subtitle="Manage storage and data usage"
          icon="server-outline"
          tintColor={colors.primary}
          onPress={() => Alert.alert('Coming Soon', 'Storage management')}
          style={styles.cell}
        />

        <Cell
          title="Chat Settings"
          subtitle="Wallpaper, backup, chat history"
          icon="chatbubbles-outline"
          tintColor={colors.primary}
          onPress={() => Alert.alert('Coming Soon', 'Chat settings')}
          style={styles.cell}
        />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Support</Text>
        </View>

        <Cell
          title="Help Center"
          subtitle="Contact us, FAQs, app info"
          icon="headset-outline"
          tintColor={colors.primary}
          onPress={() => navigation.navigate('Help')}
          style={styles.cell}
        />

        <Cell
          title="Rate App"
          subtitle="Love the app? Rate us!"
          icon="star-outline"
          tintColor="#FFD700"
          onPress={handleRateApp}
          style={styles.cell}
        />

        <Cell
          title="Invite Friends"
          subtitle="Share the app with friends"
          icon="share-social-outline"
          tintColor={colors.primary}
          onPress={handleInviteFriend}
          style={styles.cell}
        />
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>About</Text>
        </View>

        <Cell
          title="Terms of Service"
          subtitle="Read our terms"
          icon="document-text-outline"
          tintColor={colors.textSecondary}
          onPress={() => Alert.alert('Terms', 'Terms of Service will open here')}
          style={styles.cell}
          showForwardIcon={false}
        />

        <Cell
          title="Privacy Policy"
          subtitle="How we protect your data"
          icon="shield-outline"
          tintColor={colors.textSecondary}
          onPress={() => Alert.alert('Privacy', 'Privacy Policy will open here')}
          style={styles.cell}
          showForwardIcon={false}
        />

        <Cell
          title="App Version"
          subtitle="1.0.0"
          icon="code-outline"
          tintColor={colors.textSecondary}
          style={styles.cell}
          showForwardIcon={false}
        />
      </View>

      {/* GitHub Link */}
      <TouchableOpacity
        style={styles.githubCard}
        onPress={() => openGithub('https://github.com/Ctere1/react-native-chat')}
        activeOpacity={0.8}
      >
        <View style={styles.githubLeft}>
          <View style={styles.githubIcon}>
            <Ionicons name="logo-github" size={24} color={colors.text} />
          </View>
          <View>
            <Text style={styles.githubTitle}>View on GitHub</Text>
            <Text style={styles.githubSubtitle}>Star this project ⭐</Text>
          </View>
        </View>
        <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.footerText}>
            Your data is end-to-end encrypted
          </Text>
        </View>
        <Text style={styles.footerCopyright}>
          © 2025 Secure Chat. All rights reserved.
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  profileAvatarText: {
    color: colors.textInverse,
    fontSize: 24,
    fontWeight: '700',
  },
  profileBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.backgroundSecondary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  encryptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  encryptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  encryptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  encryptionText: {
    flex: 1,
  },
  encryptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  encryptionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  encryptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  encryptionEnabled: {
    backgroundColor: colors.success + '20',
  },
  encryptionDisabled: {
    backgroundColor: colors.error + '20',
  },
  encryptionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  cell: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  githubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  githubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  githubIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  githubTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  githubSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  footerText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  footerCopyright: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

Settings.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default Settings;
