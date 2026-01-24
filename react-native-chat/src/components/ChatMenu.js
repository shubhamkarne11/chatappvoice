import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { Text, Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { auth, database } from '../config/firebase';
import { colors } from '../config/constants';

const ChatMenu = ({ chatName, chatId }) => {
  const navigation = useNavigation();

  const handleDeleteChat = () => {
    Alert.alert(
      'Delete this chat?',
      'Messages will be removed from your device.',
      [
        {
          text: 'Delete chat',
          style: 'destructive',
          onPress: async () => {
            try {
              const userEmail = auth?.currentUser?.email;
              if (!userEmail) throw new Error('You are not authenticated.');
              const chatRef = doc(database, 'chats', chatId);
              const chatDoc = await getDoc(chatRef);
              if (!chatDoc.exists()) throw new Error('Chat not found.');

              const users = chatDoc.data().users || [];
              const updatedUsers = users.map(user =>
                user.email === userEmail ? { ...user, deletedFromChat: true } : user
              );

              await setDoc(chatRef, { users: updatedUsers }, { merge: true });

              // If all users marked deleted, remove chat completely
              const hasAllDeleted = updatedUsers.every(user => user.deletedFromChat);
              if (hasAllDeleted) await deleteDoc(chatRef);

              // Go back after deletion
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleExportChat = () => {
    Alert.alert(
      'Export Chat',
      'Export this encrypted conversation as a backup.',
      [
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement export functionality
            Alert.alert('Coming Soon', 'Chat export feature will be available soon!');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleViewEncryptionInfo = () => {
    Alert.alert(
      '🔒 Encryption Details',
      `This chat is end-to-end encrypted.\n\n• Messages are encrypted with AES-256\n• Only you and ${chatName} can read messages\n• Not even the server can access your messages`,
      [{ text: 'OK' }]
    );
  };

  return (
    <Menu>
      <MenuTrigger>
        <View style={styles.menuTrigger}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </View>
      </MenuTrigger>
      <MenuOptions customStyles={menuOptionsStyles}>
        {/* Chat Info */}
        <MenuOption
          onSelect={() => navigation.navigate('ChatInfo', { chatId, chatName })}
          style={styles.optionRow}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.optionText}>Chat Info</Text>
        </MenuOption>

        {/* Encryption Info */}
        <MenuOption
          onSelect={handleViewEncryptionInfo}
          style={styles.optionRow}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.optionText}>Encryption Info</Text>
        </MenuOption>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Mute Chat */}
        <MenuOption
          onSelect={() => Alert.alert('Feature coming soon', 'Mute notifications for this chat.')}
          style={styles.optionRow}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.textSecondary + '15' }]}>
            <Ionicons name="notifications-off-outline" size={20} color={colors.textSecondary} />
          </View>
          <Text style={styles.optionText}>Mute Chat</Text>
        </MenuOption>

        {/* Export Chat */}
        <MenuOption
          onSelect={handleExportChat}
          style={styles.optionRow}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.optionText}>Export Chat</Text>
        </MenuOption>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Delete Chat */}
        <MenuOption
          onSelect={handleDeleteChat}
          style={styles.optionRow}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </View>
          <Text style={[styles.optionText, { color: colors.error, fontWeight: '600' }]}>Delete Chat</Text>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
};

const styles = StyleSheet.create({
  menuTrigger: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    color: colors.text,
    fontSize: 15.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
    marginHorizontal: 12,
  },
});

const menuOptionsStyles = {
  optionsContainer: {
    borderRadius: 16,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionWrapper: {
    backgroundColor: 'transparent',
  },
};

ChatMenu.propTypes = {
  chatName: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default ChatMenu;
