import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';

const SecretSessionModal = ({
    visible,
    onClose,
    mode, // 'start', 'extend', 'unlock'
    onStartSession,
    onExtendSession,
    onUnlockSession,
    currentDuration = 0
}) => {
    const [duration, setDuration] = useState('5');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset fields when modal opens
            setPassword('');
            setConfirmPassword('');
            setDuration('5');
            setShowPassword(false);
        }
    }, [visible]);

    const handleStart = () => {
        const mins = parseInt(duration);
        if (isNaN(mins) || mins < 2 || mins > 50) {
            Alert.alert('Invalid Duration', 'Duration must be between 2 and 50 minutes.');
            return;
        }
        if (password.length < 4) {
            Alert.alert('Weak Password', 'Password must be at least 4 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match.');
            return;
        }
        onStartSession(mins, password);
    };

    const handleExtend = () => {
        const mins = parseInt(duration);
        if (isNaN(mins) || mins < 1 || mins > 30) {
            Alert.alert('Invalid Extension', 'Extension must be between 1 and 30 minutes.');
            return;
        }
        onExtendSession(mins);
    };

    const handleUnlock = () => {
        if (!password) {
            Alert.alert('Required', 'Please enter the session password.');
            return;
        }
        onUnlockSession(password);
    };

    const renderContent = () => {
        if (mode === 'start') {
            return (
                <>
                    <Text style={styles.title}>Start Secret Session 🔐</Text>
                    <Text style={styles.subtitle}>Messages will be encrypted and self-destruct after the session ends.</Text>

                    <Text style={styles.label}>Duration (Minutes)</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="e.g. 5"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    <Text style={styles.hint}>Range: 2 - 50 minutes</Text>

                    <Text style={styles.label}>Set Session Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholder="Enter password"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            placeholder="Confirm password"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
                        <Text style={styles.primaryButtonText}>Start Session</Text>
                    </TouchableOpacity>
                </>
            );
        } else if (mode === 'extend') {
            return (
                <>
                    <Text style={styles.title}>Extend Session ⏳</Text>
                    <Text style={styles.subtitle}>Add more time to the current secret session.</Text>

                    <Text style={styles.label}>Add Minutes</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="e.g. 5"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    <Text style={styles.hint}>Max extension: 30 minutes</Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleExtend}>
                        <Text style={styles.primaryButtonText}>Extend Session</Text>
                    </TouchableOpacity>
                </>
            );
        } else if (mode === 'unlock') {
            return (
                <>
                    <Text style={styles.title}>Unlock Session 🔓</Text>
                    <Text style={styles.subtitle}>Enter the session password to view encrypted messages.</Text>

                    <Text style={styles.label}>Session Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholder="Enter password"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            autoFocus={true}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleUnlock}>
                        <Text style={styles.primaryButtonText}>Unlock</Text>
                    </TouchableOpacity>
                </>
            );
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.centeredView}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.modalView}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>

                    {renderContent()}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalView: {
        width: '85%',
        backgroundColor: colors.white, // Assuming white background, check constants if different
        borderRadius: 20,
        padding: 25,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        zIndex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 4,
        backgroundColor: colors.inputBackground,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
    },
    hint: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 16,
        marginLeft: 4,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        color: colors.white, // Assuming white text
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default SecretSessionModal;
