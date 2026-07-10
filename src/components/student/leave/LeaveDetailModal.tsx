import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { formatDateRange, getDuration } from './helpers';
import { leaveStyles as styles } from './leaveStyles';
import StatusBadge from './StatusBadge';
import type { LeaveRequest } from './types';

interface LeaveDetailModalProps {
    visible: boolean;
    request: LeaveRequest | null;
    onClose: () => void;
}

export default function LeaveDetailModal({ visible, request, onClose }: LeaveDetailModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.teacherModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Leave Details</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="x" size={24} color={C.colors.text} />
                        </TouchableOpacity>
                    </View>
                    {request && (
                        <ScrollView style={styles.teacherList}>
                            <View style={styles.detailCard}>
                                <View style={styles.detailStatusRow}>
                                    <StatusBadge status={request.status} />
                                    <Text style={styles.detailDateText}>
                                        Applied on{' '}
                                        {new Date(request.created_at || Date.now()).toLocaleDateString('en-GB')}
                                    </Text>
                                </View>

                                <View style={styles.detailInfoSection}>
                                    <Text style={styles.detailLabel}>TEACHER</Text>
                                    <View style={styles.detailValueContainer}>
                                        <View style={styles.detailAvatar}>
                                            <Text style={styles.detailAvatarText}>
                                                {request.teacher_full_name?.charAt(0)}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={styles.detailValueText}>{request.teacher_full_name}</Text>
                                            <Text style={styles.detailSubValueText}>Teacher</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.detailInfoSection}>
                                    <Text style={styles.detailLabel}>DURATION</Text>
                                    <View style={styles.detailValueContainer}>
                                        <Icon name="calendar" size={16} color={C.colors.textSec} />
                                        <Text style={styles.detailValueText}>
                                            {formatDateRange(request.from_date, request.to_date)}
                                            {'\n'}
                                            <Text style={styles.detailDurationText}>
                                                ({getDuration(request.from_date, request.to_date)})
                                            </Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailInfoSection}>
                                    <Text style={styles.detailLabel}>REASON</Text>
                                    <View style={styles.detailReasonBox}>
                                        <Text style={styles.detailReasonText}>{request.reason}</Text>
                                    </View>
                                </View>

                                {request.teacher_comment && (
                                    <View style={styles.detailInfoSection}>
                                        <Text style={styles.detailLabel}>TEACHER'S COMMENT</Text>
                                        <View
                                            style={[styles.detailReasonBox, { backgroundColor: C.colors.blueLight }]}
                                        >
                                            <Text style={styles.detailReasonText}>{request.teacher_comment}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    )}
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                        <Text style={styles.modalCloseBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
