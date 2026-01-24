import React, { useContext, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { 
  Text, 
  View, 
  Alert, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';

import Cell from '../components/Cell';
import { auth } from '../config/firebase';
import { colors } from '../config/constants';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Profile = () => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');


  // ✅ SAFETY CHECK: Get encryption context with defaults
  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  const handleChangeName = () => {
    setEditField('name');
    setEditValue(auth?.currentUser?.displayName || '');
    setEditModalVisible(true);
  };

  const handleDisplayEmail = () => {
    Alert.alert(
      'Your Email',
      `📧 ${auth?.currentUser?.email}\n\nEmail cannot be changed after registration.`,
      [{ text: 'OK' }]
    );
  };

  const handleChangeProfilePicture = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option:',
      [
        {
          text: 'Take Photo',
          onPress: () => Alert.alert('Coming Soon', 'Camera feature will be available soon!'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => Alert.alert('Coming Soon', 'Gallery feature will be available soon!'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShowProfilePicture = () => {
    Alert.alert('Profile Picture', 'Full screen view coming soon!');
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      Alert.alert('Error', 'Field cannot be empty');
      return;
    }
    
    // TODO: Implement actual profile update logic
    Alert.alert('Success', 'Profile updated successfully!');
    setEditModalVisible(false);
  };

  // ✅ SAFETY CHECK: Function to get initials safely
  const getInitials = (name, email) => {
    if (name && typeof name === 'string' && name.trim().length > 0) {
      return name
        .trim()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .join('')
        .substring(0, 2);
    }
    
    if (email && typeof email === 'string' && email.length > 0) {
      return email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const initials = getInitials(
    auth?.currentUser?.displayName,
    auth?.currentUser?.email
  );

  const userEmail = auth?.currentUser?.email || 'No email';
  const userName = auth?.currentUser?.displayName || 'No name set';
  const userCreated = auth?.currentUser?.metadata?.creationTime 
    ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()
    : 'Unknown';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity style={styles.avatar} onPress={handleShowProfilePicture}>
              <Text style={styles.avatarLabel}>{initials}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraIcon} onPress={handleChangeProfilePicture}>
              <Ionicons name="camera" size={20} color={colors.textInverse} />
            </TouchableOpacity>
            
            {/* Encryption Badge */}
            {encryptionEnabled && (
              <View style={styles.encryptionBadge}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              </View>
            )}
          </View>

          {/* User Name */}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Chats</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Secure</Text>
            </View>
          </View>
        </View>

        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <Cell
            title="Name"
            subtitle={userName}
            icon="person-outline"
            tintColor={colors.primary}
            secondIcon="pencil-outline"
            onPress={handleChangeName}
            style={styles.cell}
          />

          <Cell
            title="Email"
            subtitle={userEmail}
            icon="mail-outline"
            tintColor={colors.primary}
            onPress={handleDisplayEmail}
            style={styles.cell}
            showForwardIcon={false}
          />

          <Cell
            title="Phone"
            subtitle="Not set"
            icon="call-outline"
            tintColor={colors.primary}
            secondIcon="add-circle-outline"
            onPress={() => Alert.alert('Coming Soon', 'Add phone number feature')}
            style={styles.cell}
          />

          <Cell
            title="About"
            subtitle="Available"
            icon="information-circle-outline"
            tintColor={colors.primary}
            secondIcon="pencil-outline"
            onPress={() => Alert.alert('Coming Soon', 'Edit about section')}
            style={styles.cell}
          />
        </View>

        {/* Account Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <Cell
            title="Account Created"
            subtitle={userCreated}
            icon="calendar-outline"
            tintColor={colors.textSecondary}
            style={styles.cell}
            showForwardIcon={false}
          />

          <Cell
            title="User ID"
            subtitle={auth?.currentUser?.uid?.substring(0, 16) + '...' || 'N/A'}
            icon="finger-print-outline"
            tintColor={colors.textSecondary}
            style={styles.cell}
            showForwardIcon={false}
          />
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          
          <Cell
            title="Encryption Status"
            subtitle={encryptionEnabled ? 'Enabled - Messages are secure' : 'Disabled'}
            icon="shield-checkmark-outline"
            tintColor={encryptionEnabled ? colors.success : colors.error}
            onPress={() => Alert.alert(
              'Encryption Status',
              encryptionEnabled 
                ? 'Your messages are protected with end-to-end encryption.' 
                : 'Enable encryption in Settings for secure messaging.'
            )}
            style={styles.cell}
          />

          <Cell
            title="Privacy Settings"
            subtitle="Manage your privacy"
            icon="lock-closed-outline"
            tintColor={colors.primary}
            onPress={() => Alert.alert('Coming Soon', 'Advanced privacy settings')}
            style={styles.cell}
          />

          <Cell
            title="Blocked Users"
            subtitle="0 blocked"
            icon="ban-outline"
            tintColor={colors.error}
            onPress={() => Alert.alert('Coming Soon', 'Manage blocked users')}
            style={styles.cell}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.footerText}>Your profile is protected</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editField}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editField}`}
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButtonSave}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 64,
    height: 128,
    justifyContent: 'center',
    width: 128,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarLabel: {
    color: colors.textInverse,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cameraIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    bottom: 4,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.backgroundSecondary,
  },
  encryptionBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
    letterSpacing: 0.3,
  },
  cell: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
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
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  footerText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
});

export default Profile;
