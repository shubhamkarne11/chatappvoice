import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Platform } from 'react-native';
import { Bubble } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';
import CryptoJS from 'crypto-js';

// Hardcoded master password for now
const MASTER_PASSWORD = 'admin1234';
const PBKDF2_ITERATIONS = 1000;
const KEY_SIZE = 256 / 32;

const deriveKey = (password, salt) => {
    if (!password || !salt) return null;
    try {
        const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
            keySize: KEY_SIZE,
            iterations: PBKDF2_ITERATIONS,
        });
        return key.toString();
    } catch (e) {
        return null;
    }
};

const decryptText = (encryptedText, key) => {
    if (!encryptedText || !key) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, key);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        return result || null;
    } catch (e) {
        return null;
    }
};

const SecretMessageBubble = (props) => {
    const { currentMessage, onUnlockRequest, isSender, onPlayAudio } = props;
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [decryptedText, setDecryptedText] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const isAudio = !!currentMessage.audio;

    const attemptDecrypt = (password) => {
        const salt = currentMessage.salt || currentMessage.sessionSalt;

        if (!salt) {
            // No salt on message, try direct key from password
            if (isAudio) {
                // For audio, just unlock with correct password
                if (password === MASTER_PASSWORD) {
                    setIsDecrypted(true);
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                } else {
                    setPasswordError('Incorrect password');
                }
                return;
            }
            setPasswordError('Session data missing. Cannot decrypt.');
            return;
        }

        const key = deriveKey(password, salt);
        if (!key) {
            setPasswordError('Failed to derive key.');
            return;
        }

        if (isAudio) {
            // Audio: just verify password matches master
            if (password === MASTER_PASSWORD) {
                setIsDecrypted(true);
                setShowPasswordModal(false);
                setPasswordInput('');
                setPasswordError('');
            } else {
                setPasswordError('Incorrect password');
            }
            return;
        }

        const result = decryptText(currentMessage.encryptedText, key);
        if (result) {
            setDecryptedText(result);
            setIsDecrypted(true);
            setShowPasswordModal(false);
            setPasswordInput('');
            setPasswordError('');
        } else {
            setPasswordError('Incorrect password. Try again.');
        }
    };

    const handleUnlock = () => {
        if (Platform.OS === 'web') {
            // On web, show our custom modal
            setShowPasswordModal(true);
        } else {
            Alert.prompt(
                '🔒 Enter Password',
                'Enter the session password to decrypt this message',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unlock',
                        onPress: (pwd) => attemptDecrypt(pwd || ''),
                    },
                ],
                'secure-text'
            );
        }
    };

    const handleLock = () => {
        setIsDecrypted(false);
        setDecryptedText('');
    };

    // ---- Locked audio bubble ----
    if (isAudio && !isDecrypted) {
        return (
            <View>
                <View style={[
                    styles.audioLockedContainer,
                    isSender ? styles.audioRight : styles.audioLeft
                ]}>
                    <View style={styles.audioRow}>
                        <Ionicons name="lock-closed" size={18} color={isSender ? colors.white : colors.accent} />
                        <View style={styles.audioTextBox}>
                            <Text style={[styles.audioTitle, isSender ? { color: colors.white } : { color: colors.accent }]}>
                                🎙️ Secret Voice Message
                            </Text>
                            <Text style={[styles.audioSub, isSender ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textSecondary }]}>
                                Locked — session ended
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.unlockBtn, isSender ? styles.unlockBtnRight : styles.unlockBtnLeft]}
                        onPress={handleUnlock}
                    >
                        <Text style={[styles.unlockBtnText, isSender ? { color: colors.white } : { color: colors.accent }]}>
                            🔑 Enter Password to Play
                        </Text>
                    </TouchableOpacity>
                </View>
                {showPasswordModal && (
                    <Modal transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>🔒 Unlock Voice Message</Text>
                                <Text style={styles.modalSub}>Enter the session password</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Password"
                                    placeholderTextColor="#aaa"
                                    secureTextEntry
                                    value={passwordInput}
                                    onChangeText={t => { setPasswordInput(t); setPasswordError(''); }}
                                />
                                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                                <View style={styles.modalBtns}>
                                    <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }}>
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalConfirm} onPress={() => attemptDecrypt(passwordInput)}>
                                        <Text style={styles.modalConfirmText}>Unlock</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        );
    }

    // ---- Unlocked audio bubble ----
    if (isAudio && isDecrypted) {
        return (
            <View style={[styles.audioLockedContainer, isSender ? styles.audioRight : styles.audioLeft]}>
                <View style={styles.audioRow}>
                    <TouchableOpacity
                        style={styles.playBtn}
                        onPress={() => onPlayAudio && onPlayAudio(currentMessage)}
                    >
                        <Ionicons name="play" size={18} color={colors.white} />
                    </TouchableOpacity>
                    <View style={styles.audioTextBox}>
                        <Text style={[styles.audioTitle, isSender ? { color: colors.white } : { color: colors.accent }]}>
                            🎙️ Secret Voice Message
                        </Text>
                        <Text style={[styles.audioSub, isSender ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textSecondary }]}>
                            Tap to play
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.lockButton} onPress={handleLock}>
                    <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
                    <Text style={styles.lockText}>Lock again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ---- Locked text bubble ----
    if (!isDecrypted) {
        return (
            <View>
                <View style={[
                    styles.encryptedBubble,
                    isSender ? styles.encryptedBubbleRight : styles.encryptedBubbleLeft
                ]}>
                    <View style={styles.content}>
                        <Ionicons name="lock-closed" size={20} color={isSender ? colors.white : colors.accent} />
                        <Text style={[styles.text, isSender ? styles.textRight : styles.textLeft]}>
                            Encrypted Message
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.decryptButton, isSender ? styles.decryptButtonRight : styles.decryptButtonLeft]}
                        onPress={handleUnlock}
                    >
                        <Text style={[styles.decryptText, isSender ? styles.decryptTextRight : styles.decryptTextLeft]}>
                            🔑 Unlock to View
                        </Text>
                    </TouchableOpacity>
                </View>
                {showPasswordModal && (
                    <Modal transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>🔒 Unlock Message</Text>
                                <Text style={styles.modalSub}>Enter the session password</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Password"
                                    placeholderTextColor="#aaa"
                                    secureTextEntry
                                    value={passwordInput}
                                    onChangeText={t => { setPasswordInput(t); setPasswordError(''); }}
                                />
                                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                                <View style={styles.modalBtns}>
                                    <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(''); }}>
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalConfirm} onPress={() => attemptDecrypt(passwordInput)}>
                                        <Text style={styles.modalConfirmText}>Unlock</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        );
    }

    // ---- Decrypted text bubble ----
    return (
        <View>
            <Bubble
                {...props}
                currentMessage={{ ...currentMessage, text: decryptedText }}
                wrapperStyle={{
                    right: { ...styles.bubbleRight, backgroundColor: colors.accent, borderColor: colors.accentDark },
                    left: { ...styles.bubbleLeft, backgroundColor: '#F3E5F5', borderColor: colors.accent },
                }}
                textStyle={{
                    left: { color: colors.text },
                    right: { color: colors.white },
                }}
            />
            <TouchableOpacity style={styles.lockButton} onPress={handleLock}>
                <Ionicons name="lock-open" size={12} color={colors.textSecondary} />
                <Text style={styles.lockText}>Hide</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    encryptedBubble: {
        padding: 12,
        borderRadius: 20,
        maxWidth: '80%',
        minWidth: 150,
        marginHorizontal: 8,
        borderWidth: 1,
        elevation: 2,
    },
    encryptedBubbleRight: {
        alignSelf: 'flex-end',
        backgroundColor: colors.accent,
        borderColor: colors.accentDark,
        borderTopRightRadius: 4,
    },
    encryptedBubbleLeft: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3E5F5',
        borderColor: colors.accent,
        borderTopLeftRadius: 4,
    },
    content: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    text: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
    textRight: { color: colors.white },
    textLeft: { color: colors.accent },
    decryptButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, alignSelf: 'flex-start' },
    decryptButtonRight: { backgroundColor: 'rgba(255,255,255,0.2)' },
    decryptButtonLeft: { backgroundColor: 'rgba(139, 92, 246, 0.1)' },
    decryptText: { fontSize: 12, fontWeight: 'bold' },
    decryptTextRight: { color: colors.white },
    decryptTextLeft: { color: colors.accent },
    bubbleRight: { borderWidth: 1 },
    bubbleLeft: { borderWidth: 1 },
    lockButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, marginTop: 2 },
    lockText: { fontSize: 10, color: colors.textSecondary, marginLeft: 4 },
    // Audio styles
    audioLockedContainer: {
        padding: 12,
        borderRadius: 20,
        maxWidth: '80%',
        minWidth: 180,
        marginHorizontal: 8,
        borderWidth: 1,
        elevation: 2,
    },
    audioRight: {
        alignSelf: 'flex-end',
        backgroundColor: colors.accent,
        borderColor: colors.accentDark,
        borderTopRightRadius: 4,
    },
    audioLeft: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3E5F5',
        borderColor: colors.accent,
        borderTopLeftRadius: 4,
    },
    audioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    audioTextBox: { marginLeft: 10, flex: 1 },
    audioTitle: { fontSize: 13, fontWeight: '600' },
    audioSub: { fontSize: 11, marginTop: 2 },
    playBtn: {
        width: 36, height: 36,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unlockBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, alignSelf: 'flex-start', marginTop: 4 },
    unlockBtnRight: { backgroundColor: 'rgba(255,255,255,0.2)' },
    unlockBtnLeft: { backgroundColor: 'rgba(139,92,246,0.1)' },
    unlockBtnText: { fontSize: 12, fontWeight: 'bold' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24, width: 320, borderWidth: 1, borderColor: '#7c3aed' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    modalSub: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 16 },
    modalInput: {
        backgroundColor: '#2a2a3e', color: '#fff', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
        borderWidth: 1, borderColor: '#7c3aed', marginBottom: 8,
    },
    errorText: { color: '#ff6b6b', fontSize: 12, textAlign: 'center', marginBottom: 8 },
    modalBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
    modalCancel: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333', alignItems: 'center' },
    modalCancelText: { color: '#aaa', fontWeight: '600' },
    modalConfirm: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center' },
    modalConfirmText: { color: '#fff', fontWeight: '700' },
});

export default SecretMessageBubble;
