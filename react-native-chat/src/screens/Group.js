import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { doc, query, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';
import {
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';
import { EncryptionContext } from '../contexts/EncryptionContext';

const Group = () => {
  const navigation = useNavigation();
  const [selectedItems, setSelectedItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  
  const encryptionContext = useContext(EncryptionContext);
  const { encryptionEnabled = true } = encryptionContext || {};

  useEffect(() => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        selectedItems.length > 0 && (
          <View style={styles.headerRight}>
            <Text style={styles.itemCount}>{selectedItems.length}</Text>
            <Text style={styles.selectedLabel}>selected</Text>
          </View>
        ),
    });
  }, [navigation, selectedItems]);

  const handleName = (user) => {
    if (user.data().name) {
      return user.data().email === auth?.currentUser?.email
        ? `${user.data().name} (You)`
        : user.data().name;
    }
    return user.data().email ? user.data().email : '~ No Name or Email ~';
  };

  const handleSubtitle = (user) =>
    user.data().email === auth?.currentUser?.email 
      ? 'Message yourself' 
      : user.data().email || 'No email';

  const handleOnPress = (user) => {
    selectItems(user);
  };

  const selectItems = (user) => {
    setSelectedItems((prevItems) => {
      if (prevItems.includes(user.id)) {
        return prevItems.filter((item) => item !== user.id);
      }
      return [...prevItems, user.id];
    });
  };

  const getSelected = (user) => selectedItems.includes(user.id);

  const deSelectItems = () => {
    setSelectedItems([]);
  };

  const handleFabPress = () => {
    setModalVisible(true);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('Group name cannot be empty');
      return;
    }

    const usersToAdd = users
      .filter((user) => selectedItems.includes(user.id))
      .map((user) => ({
        email: user.data().email,
        name: user.data().name,
        deletedFromChat: false,
      }));

    usersToAdd.unshift({
      email: auth?.currentUser?.email,
      name: auth?.currentUser?.displayName,
      deletedFromChat: false,
    });

    const newRef = doc(collection(database, 'chats'));
    setDoc(newRef, {
      lastUpdated: Date.now(),
      users: usersToAdd,
      messages: [],
      groupName,
      groupAdmins: [auth?.currentUser?.email],
      encryptionEnabled, // Store encryption setting for group
    }).then(() => {
      navigation.navigate('Chat', { id: newRef.id, chatName: groupName });
      deSelectItems();
      setModalVisible(false);
      setGroupName('');
    });
  };

  return (
    <Pressable style={styles.container} onPress={deSelectItems}>
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>
            Wait for other users to join the app
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.instructionBanner}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText}>
              Select members to create a group chat
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {users.map(
              (user) =>
                user.data().email !== auth?.currentUser?.email && (
                  <React.Fragment key={user.id}>
                    <ContactRow
                      style={getSelected(user) ? styles.selectedContactRow : {}}
                      name={handleName(user)}
                      subtitle={handleSubtitle(user)}
                      onPress={() => handleOnPress(user)}
                      selected={getSelected(user)}
                      showForwardIcon={false}
                    />
                  </React.Fragment>
                )
            )}

            {/* Encryption Notice */}
            <View style={styles.encryptionNotice}>
              <View style={styles.encryptionBadge}>
                <Ionicons 
                  name={encryptionEnabled ? "shield-checkmark" : "shield-outline"} 
                  size={16} 
                  color={encryptionEnabled ? colors.success : colors.textSecondary} 
                />
                <Text style={styles.encryptionText}>
                  {encryptionEnabled 
                    ? 'Group messages will be encrypted' 
                    : 'Encryption is disabled'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* FAB Button */}
      {selectedItems.length > 0 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <View style={styles.fabContainer}>
            <Ionicons name="arrow-forward" size={26} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      )}

      {/* Modal for Group Name */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Ionicons name="people" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Create Group</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedItems.length} member{selectedItems.length !== 1 ? 's' : ''} selected
            </Text>

            <TextInput
              style={styles.input}
              onChangeText={setGroupName}
              value={groupName}
              placeholder="Enter group name..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onSubmitEditing={handleCreateGroup}
              returnKeyType="done"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setGroupName('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleCreateGroup}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>Create Group</Text>
                <Ionicons name="checkmark" size={20} color={colors.textInverse} />
              </TouchableOpacity>
            </View>

            {encryptionEnabled && (
              <View style={styles.modalEncryptionNotice}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <Text style={styles.modalEncryptionText}>
                  Messages will be end-to-end encrypted
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  selectedContactRow: {
    backgroundColor: colors.primary + '15',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
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
  encryptionNotice: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  encryptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  modalEncryptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  modalEncryptionText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});

export default Group;
