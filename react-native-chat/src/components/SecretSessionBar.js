import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';

const SecretSessionBar = ({ endTime, onExtend, isUnlocked, onUnlockPress }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeLeft('00:00');
                setIsExpired(true);
                return;
            }

            setIsExpired(false);
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer(); // Initial call
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    if (isExpired) return null; // Or show "Session Ended" briefly

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={16} color={colors.white} />
                </View>
                <View>
                    <Text style={styles.title}>Secret Session Active</Text>
                    <Text style={styles.timer}>{timeLeft} remaining</Text>
                </View>
            </View>

            <View style={styles.actions}>
                {!isUnlocked && (
                    <TouchableOpacity style={styles.unlockButton} onPress={onUnlockPress}>
                        <Text style={styles.unlockText}>Unlock</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.extendButton} onPress={onExtend}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.white} />
                    <Text style={styles.extendText}>Extend</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#6A1B9A', // Deep purple
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    timer: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    extendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
    },
    extendText: {
        color: 'white',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600',
    },
    unlockButton: {
        backgroundColor: colors.secondary, // Assuming secondary is a highlight color
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
    },
    unlockText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default SecretSessionBar;
