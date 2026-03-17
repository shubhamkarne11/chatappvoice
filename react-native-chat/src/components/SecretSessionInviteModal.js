import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';

const SecretSessionInviteModal = ({
    visible,
    onAccept,
    onDecline,
    senderName,
    duration,
    password
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onDecline}
        >
            <View style={styles.centeredView}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onDecline}
                />
                <View style={styles.modalView}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed" size={48} color={colors.accent} />
                    </View>

                    <Text style={styles.title}>Secret Session Invitation 🔐</Text>
                    <Text style={styles.message}>
                        <Text style={styles.senderName}>{senderName}</Text> wants to start a secret session
                    </Text>

                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.detailText}>Duration: {duration} minutes</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.detailText}>Password: <Text style={styles.password}>{password}</Text></Text>
                        </View>
                    </View>

                    <Text style={styles.hint}>
                        Messages will be encrypted and auto-delete after the session ends.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.declineButton]}
                            onPress={onDecline}
                        >
                            <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.acceptButton]}
                            onPress={onAccept}
                        >
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        maxWidth: 400,
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    senderName: {
        fontWeight: 'bold',
        color: colors.accent,
    },
    detailsContainer: {
        width: '100%',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailText: {
        fontSize: 15,
        color: colors.text,
        marginLeft: 12,
        fontWeight: '500',
    },
    password: {
        fontWeight: 'bold',
        color: colors.accent,
        fontSize: 16,
        letterSpacing: 2,
    },
    hint: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineButton: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    acceptButton: {
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    declineButtonText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 16,
    },
    acceptButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default SecretSessionInviteModal;
