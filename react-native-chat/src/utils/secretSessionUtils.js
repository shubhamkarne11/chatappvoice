import CryptoJS from 'crypto-js';

// Configuration for PBKDF2
const PBKDF2_ITERATIONS = 1000;
const KEY_SIZE = 256 / 32; // 256-bit key

/**
 * Generate a random salt
 * @returns {string} Hex string of the salt
 */
export const generateSalt = () => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
};

/**
 * Derive a secure session key from a password and salt
 * @param {string} password - The user-provided password
 * @param {string} salt - The session salt
 * @returns {string} The derived key as a string
 */
export const generateSessionKey = (password, salt) => {
  if (!password || !salt) return null;
  const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS
  });
  return key.toString();
};

/**
 * Encrypt a message using the session key
 * @param {string} text - The message to encrypt
 * @param {string} sessionKey - The derived session key
 * @returns {string} Encrypted text
 */
export const encryptSessionMessage = (text, sessionKey) => {
  if (!text || !sessionKey) return text;
  try {
    return CryptoJS.AES.encrypt(text, sessionKey).toString();
  } catch (error) {
    console.error('Session Encryption failed:', error);
    return text;
  }
};

/**
 * Decrypt a message using the session key
 * @param {string} encryptedText - The encrypted message
 * @param {string} sessionKey - The derived session key
 * @returns {string} Decrypted text or null if failed
 */
export const decryptSessionMessage = (encryptedText, sessionKey) => {
  if (!encryptedText || !sessionKey) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, sessionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (error) {
    console.error('Session Decryption failed:', error);
    return null;
  }
};
