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
    Dimensions,
    StatusBar,
    Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Feather';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';

const { width, height } = Dimensions.get('window');

// Types
interface Teacher {
    teacher_id: string;
    teacher_full_name: string;
    subject?: string;
    avatar?: string;
}

interface LeaveRequest {
    leave_id: string;
    teacher_full_name?: string;
    teacher_id?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at?: string;
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

// Enhanced Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusConfig = () => {
        const upperStatus = status?.toUpperCase() || '';
        if (upperStatus === 'APPROVED') {
            return {
                container: styles.badgeApproved,
                text: styles.badgeTextApproved,
                label: 'APPROVED',
                icon: 'check-circle',
                iconColor: '#22c55e',
            };
        }
        if (upperStatus === 'REJECTED') {
            return {
                container: styles.badgeRejected,
                text: styles.badgeTextRejected,
                label: 'REJECTED',
                icon: 'x-circle',
                iconColor: '#ef4444',
            };
        }
        return {
            container: styles.badgePending,
            text: styles.badgeTextPending,
            label: 'PENDING',
            icon: 'clock',
            iconColor: '#f59e0b',
        };
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.badge, config.container]}>
            <Icon name={config.icon} size={12} color={config.iconColor} />
            <Text style={[styles.badgeText, config.text]}>{config.label}</Text>
        </View>
    );
};

// Teacher Card Component
const TeacherCard: React.FC<{
    teacher: Teacher;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ teacher, isSelected, onSelect }) => (
    <TouchableOpacity
        style={[styles.teacherCard, isSelected && styles.teacherCardSelected]}
        onPress={onSelect}
    >
        <View style={styles.teacherAvatar}>
            <Text style={styles.teacherAvatarText}>
                {teacher.teacher_full_name.charAt(0)}
            </Text>
        </View>
        <View style={styles.teacherInfo}>
            <Text style={styles.teacherName}>{teacher.teacher_full_name}</Text>
            {teacher.subject && (
                <Text style={styles.teacherSubject}>{teacher.subject}</Text>
            )}
        </View>
        {isSelected && (
            <View style={styles.selectedIndicator}>
                <Icon name="check" size={16} color="#ffffff" />
            </View>
        )}
    </TouchableOpacity>
);

// Leave History Card Component
const LeaveHistoryCard: React.FC<{ request: LeaveRequest }> = ({ request }) => {
    const formatDateRange = (from: string, to: string) => {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        if (from === to) {
            return fromDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
        return `${fromDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })} - ${toDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })}`;
    };

    const getDuration = (from: string, to: string) => {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    };

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
                    <Icon name="calendar" size={14} color="#64748b" />
                    <Text style={styles.historyDateText}>
                        {formatDateRange(request.from_date, request.to_date)}
                    </Text>
                </View>
                <View style={styles.historyReason}>
                    <Icon name="file-text" size={14} color="#64748b" />
                    <Text style={styles.historyReasonText} numberOfLines={2}>
                        {request.reason}
                    </Text>
                </View>
            </View>
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
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

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
            if (teachersData.length > 0 && !teacherId) {
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

            setShowSuccessModal(true);
            
            // Reset form
            setFromDate(null);
            setToDate(null);
            setReason('');
            await loadHistory();
            
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 2000);
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

    const onFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromDatePicker(false);
        if (selectedDate) {
            setFromDate(selectedDate);
            if (!toDate || selectedDate > toDate) {
                setToDate(null);
            }
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

    const pendingRequests = history.filter(h => h.status === 'PENDING');
    const approvedRequests = history.filter(h => h.status === 'APPROVED');
    const rejectedRequests = history.filter(h => h.status === 'REJECTED');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
            
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#3b82f6" />
                }
            >
                {/* Gradient Header */}
                <LinearGradient
                    colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientHeader}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.welcomeSection}>
                            <View>
                                <Text style={styles.welcomeGreeting}>Good {getGreeting()}! 👋</Text>
                                <Text style={styles.welcomeTitle}>Leave Management</Text>
                                <Text style={styles.welcomeSub}>Request time off and track approvals</Text>
                            </View>
                            <TouchableOpacity style={styles.notificationIcon}>
                                <Icon name="bell" size={20} color="#fff" />
                                {pendingRequests.length > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationBadgeText}>
                                            {pendingRequests.length}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* Stats Summary */}
                <View style={styles.statsSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                        <View style={[styles.statCard, styles.statCardTotal]}>
                            <Icon name="file-text" size={24} color="#3b82f6" />
                            <Text style={styles.statNumber}>{history.length}</Text>
                            <Text style={styles.statLabel}>Total Requests</Text>
                        </View>
                        <View style={[styles.statCard, styles.statCardPending]}>
                            <Icon name="clock" size={24} color="#f59e0b" />
                            <Text style={styles.statNumber}>{pendingRequests.length}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                        <View style={[styles.statCard, styles.statCardApproved]}>
                            <Icon name="check-circle" size={24} color="#22c55e" />
                            <Text style={styles.statNumber}>{approvedRequests.length}</Text>
                            <Text style={styles.statLabel}>Approved</Text>
                        </View>
                        <View style={[styles.statCard, styles.statCardRejected]}>
                            <Icon name="x-circle" size={24} color="#ef4444" />
                            <Text style={styles.statNumber}>{rejectedRequests.length}</Text>
                            <Text style={styles.statLabel}>Rejected</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Apply Leave Form Section */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Request Leave</Text>
                    
                    {/* Teacher Selection */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Select Teacher</Text>
                        {loadingTeachers ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : teachers.length === 0 ? (
                            <View style={styles.noTeachersContainer}>
                                <Icon name="users" size={32} color="#cbd5e1" />
                                <Text style={styles.noTeachersText}>No teachers available</Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teachersScroll}>
                                {teachers.map((teacher) => (
                                    <TeacherCard
                                        key={teacher.teacher_id}
                                        teacher={teacher}
                                        isSelected={teacherId === teacher.teacher_id}
                                        onSelect={() => setTeacherId(teacher.teacher_id)}
                                    />
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Date Selection */}
                    <View style={styles.dateRow}>
                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.formLabel}>From Date</Text>
                            <TouchableOpacity 
                                style={styles.datePickerBtn} 
                                onPress={() => setShowFromDatePicker(true)}
                            >
                                <Icon name="calendar" size={18} color="#64748b" />
                                <Text style={styles.datePickerText}>
                                    {fromDate ? formatDate(fromDate) : 'Select date'}
                                </Text>
                                <Icon name="chevron-down" size={18} color="#64748b" />
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

                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.formLabel}>To Date</Text>
                            <TouchableOpacity 
                                style={styles.datePickerBtn} 
                                onPress={() => setShowToDatePicker(true)}
                                disabled={!fromDate}
                            >
                                <Icon name="calendar" size={18} color="#64748b" />
                                <Text style={[
                                    styles.datePickerText,
                                    !fromDate && styles.datePickerTextDisabled
                                ]}>
                                    {toDate ? formatDate(toDate) : 'Select date'}
                                </Text>
                                <Icon name="chevron-down" size={18} color="#64748b" />
                            </TouchableOpacity>
                            {showToDatePicker && (
                                <DateTimePicker
                                    value={toDate || fromDate || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onToDateChange}
                                    minimumDate={fromDate || new Date()}
                                />
                            )}
                        </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Reason for Leave</Text>
                        <View style={styles.textAreaContainer}>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={4}
                                value={reason}
                                onChangeText={setReason}
                                placeholder="Please provide a detailed reason for your leave request..."
                                placeholderTextColor="#94a3b8"
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>
                                {reason.length}/500 characters
                            </Text>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <LinearGradient
                            colors={['#3b82f6', '#2563eb']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Icon name="send" size={18} color="#fff" />
                                    <Text style={styles.submitButtonText}>Submit Leave Request</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Leave History Section */}
                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionTitle}>Leave History</Text>
                        <Text style={styles.historyCount}>{history.length} requests</Text>
                    </View>

                    {history.length === 0 ? (
                        <View style={styles.emptyHistory}>
                            <View style={styles.emptyIconContainer}>
                                <Icon name="calendar" size={48} color="#cbd5e1" />
                            </View>
                            <Text style={styles.emptyTitle}>No Leave Requests</Text>
                            <Text style={styles.emptyText}>
                                You haven't submitted any leave requests yet
                            </Text>
                        </View>
                    ) : (
                        history.map((request) => (
                            <LeaveHistoryCard key={request.leave_id} request={request} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIconContainer}>
                            <Icon name="check-circle" size={48} color="#22c55e" />
                        </View>
                        <Text style={styles.successTitle}>Request Submitted!</Text>
                        <Text style={styles.successMessage}>
                            Your leave request has been submitted successfully and is pending approval.
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentContainer: {
        paddingBottom: 40,
    },
    gradientHeader: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    headerContent: {
        marginTop: 10,
    },
    welcomeSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    welcomeGreeting: {
        fontSize: 14,
        color: '#bfdbfe',
        marginBottom: 4,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 6,
    },
    welcomeSub: {
        fontSize: 13,
        color: '#bfdbfe',
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#ffffff',
    },
    statsSection: {
        marginTop: -20,
        paddingHorizontal: 16,
    },
    statsScroll: {
        flexDirection: 'row',
    },
    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        minWidth: width * 0.28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statCardTotal: {
        borderTopWidth: 3,
        borderTopColor: '#3b82f6',
    },
    statCardPending: {
        borderTopWidth: 3,
        borderTopColor: '#f59e0b',
    },
    statCardApproved: {
        borderTopWidth: 3,
        borderTopColor: '#22c55e',
    },
    statCardRejected: {
        borderTopWidth: 3,
        borderTopColor: '#ef4444',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 4,
    },
    formSection: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    teachersScroll: {
        flexDirection: 'row',
    },
    teacherCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minWidth: width * 0.4,
    },
    teacherCardSelected: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    teacherAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    teacherAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    teacherInfo: {
        flex: 1,
    },
    teacherName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    teacherSubject: {
        fontSize: 11,
        color: '#64748b',
    },
    selectedIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    datePickerText: {
        flex: 1,
        fontSize: 14,
        color: '#0f172a',
        marginLeft: 8,
    },
    datePickerTextDisabled: {
        color: '#94a3b8',
    },
    textAreaContainer: {
        position: 'relative',
    },
    textArea: {
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#0f172a',
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'right',
        marginTop: 6,
    },
    submitButton: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    historySection: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyCount: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    historyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    historyTeacherInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyTeacherAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyTeacherAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3b82f6',
    },
    historyTeacherName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    historyDuration: {
        fontSize: 11,
        color: '#64748b',
    },
    historyCardBody: {
        gap: 8,
    },
    historyDateRange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyDateText: {
        fontSize: 12,
        color: '#475569',
    },
    historyReason: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    historyReasonText: {
        flex: 1,
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 6,
    },
    badgeApproved: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    badgeRejected: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    badgePending: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
    noTeachersContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    noTeachersText: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
    },
    emptyHistory: {
        alignItems: 'center',
        paddingVertical: 48,
        backgroundColor: '#ffffff',
        borderRadius: 16,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModal: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: width * 0.8,
    },
    successIconContainer: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
});