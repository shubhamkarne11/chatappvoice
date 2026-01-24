import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  doc,
  where,
  query,
  setDoc,
  orderBy,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  Text,
  View,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Chats = ({ setUnreadCount }) => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newMessages, setNewMessages] = useState({});


  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  // const { encryptionEnabled } = useContext(EncryptionContext);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedItems.length > 0) {
          setSelectedItems([]);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }
    return () => {};
  }, [selectedItems.length]);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe = () => {};
      
      const loadNewMessages = async () => {
        try {
          const storedMessages = await AsyncStorage.getItem('newMessages');
          const parsed = storedMessages ? JSON.parse(storedMessages) : {};
          setNewMessages(parsed);
          setUnreadCount(Object.values(parsed).reduce((total, num) => total + num, 0));
        } catch (error) {
          console.log('Error loading new messages from storage', error);
        }
      };
      
      const chatsRef = collection(database, 'chats');
      const q = query(
        chatsRef,
        where('users', 'array-contains', {
          email: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          deletedFromChat: false,
        }),
        orderBy('lastUpdated', 'desc')
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        setChats(snapshot.docs);
        setLoading(false);
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const chatId = change.doc.id;
            const { messages } = change.doc.data();
            
            if (Array.isArray(messages) && messages.length > 0) {
              const firstMessage = messages[0];
              if (
                firstMessage.user &&
                firstMessage.user._id !== auth?.currentUser?.email
              ) {
                setNewMessages((prev) => {
                  const updated = { ...prev, [chatId]: (prev[chatId] || 0) + 1 };
                  AsyncStorage.setItem('newMessages', JSON.stringify(updated));
                  setUnreadCount(
                    Object.values(updated).reduce((total, num) => total + num, 0)
                  );
                  return updated;
                });
              }
            }
          }
        });
      });
      
      loadNewMessages();
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [setUnreadCount])
  );

  const getChatName = useCallback((chat) => {
    const { users, groupName } = chat.data();
    const currentUser = auth?.currentUser;
    
    if (groupName) return groupName;
    
    if (Array.isArray(users) && users.length === 2) {
      if (currentUser?.displayName) {
        return users[0].name === currentUser.displayName ? users[1].name : users[0].name;
      }
      if (currentUser?.email) {
        return users[0].email === currentUser.email ? users[1].email : users[0].email;
      }
    }
    
    return '~ No Name or Email ~';
  }, []);

  const handleChatPress = async (chat) => {
    const chatId = chat.id;
    
    if (selectedItems.length) {
      selectItems(chat);
      return;
    }
    
    setNewMessages((prev) => {
      const updated = { ...prev, [chatId]: 0 };
      AsyncStorage.setItem('newMessages', JSON.stringify(updated));
      setUnreadCount(Object.values(updated).reduce((total, num) => total + num, 0));
      return updated;
    });
    
    navigation.navigate('Chat', { id: chatId, chatName: getChatName(chat) });
  };

  const handleChatLongPress = (chat) => selectItems(chat);

  const selectItems = (chat) => {
    setSelectedItems((prev) =>
      prev.includes(chat.id)
        ? prev.filter((id) => id !== chat.id)
        : [...prev, chat.id]
    );
  };

  const getSelected = (chat) => selectedItems.includes(chat.id);

  const deSelectItems = useCallback(() => setSelectedItems([]), []);

  const handleFabPress = () => navigation.navigate('Users');

  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      selectedItems.length > 1 ? 'Delete selected chats?' : 'Delete this chat?',
      'Messages will be removed from this device.',
      [
        {
          text: 'Delete chat',
          style: 'destructive',
          onPress: async () => {
            const deletePromises = selectedItems.map((chatId) => {
              const chat = chats.find((c) => c.id === chatId);
              if (!chat) return Promise.resolve();
              
              const updatedUsers = chat
                .data()
                .users.map((user) =>
                  user.email === auth?.currentUser?.email
                    ? { ...user, deletedFromChat: true }
                    : user
                );
              
              return setDoc(
                doc(database, 'chats', chatId), 
                { users: updatedUsers }, 
                { merge: true }
              ).then(() => {
                const deletedCount = updatedUsers.filter((u) => u.deletedFromChat).length;
                if (deletedCount === updatedUsers.length) {
                  return deleteDoc(doc(database, 'chats', chatId));
                }
                return Promise.resolve();
              });
            });
            
            Promise.all(deletePromises).then(() => {
              deSelectItems();
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [selectedItems, chats, deSelectItems]);

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        selectedItems.length > 0
          ? () => (
              <TouchableOpacity style={styles.trashBin} onPress={handleDeleteChat}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            )
          : undefined,
      headerLeft:
        selectedItems.length > 0
          ? () => (
              <View style={styles.headerLeft}>
                <Text style={styles.itemCount}>{selectedItems.length}</Text>
                <Text style={styles.selectedLabel}>selected</Text>
              </View>
            )
          : undefined,
    });
  }, [selectedItems, navigation, handleDeleteChat]);

  const getSubtitle = useCallback((chat) => {
    const { messages } = chat.data();
    if (!messages || messages.length === 0) return 'No messages yet';
    
    const message = messages[0];
    const isCurrentUser = auth?.currentUser?.email === message.user._id;
    const userName = isCurrentUser ? 'You' : (message.user.name || '').split(' ')[0];
    
    let messageText = '';
    
    // Check if message is encrypted
    if (message.isSensitive && message.needsDecryption) {
      messageText = '🔒 Encrypted message';
    } else if (message.audio) {
      messageText = '🎤 Voice message';
    } else if (message.image) {
      messageText = '📷 Photo';
    } else if (message.text.length > 25) {
      messageText = `${message.text.substring(0, 25)}...`;
    } else {
      messageText = message.text;
    }
    
    return `${userName}: ${messageText}`;
  }, []);

  const getSubtitle2 = useCallback((chat) => {
    const { lastUpdated } = chat.data();
    if (!lastUpdated) return '';
    
    const now = Date.now();
    const diff = now - lastUpdated;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    const options = { month: 'short', day: 'numeric' };
    return new Date(lastUpdated).toLocaleDateString(undefined, options);
  }, []);

  return (
    <Pressable style={styles.container} onPress={deSelectItems}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingContainer} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {chats.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button below to start a new chat
              </Text>
            </View>
          ) : (
            chats.map((chat) => (
              <ContactRow
                key={chat.id}
                style={getSelected(chat) ? styles.selectedContactRow : undefined}
                name={getChatName(chat)}
                subtitle={getSubtitle(chat)}
                subtitle2={getSubtitle2(chat)}
                onPress={() => handleChatPress(chat)}
                onLongPress={() => handleChatLongPress(chat)}
                selected={getSelected(chat)}
                showForwardIcon={false}
                newMessageCount={newMessages[chat.id] || 0}
              />
            ))
          )}
          
          {/* Encryption Status Footer */}
          <View style={styles.encryptionFooter}>
            <View style={styles.encryptionBadge}>
              <Ionicons 
                name={encryptionEnabled ? "shield-checkmark" : "shield-outline"} 
                size={16} 
                color={encryptionEnabled ? colors.success : colors.textSecondary} 
              />
              <Text style={styles.encryptionText}>
                {encryptionEnabled 
                  ? 'Your messages are end-to-end encrypted' 
                  : 'Encryption disabled'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsLink}
              onPress={() => navigation.navigate('Account')}
            >
              <Text style={styles.settingsLinkText}>Settings</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      
      {/* FAB Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleFabPress}
        activeOpacity={0.8}
      >
        <View style={styles.fabContainer}>
          <Ionicons name="create-outline" size={26} color={colors.textInverse} />
        </View>
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  selectedContactRow: {
    backgroundColor: colors.primary + '15',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 6,
  },
  itemCount: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  selectedLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  trashBin: {
    marginRight: 16,
    padding: 4,
  },
  encryptionFooter: {
    marginTop: 24,
    marginBottom: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  encryptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingsLinkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  fab: {
    bottom: 20,
    position: 'absolute',
    right: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabContainer: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
});

Chats.propTypes = {
  setUnreadCount: PropTypes.func,
};

export default Chats;
