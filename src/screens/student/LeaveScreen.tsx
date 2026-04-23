import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Feather';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';

// Types
interface Teacher {
    teacher_id: string;
    teacher_full_name: string;
}

interface LeaveRequest {
    leave_id: string;
    teacher_full_name?: string;
    teacher_id?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
    const code = await AsyncStorage.getItem('school_code');
    return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getStudentId = async (): Promise<string> => {
    const id = await AsyncStorage.getItem('student_id');
    return id || (await AsyncStorage.getItem('studentId')) || '';
};

const getParentId = async (): Promise<string> => {
    const id = await AsyncStorage.getItem('parent_id');
    return id || (await AsyncStorage.getItem('parentId')) || '';
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusStyle = () => {
        const upperStatus = status?.toUpperCase() || '';
        if (upperStatus === 'APPROVED') return styles.badgeApproved;
        if (upperStatus === 'REJECTED') return styles.badgeRejected;
        return styles.badgePending;
    };

    const getTextStyle = () => {
        const upperStatus = status?.toUpperCase() || '';
        if (upperStatus === 'APPROVED') return styles.badgeTextApproved;
        if (upperStatus === 'REJECTED') return styles.badgeTextRejected;
        return styles.badgeTextPending;
    };

    return (
        <View style={[styles.badge, getStatusStyle()]}>
            <Text style={[styles.badgeText, getTextStyle()]}>
                {status?.toUpperCase() || 'PENDING'}
            </Text>
        </View>
    );
};

export default function LeaveScreen() {
    const { userName } = useAuth();
    const [schoolCode, setSchoolCode] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [parentId, setParentId] = useState<string>('');

    // Form fields
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [reason, setReason] = useState<string>('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    // UI states
    const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [history, setHistory] = useState<LeaveRequest[]>([]);

    // Date picker states
    const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
    const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

    // Load stored credentials
    useEffect(() => {
        const loadCredentials = async () => {
            const code = await getSchoolCode();
            const sid = await getStudentId();
            const pid = await getParentId();
            setSchoolCode(code);
            setStudentId(sid);
            setParentId(pid);
        };
        loadCredentials();
    }, []);

    // Load data when credentials are ready
    useEffect(() => {
        if (schoolCode && studentId) {
            loadTeachers();
            loadHistory();
        }
    }, [schoolCode, studentId]);

    const loadTeachers = async () => {
        if (!schoolCode || !studentId) return;

        setLoadingTeachers(true);
        try {
            const res = await API.get('/manage/student-dashboard/teachers-for-leave', {
                params: {
                    school_code: schoolCode,
                    student_id: studentId,
                },
            });
            const teachersData = res.data?.items || [];
            setTeachers(teachersData);
            if (teachersData.length > 0) {
                setTeacherId(teachersData[0].teacher_id);
            }
        } catch (error) {
            console.error('Failed to load teachers', error);
            setTeachers([]);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const loadHistory = async () => {
        if (!schoolCode || !studentId) return;

        try {
            const res = await API.get('/manage/student-dashboard/leave-requests', {
                params: {
                    school_code: schoolCode,
                    student_id: studentId,
                },
            });
            setHistory(res.data?.items || []);
        } catch (error) {
            console.error('Failed to load leave history', error);
            setHistory([]);
        }
    };

    const refreshAll = async () => {
        setRefreshing(true);
        await Promise.all([loadTeachers(), loadHistory()]);
        setRefreshing(false);
    };

    const handleSubmit = async () => {
        if (!teacherId) {
            Alert.alert('Error', 'Please select a teacher');
            return;
        }

        if (!fromDate) {
            Alert.alert('Error', 'Please select from date');
            return;
        }

        if (!toDate) {
            Alert.alert('Error', 'Please select to date');
            return;
        }

        if (toDate < fromDate) {
            Alert.alert('Error', 'To date must be after from date');
            return;
        }

        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason for leave');
            return;
        }

        setSubmitting(true);
        try {
            await API.post('/manage/student-dashboard/leave-requests', {
                school_code: schoolCode,
                student_id: studentId,
                parent_id: parentId ? Number(parentId) : null,
                teacher_id: teacherId,
                from_date: formatDate(fromDate),
                to_date: formatDate(toDate),
                reason: reason.trim(),
            });

            Alert.alert('Success', 'Leave request submitted successfully');

            // Reset form
            setFromDate(null);
            setToDate(null);
            setReason('');
            await loadHistory();
        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || 'Failed to submit leave request';
            Alert.alert('Error', errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const formatDisplayDate = (dateString: string): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const onFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromDatePicker(false);
        if (selectedDate) {
            setFromDate(selectedDate);
        }
    };

    const onToDateChange = (event: any, selectedDate?: Date) => {
        setShowToDatePicker(false);
        if (selectedDate) {
            setToDate(selectedDate);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 17) return 'Afternoon';
        return 'Evening';
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.accent} />}
            >
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <View>
                        <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
                        <AppText style={styles.welcomeSub}>Manage your leave requests and track approvals.</AppText>
                    </View>
                    <View style={styles.dateBadge}>
                        <Icon name="calendar" size={12} color={colors.textMuted} />
                        <AppText style={styles.dateText}>
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </AppText>
                    </View>
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <AppText style={styles.title}>Leave Request</AppText>
                        <AppText style={styles.subText}>{history.length} records found</AppText>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={loadHistory}>
                        <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Two Column Layout */}
                <View style={styles.grid}>
                    {/* Apply Leave Form */}
                    <AppCard style={styles.formCard}>
                        <Text style={styles.cardTitle}>Apply Leave</Text>
                        <View style={styles.formBody}>
                            {/* Teacher Selection */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Select Teacher</Text>
                                {loadingTeachers ? (
                                    <ActivityIndicator size="small" color="#2563eb" />
                                ) : teachers.length === 0 ? (
                                    <Text style={styles.noDataText}>No teachers available</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.teacherChipContainer}>
                                            {teachers.map((teacher) => (
                                                <TouchableOpacity
                                                    key={teacher.teacher_id}
                                                    style={[
                                                        styles.teacherChip,
                                                        teacherId === teacher.teacher_id && styles.teacherChipActive,
                                                    ]}
                                                    onPress={() => setTeacherId(teacher.teacher_id)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.teacherChipText,
                                                            teacherId === teacher.teacher_id && styles.teacherChipTextActive,
                                                        ]}
                                                    >
                                                        {teacher.teacher_full_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
                            </View>

                            {/* From Date */}
                            <View style={styles.field}>
                                <Text style={styles.label}>From Date</Text>
                                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowFromDatePicker(true)}>
                                    <Text style={styles.datePickerText}>
                                        {fromDate ? formatDate(fromDate) : 'Select from date'}
                                    </Text>
                                    <Text style={styles.calendarIcon}>📅</Text>
                                </TouchableOpacity>
                                {showFromDatePicker && (
                                    <DateTimePicker
                                        value={fromDate || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onFromDateChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* To Date */}
                            <View style={styles.field}>
                                <Text style={styles.label}>To Date</Text>
                                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowToDatePicker(true)}>
                                    <Text style={styles.datePickerText}>
                                        {toDate ? formatDate(toDate) : 'Select to date'}
                                    </Text>
                                    <Text style={styles.calendarIcon}>📅</Text>
                                </TouchableOpacity>
                                {showToDatePicker && (
                                    <DateTimePicker
                                        value={toDate || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onToDateChange}
                                        minimumDate={fromDate || new Date()}
                                    />
                                )}
                            </View>

                            {/* Reason */}
                            <View style={styles.field}>
                                <Text style={styles.label}>Reason</Text>
                                <TextInput
                                    style={styles.textArea}
                                    multiline
                                    numberOfLines={4}
                                    value={reason}
                                    onChangeText={setReason}
                                    placeholder="Enter reason for leave..."
                                    placeholderTextColor="#94a3b8"
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Submit Button */}
                            <AppButton
                                title={submitting ? 'Submitting...' : 'Submit Leave Request'}
                                onPress={handleSubmit}
                                disabled={submitting || teachers.length === 0}
                                style={styles.submitBtn}
                            />
                        </View>
                    </AppCard>

                    {/* Leave History */}
                    <AppCard style={styles.historyCard}>
                        <Text style={styles.cardTitle}>Leave History</Text>
                        {history.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No leave requests found</Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    {/* Table Header */}
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableHeaderText, styles.colTeacher]}>Teacher</Text>
                                        <Text style={[styles.tableHeaderText, styles.colFrom]}>From</Text>
                                        <Text style={[styles.tableHeaderText, styles.colTo]}>To</Text>
                                        <Text style={[styles.tableHeaderText, styles.colReason]}>Reason</Text>
                                        <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                                    </View>

                                    {/* Table Rows */}
                                    {history.map((row) => (
                                        <View key={row.leave_id} style={styles.tableRow}>
                                            <Text style={[styles.tableCell, styles.colTeacher]}>
                                                {row.teacher_full_name || row.teacher_id || '-'}
                                            </Text>
                                            <Text style={[styles.tableCell, styles.colFrom]}>
                                                {formatDisplayDate(row.from_date)}
                                            </Text>
                                            <Text style={[styles.tableCell, styles.colTo]}>
                                                {formatDisplayDate(row.to_date)}
                                            </Text>
                                            <Text style={[styles.tableCell, styles.colReason]} numberOfLines={2}>
                                                {row.reason}
                                            </Text>
                                            <View style={[styles.tableCell, styles.colStatus]}>
                                                <StatusBadge status={row.status} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        )}
                    </AppCard>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    welcomeSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    welcomeSub: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    subText: {
        color: colors.textMuted,
        fontSize: 13,
    },
    refreshBtn: {
        backgroundColor: colors.surface,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    grid: {
        flexDirection: 'column',
        gap: 20,
    },
    formCard: {
        padding: 0,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
    },
    historyCard: {
        padding: 0,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
        padding: 18,
        paddingBottom: 0,
    },
    formBody: {
        padding: 18,
    },
    field: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    teacherChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    teacherChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        marginBottom: 8,
    },
    teacherChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    teacherChipText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    teacherChipTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    datePickerBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 46,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    datePickerText: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    calendarIcon: {
        fontSize: 16,
    },
    textArea: {
        minHeight: 100,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
        textAlignVertical: 'top',
    },
    submitBtn: {
        marginTop: 8,
        backgroundColor: colors.accent,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.bg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableCell: {
        fontSize: 13,
        color: colors.textPrimary,
    },
    colTeacher: {
        width: 120,
    },
    colFrom: {
        width: 90,
    },
    colTo: {
        width: 90,
    },
    colReason: {
        width: 150,
    },
    colStatus: {
        width: 90,
    },
    badge: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    badgeApproved: {
        backgroundColor: 'rgba(21, 128, 61, 0.15)',
    },
    badgeRejected: {
        backgroundColor: 'rgba(185, 28, 28, 0.15)',
    },
    badgePending: {
        backgroundColor: 'rgba(180, 83, 9, 0.15)',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    badgeTextApproved: {
        color: '#22c55e',
    },
    badgeTextRejected: {
        color: '#ef4444',
    },
    badgeTextPending: {
        color: '#f59e0b',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontWeight: '600',
    },
    noDataText: {
        color: colors.textMuted,
        fontSize: 14,
        paddingVertical: 8,
    },
});
