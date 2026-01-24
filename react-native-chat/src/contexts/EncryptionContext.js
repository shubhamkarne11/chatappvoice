import PropTypes from 'prop-types';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState, useEffect, createContext } from 'react';
import { generateSecureKey, getSensitiveKeywords } from '../utils/privacyUtils';

export const EncryptionContext = createContext();

export const EncryptionProvider = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [keywords, setKeywords] = useState(getSensitiveKeywords());
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // Get or generate encryption key - IMPORTANT: Key must NEVER change once set
        let storedKey = await AsyncStorage.getItem('encryption_key');
        
        if (!storedKey) {
          // Only generate if key doesn't exist (first time setup)
          storedKey = generateSecureKey();
          await AsyncStorage.setItem('encryption_key', storedKey);
          console.log('🔐 New encryption key generated (first time setup)');
        } else {
          // Key exists - use it (NEVER regenerate automatically)
          console.log('🔐 Encryption key loaded from storage (persistent)');
        }
        
        setEncryptionKey(storedKey);

        // Load custom keywords
        const storedKeywords = await AsyncStorage.getItem('custom_keywords');
        if (storedKeywords) {
          const customKw = JSON.parse(storedKeywords);
          setKeywords([...getSensitiveKeywords(), ...customKw]);
          console.log('📋 Custom keywords loaded:', customKw.length);
        }

        // Load encryption toggle state
        const encEnabled = await AsyncStorage.getItem('encryption_enabled');
        if (encEnabled !== null) {
          setEncryptionEnabled(JSON.parse(encEnabled));
          console.log('🔒 Encryption status:', JSON.parse(encEnabled));
        }
      } catch (error) {
        console.error('❌ Error initializing encryption:', error);
      }
    };

    initializeEncryption();
  }, []);

  const addKeyword = async (keyword) => {
    try {
      const newKeyword = keyword.trim().toLowerCase();
      if (!keywords.includes(newKeyword) && newKeyword.length > 0) {
        const updatedKeywords = [...keywords, newKeyword];
        setKeywords(updatedKeywords);
        
        const customKw = updatedKeywords.filter(kw => !getSensitiveKeywords().includes(kw));
        await AsyncStorage.setItem('custom_keywords', JSON.stringify(customKw));
        console.log('➕ Keyword added:', newKeyword);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error adding keyword:', error);
      return false;
    }
  };

  const removeKeyword = async (keyword) => {
    try {
      const updatedKeywords = keywords.filter(kw => kw !== keyword.toLowerCase());
      setKeywords(updatedKeywords);
      
      const customKw = updatedKeywords.filter(kw => !getSensitiveKeywords().includes(kw));
      await AsyncStorage.setItem('custom_keywords', JSON.stringify(customKw));
      console.log('➖ Keyword removed:', keyword);
      return true;
    } catch (error) {
      console.error('❌ Error removing keyword:', error);
      return false;
    }
  };

  const toggleEncryption = async (enabled) => {
    try {
      setEncryptionEnabled(enabled);
      await AsyncStorage.setItem('encryption_enabled', JSON.stringify(enabled));
      console.log('🔄 Encryption toggled:', enabled);
      return true;
    } catch (error) {
      console.error('❌ Error toggling encryption:', error);
      return false;
    }
  };

  const resetKeywords = async () => {
    try {
      setKeywords(getSensitiveKeywords());
      await AsyncStorage.removeItem('custom_keywords');
      console.log('🔄 Keywords reset to defaults');
      return true;
    } catch (error) {
      console.error('❌ Error resetting keywords:', error);
      return false;
    }
  };

  const regenerateKey = async () => {
    try {
      // WARNING: Regenerating key will make ALL old messages unreadable
      Alert.alert(
        '⚠️ Warning: Regenerate Encryption Key?',
        'This will make ALL your previous encrypted messages unreadable. This action cannot be undone.\n\nOnly do this if you want to start fresh with a new key.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Regenerate (I Understand)',
            style: 'destructive',
            onPress: async () => {
              const newKey = generateSecureKey();
              setEncryptionKey(newKey);
              await AsyncStorage.setItem('encryption_key', newKey);
              console.log('🔐 New encryption key generated (old messages will be unreadable)');
              Alert.alert('Key Regenerated', 'Your encryption key has been changed. Old messages cannot be decrypted.');
            },
          },
        ]
      );
      return false; // Don't regenerate without confirmation
    } catch (error) {
      console.error('❌ Error regenerating key:', error);
      return false;
    }
  };

  const value = useMemo(
    () => ({
      encryptionKey,
      keywords,
      encryptionEnabled,
      addKeyword,
      removeKeyword,
      toggleEncryption,
      resetKeywords,
      regenerateKey,
    }),
    [encryptionKey, keywords, encryptionEnabled]
  );

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
};

EncryptionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
