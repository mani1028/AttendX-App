import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { formatDateRange, getDuration } from './helpers';
import { leaveStyles as styles } from './leaveStyles';
import StatusBadge from './StatusBadge';
import type { LeaveRequest } from './types';

interface LeaveHistoryCardProps {
    request: LeaveRequest;
    onView: () => void;
}

export default function LeaveHistoryCard({ request, onView }: LeaveHistoryCardProps) {
    return (
        <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
                <View style={styles.historyTeacherInfo}>
                    <View style={styles.historyTeacherAvatar}>
                        <Text style={styles.historyTeacherAvatarText}>
                            {request.teacher_full_name?.charAt(0) || 'T'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.historyTeacherName}>
                            {request.teacher_full_name || 'Unknown Teacher'}
                        </Text>
                        <Text style={styles.historyDuration}>
                            {getDuration(request.from_date, request.to_date)}
                        </Text>
                    </View>
                </View>
                <StatusBadge status={request.status} />
            </View>

            <View style={styles.historyCardBody}>
                <View style={styles.historyDateRange}>
                    <Icon name="calendar" size={14} color={C.colors.textSec} />
                    <Text style={styles.historyDateText}>
                        {formatDateRange(request.from_date, request.to_date)}
                    </Text>
                </View>
                <View style={styles.historyReason}>
                    <Icon name="file-text" size={14} color={C.colors.textSec} />
                    <Text style={styles.historyReasonText} numberOfLines={1}>
                        {request.reason}
                    </Text>
                </View>
            </View>

            <View style={styles.historyFooter}>
                <TouchableOpacity style={styles.viewDetailsBtn} onPress={onView}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <Icon name="arrow-right" size={14} color={C.colors.blue} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
