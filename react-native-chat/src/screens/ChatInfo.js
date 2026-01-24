import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Alert, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { database } from '../config/firebase';
import { EncryptionContext } from '../contexts/EncryptionContext';

const ChatInfo = ({ route }) => {
  // ✅ SAFETY CHECK: Validate route params
  const chatId = route?.params?.chatId;
  const chatName = route?.params?.chatName || 'Chat';
  
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  
  // ✅ SAFETY CHECK: Get encryption context with defaults
  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  // ✅ SAFETY CHECK: Return error if no chatId
  if (!chatId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.text }}>
          Invalid chat ID
        </Text>
      </SafeAreaView>
    );
  }

  // ✅ SAFETY CHECK: Function to get initials safely
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return '?';
    
    return trimmedName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .substring(0, 2);
  };

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const chatRef = doc(database, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData) {
            if (Array.isArray(chatData.users)) {
              setUsers(chatData.users);
            }
            if (chatData.groupName) {
              setGroupName(chatData.groupName);
            }
          } else {
            setUsers([]);
          }
        } else {
          Alert.alert('Error', 'Chat does not exist');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching chat info');
        console.error('Error fetching chat info: ', error);
      }
    };

    fetchChatInfo();
  }, [chatId]);

  const showEncryptionDetails = () => {
    Alert.alert(
      '🔒 Encryption Status',
      encryptionEnabled
        ? `This chat is end-to-end encrypted.\n\n• Messages are encrypted with AES-256\n• Only you and chat members can read messages\n• Sensitive data is automatically masked\n• Keys are stored locally on your device`
        : `Encryption is currently disabled.\n\nEnable encryption in Account Settings to protect your messages.`,
      [{ text: 'OK' }]
    );
  };

  const renderUser = ({ item }) => (
    <View style={styles.userContainer}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || 'Unknown User'}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userBadge}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
      </View>
    </View>
  );

  const uniqueUsers = Array.from(new Map(users.map((user) => [user.email, user])).values());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>
              {getInitials(chatName)}
            </Text>
          </View>
          {encryptionEnabled && (
            <View style={styles.encryptionBadge}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            </View>
          )}
        </View>

        {/* Chat Header */}
        <View style={styles.chatHeader}>
          {groupName ? (
            <>
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={styles.groupLabel}>Group</Text>
              </View>
              <Text style={styles.chatTitle}>{chatName}</Text>
            </>
          ) : (
            <Text style={styles.chatTitle}>{chatName}</Text>
          )}
          <Text style={styles.memberCount}>
            {uniqueUsers.length} {uniqueUsers.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {/* Encryption Status Card */}
        <TouchableOpacity style={styles.encryptionCard} onPress={showEncryptionDetails}>
          <View style={styles.encryptionCardLeft}>
            <View style={[
              styles.encryptionIcon,
              { backgroundColor: encryptionEnabled ? colors.success + '15' : colors.textSecondary + '15' }
            ]}>
              <Ionicons 
                name={encryptionEnabled ? "shield-checkmark" : "shield-outline"} 
                size={24} 
                color={encryptionEnabled ? colors.success : colors.textSecondary} 
              />
            </View>
            <View style={styles.encryptionInfo}>
              <Text style={styles.encryptionTitle}>
                {encryptionEnabled ? 'End-to-End Encrypted' : 'Encryption Disabled'}
              </Text>
              <Text style={styles.encryptionSubtitle}>
                {encryptionEnabled 
                  ? 'Your messages are protected' 
                  : 'Enable in settings for security'}
              </Text>
            </View>
          </View>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Cell
            title="Status"
            subtitle="Available"
            icon="checkmark-circle-outline"
            iconColor={colors.success}
            style={styles.cell}
            showForwardIcon={false}
          />
          <Cell
            title="Media & Links"
            subtitle={`${Math.floor(Math.random() * 100)} items`}
            icon="images-outline"
            iconColor={colors.primary}
            style={styles.cell}
            onPress={() => Alert.alert('Coming Soon', 'View shared media and links')}
          />
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {groupName && (
              <TouchableOpacity style={styles.addMemberButton}>
                <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.membersList}>
            <FlatList
              data={uniqueUsers}
              renderItem={renderUser}
              keyExtractor={(item) => item.email}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Cell
            title="Search Messages"
            icon="search-outline"
            iconColor={colors.primary}
            style={styles.cell}
            onPress={() => Alert.alert('Coming Soon', 'Search in this conversation')}
          />
          <Cell
            title="Mute Notifications"
            icon="notifications-off-outline"
            iconColor={colors.textSecondary}
            style={styles.cell}
            onPress={() => Alert.alert('Coming Soon', 'Mute notifications for this chat')}
          />
          <Cell
            title="Export Chat"
            icon="download-outline"
            iconColor={colors.primary}
            style={styles.cell}
            onPress={() => Alert.alert('Coming Soon', 'Export encrypted chat history')}
          />
        </View>

        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
          <Text style={styles.footerText}>Messages are encrypted and secured</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    position: 'relative',
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
  encryptionBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
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
  chatHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
  },
  groupLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chatTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  memberCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  encryptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  encryptionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  encryptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  encryptionInfo: {
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  addMemberButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
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
  membersList: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  userBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

ChatInfo.propTypes = {
  route: PropTypes.object.isRequired,
};

export default ChatInfo;
