import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { leaveStyles as styles } from './leaveStyles';

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusConfig = () => {
        const upperStatus = status?.toUpperCase() || '';
        if (upperStatus === 'APPROVED') {
            return {
                container: { backgroundColor: C.colors.successBg },
                text: { color: C.colors.success },
                label: 'APPROVED',
                icon: 'check-circle',
                iconColor: C.colors.success,
            };
        }
        if (upperStatus === 'REJECTED') {
            return {
                container: { backgroundColor: C.colors.errorBg },
                text: { color: C.colors.error },
                label: 'REJECTED',
                icon: 'x-circle',
                iconColor: C.colors.error,
            };
        }
        return {
            container: { backgroundColor: C.colors.warningBg },
            text: { color: C.colors.warning },
            label: 'PENDING',
            icon: 'clock',
            iconColor: C.colors.warning,
        };
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.badge, config.container]}>
            <Icon name={config.icon as any} size={12} color={config.iconColor} />
            <Text style={[styles.badgeText, config.text]}>{config.label}</Text>
        </View>
    );
}
