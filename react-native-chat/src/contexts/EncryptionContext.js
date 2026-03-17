import PropTypes from 'prop-types';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState, useEffect, createContext } from 'react';
import { generateSecureKey, getSensitiveKeywords, SECRET_KEY } from '../utils/privacyUtils';

export const EncryptionContext = createContext();

export const EncryptionProvider = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [keywords, setKeywords] = useState(getSensitiveKeywords());
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // Initialize with hardcoded key directly
        console.log('🔐 Using enforced hardcoded encryption key');
        setEncryptionKey(SECRET_KEY);

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
      Alert.alert(
        'Action Disabled',
        'Encryption key is now managed centrally and cannot be changed by the user. This ensures consistent message decryption across all devices.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (error) {
      console.error('❌ Error in regenerateKey:', error);
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
