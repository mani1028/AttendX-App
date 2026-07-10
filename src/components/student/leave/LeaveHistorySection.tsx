import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import LeaveHistoryCard from './LeaveHistoryCard';
import { leaveStyles as styles } from './leaveStyles';
import type { LeaveRequest } from './types';

interface LeaveHistorySectionProps {
    history: LeaveRequest[];
    showAllHistory: boolean;
    initialHistoryLimit: number;
    onViewRequest: (request: LeaveRequest) => void;
    onViewMore: () => void;
}

export default function LeaveHistorySection({
    history,
    showAllHistory,
    initialHistoryLimit,
    onViewRequest,
    onViewMore,
}: LeaveHistorySectionProps) {
    return (
        <View style={styles.historyCardContainer}>
            <Text style={styles.cardTitle}>LEAVE HISTORY</Text>

            {history.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                    <View style={styles.illustrationPlaceholder}>
                        <View style={styles.illuLayer1} />
                        <View style={styles.illuLayer2} />
                        <View style={styles.illuLayer3} />
                        <Icon name="file-text" size={40} color={C.colors.blue} style={styles.illuIcon} />
                    </View>
                    <Text style={styles.emptyHistoryTitle}>No Leave Requests Yet</Text>
                    <Text style={styles.emptyHistorySubtitle}>
                        Your Leave Request History Will Appear Here
                    </Text>
                </View>
            ) : (
                <>
                    {history
                        .slice(0, showAllHistory ? history.length : initialHistoryLimit)
                        .map((request, index) => (
                            <LeaveHistoryCard
                                key={request.leave_id || `leave-${index}-${request.from_date}`}
                                request={request}
                                onView={() => onViewRequest(request)}
                            />
                        ))}
                    {!showAllHistory && history.length > initialHistoryLimit && (
                        <TouchableOpacity style={styles.viewMoreBtn} onPress={onViewMore}>
                            <Text style={styles.viewMoreText}>View More</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    );
}
