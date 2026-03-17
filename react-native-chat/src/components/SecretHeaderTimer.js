import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/constants';

const SecretHeaderTimer = ({ endTime, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeLeft('00:00');
                setIsExpired(true);
                if (onExpire) onExpire();
                return;
            }

            setIsExpired(false);
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    if (isExpired) return null;

    return (
        <View style={styles.container}>
            <Ionicons name="lock-closed" size={14} color={colors.accent} />
            <Text style={styles.timer}>{timeLeft}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent + '20', // Light accent background
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.accent + '50',
    },
    timer: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
        fontVariant: ['tabular-nums'],
    },
});

export default SecretHeaderTimer;
