import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, TouchableOpacity, Platform } from 'react-native';

import { colors } from '../config/constants';

const ChatHeader = ({ chatName = 'Chat', chatId = '' }) => {
  const navigation = useNavigation();

  // ✅ SAFETY CHECK: Handle undefined/empty chatName
  const safeGetInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return '?';
    
    return trimmedName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .substring(0, 2); // Max 2 letters
  };

  const initials = safeGetInitials(chatName);
  const displayName = chatName || 'Chat';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('ChatInfo', { chatId, chatName: displayName })}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => navigation.navigate('ChatInfo', { chatId, chatName: displayName })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContent}>
          <Text style={styles.avatarLabel}>{initials}</Text>
        </View>
        
        {/* Privacy Badge - Shows encryption is active */}
        <View style={styles.privacyBadge}>
          <Ionicons name="shield-checkmark" size={12} color={colors.success} />
        </View>
      </TouchableOpacity>

      <View style={styles.chatInfo}>
        <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
        <View style={styles.statusContainer}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.statusText}>End-to-end encrypted</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginLeft: Platform.OS === 'web' ? 0 : -30,
    marginRight: 12,
    width: 44,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
  },
  avatarContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  privacyBadge: {
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
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 10,
    paddingVertical: 8,
  },
});

ChatHeader.propTypes = {
  chatName: PropTypes.string,
  chatId: PropTypes.string,
};

export default ChatHeader;
