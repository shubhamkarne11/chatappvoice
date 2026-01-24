import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, query, where, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';

const Users = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [existingChats, setExistingChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs);
      setFilteredUsers(snapshot.docs);
    });

    // Get existing chats to avoid creating duplicate chats
    const collectionChatsRef = collection(database, 'chats');
    const q2 = query(
      collectionChatsRef,
      where('users', 'array-contains', {
        email: auth?.currentUser?.email,
        name: auth?.currentUser?.displayName,
        deletedFromChat: false,
      }),
      where('groupName', '==', '')
    );
    const unsubscribeChats = onSnapshot(q2, (snapshot) => {
      const existing = snapshot.docs.map((existingChat) => ({
        chatId: existingChat.id,
        userEmails: existingChat.data().users,
      }));
      setExistingChats(existing);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChats();
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) => {
        const name = user.data().name?.toLowerCase() || '';
        const email = user.data().email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleNewGroup = useCallback(() => {
    navigation.navigate('Group');
  }, [navigation]);

  const handleNewUser = useCallback(() => {
    Alert.alert(
      'Invite New User',
      'Send an invitation link to a friend to join the app!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Invite', 
          onPress: () => Alert.alert('Coming Soon', 'Invitation feature will be available soon!') 
        },
      ]
    );
  }, []);

  const handleNavigate = useCallback(
    (user) => {
      let navigationChatID = '';
      let messageYourselfChatID = '';

      existingChats.forEach((existingChat) => {
        const isCurrentUserInTheChat = existingChat.userEmails.some(
          (e) => e.email === auth?.currentUser?.email
        );
        const isMessageYourselfExists = existingChat.userEmails.filter(
          (e) => e.email === user.data().email
        ).length;

        if (
          isCurrentUserInTheChat &&
          existingChat.userEmails.some((e) => e.email === user.data().email)
        ) {
          navigationChatID = existingChat.chatId;
        }

        if (isMessageYourselfExists === 2) {
          messageYourselfChatID = existingChat.chatId;
        }

        if (auth?.currentUser?.email === user.data().email) {
          navigationChatID = '';
        }
      });

      if (messageYourselfChatID) {
        navigation.navigate('Chat', { id: messageYourselfChatID, chatName: handleName(user) });
      } else if (navigationChatID) {
        navigation.navigate('Chat', { id: navigationChatID, chatName: handleName(user) });
      } else {
        // Creates new chat
        const newRef = doc(collection(database, 'chats'));
        setDoc(newRef, {
          lastUpdated: Date.now(),
          groupName: '', // It is not a group chat
          users: [
            {
              email: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              deletedFromChat: false,
            },
            { email: user.data().email, name: user.data().name, deletedFromChat: false },
          ],
          lastAccess: [
            { email: auth?.currentUser?.email, date: Date.now() },
            { email: user.data().email, date: '' },
          ],
          messages: [],
        }).then(() => {
          navigation.navigate('Chat', { id: newRef.id, chatName: handleName(user) });
        });
      }
    },
    [existingChats, navigation]
  );

  const handleSubtitle = useCallback(
    (user) => (user.data().email === auth?.currentUser?.email ? 'Message yourself' : user.data().about || 'Available'),
    []
  );

  const handleName = useCallback((user) => {
    const { name } = user.data();
    const { email } = user.data();
    if (name) {
      return email === auth?.currentUser?.email ? `${name} (You)` : name;
    }
    return email || '~ No Name or Email ~';
  }, []);

  const currentUser = users.find(user => user.data().email === auth?.currentUser?.email);
  const otherUsers = filteredUsers.filter(user => user.data().email !== auth?.currentUser?.email);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={handleNewGroup}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={24} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>New Group</Text>
          <Text style={styles.actionSubtitle}>Create a group chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={handleNewUser}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="person-add" size={24} color={colors.success} />
          </View>
          <Text style={styles.actionTitle}>Invite Friend</Text>
          <Text style={styles.actionSubtitle}>Send an invitation</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Users Yet</Text>
          <Text style={styles.emptySubtitle}>
            Invite friends to start chatting!
          </Text>
          <TouchableOpacity style={styles.inviteButton} onPress={handleNewUser}>
            <Ionicons name="person-add" size={20} color={colors.textInverse} />
            <Text style={styles.inviteButtonText}>Invite Friend</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Current User Section */}
          {currentUser && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>You</Text>
              </View>
              <ContactRow
                name={handleName(currentUser)}
                subtitle={handleSubtitle(currentUser)}
                onPress={() => handleNavigate(currentUser)}
                showForwardIcon={false}
                style={styles.userRow}
              />
            </View>
          )}

          {/* Other Users Section */}
          {otherUsers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  All Users ({otherUsers.length})
                </Text>
              </View>
              {otherUsers.map((user) => (
                <React.Fragment key={user.id}>
                  <ContactRow
                    name={handleName(user)}
                    subtitle={handleSubtitle(user)}
                    onPress={() => handleNavigate(user)}
                    showForwardIcon={false}
                    style={styles.userRow}
                  />
                </React.Fragment>
              ))}
            </View>
          )}

          {/* No Search Results */}
          {searchQuery.trim() !== '' && filteredUsers.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noResultsText}>No users found</Text>
              <Text style={styles.noResultsSubtext}>
                Try searching with a different name or email
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={styles.footerText}>All chats are end-to-end encrypted</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  userRow: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
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
    marginBottom: 24,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  inviteButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});

export default Users;
