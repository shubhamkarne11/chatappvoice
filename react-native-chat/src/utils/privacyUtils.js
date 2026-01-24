import CryptoJS from 'crypto-js';

// Default sensitive keywords - Comprehensive list
const DEFAULT_KEYWORDS = [
  // Financial
  'password', 'account number', 'bank', 'bank account', 'balance',
  'credit card', 'debit card', 'atm', 'ifsc', 'upi', 'wallet',
  'transaction', 'amount', 'salary', 'income', 'tax', 'gst',
  'money', 'cash', 'payment', 'bill', 'invoice', 'receipt',
  'gold', 'silver', 'diamond', 'jewelry', 'investment', 'savings',
  'loan', 'debt', 'emi', 'interest', 'profit', 'loss', 'budget',
  'expense', 'cost', 'price', 'fee', 'charge', 'deposit', 'withdrawal',
  
  // Personal Information
  'pan', 'aadhar', 'ssn', 'passport', 'license', 'id card',
  'address', 'phone number', 'mobile number', 'email', 'username',
  
  // Academic
  'marks', 'grade', 'cgpa', 'percentage', 'result', 'exam',
  'roll no', 'roll number', 'student id', 'admission number',
  'answer', 'solution', 'question', 'q1', 'q2', 'q3', 'q4', 'q5',
  'assignment', 'homework', 'project', 'thesis', 'dissertation',
  
  // Security
  'secret', 'otp', 'pin', 'cvv', 'security code', 'verification code',
  'access code', 'passcode', 'token', 'api key', 'private key',
  
  // Medical
  'medical record', 'prescription', 'diagnosis', 'treatment',
  'medicine', 'drug', 'dose', 'symptoms', 'disease',
  
  // Legal
  'case number', 'court', 'lawyer', 'legal', 'contract', 'agreement',
  'document', 'certificate', 'license number',
  
  // Business
  'company', 'business', 'client', 'customer', 'vendor', 'supplier',
  'employee id', 'employee number', 'payroll', 'bonus', 'incentive',
  
  // Personal
  'date of birth', 'dob', 'age', 'mother name', 'father name',
  'spouse name', 'family', 'children', 'relatives',
  
  // Location
  'location', 'coordinates', 'gps', 'latitude', 'longitude',
  'home address', 'office address', 'current location',
  
  // Digital
  'ip address', 'mac address', 'device id', 'serial number',
  'wifi password', 'network password', 'router password',
  
  // Other sensitive
  'confidential', 'private', 'classified', 'restricted', 'internal',
  'personal', 'sensitive', 'important', 'urgent', 'critical'
];

// Secret key for encryption (in production, this should be stored securely)
const SECRET_KEY = 'your-secret-key-here-change-in-production';

/**
 * Detect if a message contains sensitive information
 * @param {string} text - The message text to analyze
 * @param {Array} customKeywords - Additional keywords to check for
 * @returns {boolean} - True if sensitive data is detected
 */
export const detectSensitiveData = (text, customKeywords = []) => {
  const allKeywords = [...DEFAULT_KEYWORDS, ...customKeywords];
  const lowerText = text.toLowerCase();

  // Check for QA patterns
  const qaPatterns = [
    /\bq\d+\b/,
    /\bquestion\b/,
    /\banswer\b/,
    /\bsolution\b/,
    /\bwhat is\b/,
    /\bexplain\b/,
    /\bhow to\b/,
    /\btell me\b/
  ];

  for (const pattern of qaPatterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  // Check for sensitive keywords
  for (const keyword of allKeywords) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return true;
    }
  }

  // Check for email patterns
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  if (emailPattern.test(text)) {
    return true;
  }

  // Check for phone number patterns
  const phonePatterns = [
    /\b\d{10}\b/,
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
    /\b\+91\s*\d{10}\b/
  ];

  for (const pattern of phonePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for money/currency patterns
  const moneyPatterns = [
    /(\₹|\$|€|£)\s*\d{2,}(?:,\d{3})*(?:\.\d+)?/,
    /\b\d{4,}\b/,
    /\b\d{3,}\s*(rupees?|dollars?|euros?|pounds?)\b/i
  ];

  for (const pattern of moneyPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for personal information patterns
  const personalPatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b[A-Z]{5}\d{4}[A-Z]\b/, // PAN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Aadhar
    /\b\d{3}-\d{2}-\d{4}\b/ // SSN
  ];

  for (const pattern of personalPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
};

/**
 * Mask sensitive data in a message
 * @param {string} text - The message text to mask
 * @param {Array} customKeywords - Additional keywords to mask
 * @returns {string} - The masked message
 */
export const maskSensitiveData = (text, customKeywords = []) => {
  let maskedText = text;
  const allKeywords = [...DEFAULT_KEYWORDS, ...customKeywords];

  // Mask email addresses
  maskedText = maskedText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***');

  // Mask phone numbers
  maskedText = maskedText.replace(/\b\d{10}\b/g, '***');
  maskedText = maskedText.replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, '***');
  maskedText = maskedText.replace(/\b\+91\s*\d{10}\b/g, '***');

  // Mask money/currency amounts
  maskedText = maskedText.replace(/(\₹|\$|€|£)\s*\d{2,}(?:,\d{3})*(?:\.\d+)?/g, '***');
  maskedText = maskedText.replace(/\b\d{4,}\b/g, '***');
  maskedText = maskedText.replace(/\b\d{3,}\s*(rupees?|dollars?|euros?|pounds?)\b/gi, '***');

  // Mask personal information
  maskedText = maskedText.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '***'); // Credit card
  maskedText = maskedText.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '***'); // PAN
  maskedText = maskedText.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '***'); // Aadhar
  maskedText = maskedText.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***'); // SSN

  // Mask sensitive keywords (case-insensitive, whole words only)
  for (const keyword of allKeywords) {
    // Escape special regex characters
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole word only (word boundaries)
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
    maskedText = maskedText.replace(regex, '***');
  }
  
  // Also mask common sensitive patterns
  // Mask any number followed by sensitive words
  maskedText = maskedText.replace(/\b\d+\s*(marks?|grade|percent|score|result)\b/gi, '***');
  maskedText = maskedText.replace(/\b(money|amount|price|cost|fee|charge)\s*:?\s*\d+/gi, '***');
  maskedText = maskedText.replace(/\b(gold|silver|diamond)\s*:?\s*\d+/gi, '***');

  return maskedText;
};

/**
 * Encrypt a message using AES encryption
 * @param {string} text - The message to encrypt
 * @param {string} key - The encryption key (optional, uses default if not provided)
 * @returns {string} - The encrypted message
 */
export const encryptMessage = (text, key = SECRET_KEY) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text if encryption fails
  }
};

/**
 * Decrypt a message using AES decryption
 * @param {string} encryptedText - The encrypted message
 * @param {string} key - The decryption key (optional, uses default if not provided)
 * @returns {string} - The decrypted message
 */
export const decryptMessage = (encryptedText, key = SECRET_KEY) => {
  try {
    // Handle empty or invalid encrypted text
    if (!encryptedText || typeof encryptedText !== 'string') {
      console.error('Invalid encrypted text provided');
      return '[Decryption failed: Invalid input]';
    }

    // Try to decrypt
    const bytes = CryptoJS.AES.decrypt(encryptedText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // Check if decryption was successful (not empty and valid UTF-8)
    if (!decrypted || decrypted.trim().length === 0) {
      console.error('Decryption resulted in empty string - possible wrong key or corrupted data');
      return '[Decryption failed: Invalid key or corrupted data]';
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return a more descriptive error message
    if (error.message && error.message.includes('Malformed UTF-8')) {
      return '[Decryption failed: Corrupted or invalid encrypted data]';
    }
    return '[Decryption failed]';
  }
};

/**
 * Process a message for privacy (detect, mask, and optionally encrypt)
 * @param {string} text - The original message
 * @param {Array} customKeywords - Additional keywords to check for
 * @param {boolean} encryptSensitive - Whether to encrypt sensitive messages
 * @returns {Object} - Processing result
 */
export const processMessageForPrivacy = (text, customKeywords = [], encryptSensitive = true) => {
  const isSensitive = detectSensitiveData(text, customKeywords);
  const maskedText = maskSensitiveData(text, customKeywords);
  
  let result = {
    original: text,
    masked: maskedText,
    isSensitive,
    encrypted: '',
    needsDecryption: false
  };

  if (isSensitive && encryptSensitive) {
    result.encrypted = encryptMessage(text);
    result.needsDecryption = true;
  }

  return result;
};

/**
 * Simulate what an attacker/MITM would see
 * @param {Object} messageData - The processed message data
 * @returns {Object} - What an attacker would see
 */
export const simulateAttackerView = (messageData) => {
  return {
    sender: messageData.sender || 'unknown',
    receiver: messageData.receiver || 'unknown',
    masked_text: messageData.masked,
    encrypted_original: messageData.encrypted || '',
    timestamp: messageData.timestamp || new Date().toISOString(),
    isSensitive: messageData.isSensitive || false
  };
};

/**
 * Generate a secure random key for encryption
 * @returns {string} - A random encryption key
 */
export const generateSecureKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};

/**
 * Add custom keywords to the sensitive keywords list
 * @param {Array} keywords - Keywords to add
 * @returns {Array} - Updated keywords list
 */
export const addCustomKeywords = (keywords) => {
  return [...DEFAULT_KEYWORDS, ...keywords];
};

/**
 * Get the current list of sensitive keywords
 * @returns {Array} - Current keywords list
 */
export const getSensitiveKeywords = () => {
  return [...DEFAULT_KEYWORDS];
};
