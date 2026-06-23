import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
    Modal,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTeachersForLeave, getLeaveRequests, submitLeaveRequest } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Feather';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

const { width, height } = Dimensions.get('window');

// Types
interface Teacher {
    teacher_id: string;
    teacher_full_name: string;
    subject?: string;
    avatar?: string;
}

const isClassTeacherEntry = (teacher: Teacher & Record<string, any>): boolean => {
    const candidates = [
        teacher.is_class_teacher,
        teacher.class_teacher,
        teacher.classTeacher,
        teacher.isClassTeacher,
        teacher.role,
        teacher.designation,
        teacher.teacher_type,
        teacher.type,
        teacher.subject,
    ];

    return candidates.some((value) => {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return (
                normalized === 'class teacher' ||
                normalized === 'class_teacher' ||
                normalized === 'classteacher' ||
                normalized.includes('class teacher')
            );
        }

        return false;
    });
};

const getAutoSelectedTeacher = (teacherList: Teacher[]): Teacher | undefined => {
    return teacherList.find(isClassTeacherEntry) || teacherList[0];
};

interface LeaveRequest {
    leave_id: string;
    teacher_full_name?: string;
    teacher_id?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at?: string;
    teacher_comment?: string;
}

// Helper functions
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

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
};

// Leave History Card Component
const LeaveHistoryCard: React.FC<{ request: LeaveRequest; onView: () => void }> = ({ request, onView }) => {
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
};

export default function LeaveScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { setTabBarVisible } = useAuth();
    const isMounted = useRef(true);
    const initialHistoryLimit = 10;
    const [schoolCode, setSchoolCode] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [parentId, setParentId] = useState<string>('');
  const handleScroll = useScrollTabBar();


    // Form fields
    const [leaveType, setLeaveType] = useState<'ONE_DAY' | 'MULTIPLE_DAYS'>('ONE_DAY');
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [reason, setReason] = useState<string>('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);

    // UI states
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [history, setHistory] = useState<LeaveRequest[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

    // Date picker states
    const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
    const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

    // Load stored credentials and cached data
    useEffect(() => {
        isMounted.current = true;
        const loadInitialData = async () => {
            const code = await getSchoolCode();
            const sid = await getStudentId();
            const pid = await getParentId();
            if (!isMounted.current) {return;}
            setSchoolCode(code);
            setStudentId(sid);
            setParentId(pid);

            // Load cache
            if (sid) {
               try {
                   const cachedTeachers = await AsyncStorage.getItem(`teachers_cache_${sid}`);
                   if (cachedTeachers && isMounted.current) {
                       const teachersData = JSON.parse(cachedTeachers);
                       setTeachers(teachersData);
                   }

                   const cachedHistory = await AsyncStorage.getItem(`leave_history_cache_${sid}`);
                   if (cachedHistory && isMounted.current) {setHistory(JSON.parse(cachedHistory));}
               } catch (e) {
                   console.log('Failed to load leave cache');
               }
            }
        };
        loadInitialData();
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Load data from API when credentials are ready
    useEffect(() => {
        if (schoolCode && studentId) {
            loadTeachers();
            loadHistory();
        }
    }, [schoolCode, studentId]);

    useEffect(() => {
        const autoSelectedTeacher = getAutoSelectedTeacher(teachers);
        if (!autoSelectedTeacher) {
            return;
        }

        setTeacherId((currentTeacherId) => {
            if (String(currentTeacherId) === String(autoSelectedTeacher.teacher_id)) {
                return currentTeacherId;
            }

            return String(autoSelectedTeacher.teacher_id);
        });
    }, [teachers]);

    const loadTeachers = async () => {
        if (!studentId) {return;}

        try {
            const teachersData = await getTeachersForLeave();
            if (isMounted.current) {
                setTeachers(teachersData);
            }
            await AsyncStorage.setItem(`teachers_cache_${studentId}`, JSON.stringify(teachersData));
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                console.error('Failed to load teachers', error);
            }
        }
    };

    const loadHistory = async () => {
        if (!studentId) {return;}

        try {
            const historyData = await getLeaveRequests();
            if (isMounted.current) {
                setHistory(historyData);
            }
            await AsyncStorage.setItem(`leave_history_cache_${studentId}`, JSON.stringify(historyData));
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                console.error('Failed to load leave history', error);
            }
        }
    };

    const refreshAll = async () => {
        setRefreshing(true);
        await Promise.all([loadTeachers(), loadHistory()]);
        setRefreshing(false);
    };

    const handleViewMoreHistory = async () => {
        setShowAllHistory(true);
        setRefreshing(true);
        try {
            const historyData = await getLeaveRequests();
            if (isMounted.current) {
                setHistory(historyData);
            }
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                console.error('Failed to load full leave history', error);
            }
        } finally {
            if (isMounted.current) {
                setRefreshing(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!teacherId) {
            Alert.alert('Error', 'Please select a teacher');
            return;
        }

        if (!fromDate) {
            Alert.alert('Error', 'Please select a date');
            return;
        }

        let finalToDate = toDate;
        if (leaveType === 'ONE_DAY') {
            finalToDate = fromDate;
        } else {
            if (!toDate) {
                Alert.alert('Error', 'Please select to date');
                return;
            }
            if (toDate <= fromDate) {
                Alert.alert('Error', 'Multiple days leave request must be more than 1 day');
                return;
            }
        }

        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason for leave');
            return;
        }

        setSubmitting(true);
        try {
            await submitLeaveRequest({
                parent_id: parentId ? Number(parentId) : null,
                teacher_id: teacherId,
                from_date: formatDate(fromDate),
                to_date: formatDate(finalToDate as Date),
                reason: reason.trim(),
            });

            if (isMounted.current) {
                setShowSuccessModal(true);

                // Reset form
                setFromDate(null);
                setToDate(null);
                setReason('');
                await loadHistory();

                setTimeout(() => {
                    if (isMounted.current) {
                        setShowSuccessModal(false);
                    }
                }, 2000);
            }
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                const errorMsg = error?.response?.data?.detail || 'Failed to submit leave request';
                Alert.alert('Error', errorMsg);
            }
        } finally {
            if (isMounted.current) {
                setSubmitting(false);
            }
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

    const selectedTeacher = teachers.find(t => String(t.teacher_id) === String(teacherId));

    return (
        <View style={styles.container}>


            <View style={[styles.header, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets), paddingBottom: 20 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
                >
                    <Icon name="arrow-left" size={24} color={C.colors.card} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Leave Requests</Text>
                    <Text style={styles.headerSubtitle}>{history.length} Records</Text>
                </View>
                <TouchableOpacity
                    style={styles.notificationIcon}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <Icon name="bell" size={22} color={C.colors.card} />
                </TouchableOpacity>
            </View>

            <View style={styles.refreshWrapper}>
                <TouchableOpacity style={styles.refreshPill} onPress={refreshAll}>
                    <Text style={styles.refreshPillText}>Refresh</Text>
                    <Icon name="refresh-cw" size={14} color={C.colors.blue} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.colors.primary} />
                }
            >
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>APPLY LEAVE</Text>

                    {/* Leave Type Toggle */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Leave Type</Text>
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleButton, leaveType === 'ONE_DAY' && styles.toggleButtonActive]}
                                onPress={() => setLeaveType('ONE_DAY')}
                            >
                                <Text style={[styles.toggleButtonText, leaveType === 'ONE_DAY' && styles.toggleButtonTextActive]}>
                                    One Day
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleButton, leaveType === 'MULTIPLE_DAYS' && styles.toggleButtonActive]}
                                onPress={() => setLeaveType('MULTIPLE_DAYS')}
                            >
                                <Text style={[styles.toggleButtonText, leaveType === 'MULTIPLE_DAYS' && styles.toggleButtonTextActive]}>
                                    Multiple Days
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Class Teacher */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Class Teacher</Text>
                        <View style={styles.autoTeacherCard}>
                            <View style={styles.autoTeacherTextBlock}>
                                <Text style={[styles.dropdownText, !selectedTeacher && styles.dropdownPlaceholder]}>
                                    {selectedTeacher ? selectedTeacher.teacher_full_name : 'Class teacher will be selected automatically'}
                                </Text>
                                <Text style={styles.autoTeacherHint}>
                                    {selectedTeacher ? 'Auto-selected for your class' : 'No class teacher available yet'}
                                </Text>
                            </View>
                            <Icon name="user-check" size={20} color={C.colors.blue} />
                        </View>
                    </View>

                    {/* Date Selection */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>{leaveType === 'ONE_DAY' ? 'Select Date' : 'From Date'}</Text>
                        <TouchableOpacity
                            style={styles.inputField}
                            onPress={() => setShowFromDatePicker(true)}
                        >
                            <Text style={[styles.inputText, !fromDate && styles.dropdownPlaceholder]}>
                                {fromDate ? fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : 'dd-mm-yy'}
                            </Text>
                            <Icon name="calendar" size={18} color={C.colors.textSec} />
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

                    {leaveType === 'MULTIPLE_DAYS' && (
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>To Date</Text>
                            <TouchableOpacity
                                style={styles.inputField}
                                onPress={() => setShowToDatePicker(true)}
                                disabled={!fromDate}
                            >
                                <Text style={[styles.inputText, (!toDate || !fromDate) && styles.dropdownPlaceholder]}>
                                    {toDate ? toDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : 'dd-mm-yy'}
                                </Text>
                                <Icon name="calendar" size={18} color={C.colors.textSec} />
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
                    )}

                    {/* Reason */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Reason for Leave</Text>
                        <TextInput
                            style={styles.textInputArea}
                            multiline
                            numberOfLines={4}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Reason"
                            placeholderTextColor={C.colors.textMuted}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={C.colors.card} />
                        ) : (
                            <>
                                <Icon name="send" size={20} color={C.colors.card} style={styles.submitIcon} />
                                <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Leave History Section */}
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
                            {history.slice(0, showAllHistory ? history.length : initialHistoryLimit).map((request, index) => (
                                <LeaveHistoryCard
                                    key={request.leave_id || `leave-${index}-${request.from_date}`}
                                    request={request}
                                    onView={() => {
                                        setSelectedRequest(request);
                                        setShowDetailModal(true);
                                    }}
                                />
                            ))}
                            {!showAllHistory && history.length > initialHistoryLimit && (
                                <TouchableOpacity style={styles.viewMoreBtn} onPress={handleViewMoreHistory}>
                                    <Text style={styles.viewMoreText}>View More</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Leave Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.teacherModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Leave Details</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Icon name="x" size={24} color={C.colors.text} />
                            </TouchableOpacity>
                        </View>
                        {selectedRequest && (
                            <ScrollView style={styles.teacherList}>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailStatusRow}>
                                        <StatusBadge status={selectedRequest.status} />
                                        <Text style={styles.detailDateText}>
                                            Applied on {new Date(selectedRequest.created_at || Date.now()).toLocaleDateString('en-GB')}
                                        </Text>
                                    </View>

                                    <View style={styles.detailInfoSection}>
                                        <Text style={styles.detailLabel}>TEACHER</Text>
                                        <View style={styles.detailValueContainer}>
                                            <View style={styles.detailAvatar}>
                                                <Text style={styles.detailAvatarText}>
                                                    {selectedRequest.teacher_full_name?.charAt(0)}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={styles.detailValueText}>{selectedRequest.teacher_full_name}</Text>
                                                <Text style={styles.detailSubValueText}>Teacher</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailInfoSection}>
                                        <Text style={styles.detailLabel}>DURATION</Text>
                                        <View style={styles.detailValueContainer}>
                                            <Icon name="calendar" size={16} color={C.colors.textSec} />
                                            <Text style={styles.detailValueText}>
                                                {formatDateRange(selectedRequest.from_date, selectedRequest.to_date)}
                                                {'\n'}<Text style={styles.detailDurationText}>({getDuration(selectedRequest.from_date, selectedRequest.to_date)})</Text>
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailInfoSection}>
                                        <Text style={styles.detailLabel}>REASON</Text>
                                        <View style={styles.detailReasonBox}>
                                            <Text style={styles.detailReasonText}>{selectedRequest.reason}</Text>
                                        </View>
                                    </View>

                                    {selectedRequest.teacher_comment && (
                                        <View style={styles.detailInfoSection}>
                                            <Text style={styles.detailLabel}>TEACHER'S COMMENT</Text>
                                            <View style={[styles.detailReasonBox, { backgroundColor: C.colors.blueLight }]}>
                                                <Text style={styles.detailReasonText}>{selectedRequest.teacher_comment}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowDetailModal(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Teacher Selection Modal */}
            <Modal
                visible={showTeacherModal}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.teacherModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Teacher</Text>
                            <TouchableOpacity onPress={() => setShowTeacherModal(false)}>
                                <Icon name="x" size={24} color={C.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.teacherList}>
                            {teachers.map((teacher, index) => (
                                <TouchableOpacity
                                    key={teacher.teacher_id || (teacher as any).id || (teacher as any).staff_id || `teacher-${index}`}
                                    style={[
                                        styles.teacherItem,
                                        String(teacherId) === String(teacher.teacher_id) && styles.teacherItemSelected,
                                    ]}
                                    onPress={() => {
                                        setTeacherId(teacher.teacher_id);
                                        setShowTeacherModal(false);
                                    }}
                                >
                                    <View style={styles.teacherItemAvatar}>
                                        <Text style={styles.teacherItemAvatarText}>
                                            {teacher.teacher_full_name.charAt(0)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.teacherItemName}>{teacher.teacher_full_name}</Text>
                                        {teacher.subject && <Text style={styles.teacherItemSubject}>{teacher.subject}</Text>}
                                    </View>
                                    {String(teacherId) === String(teacher.teacher_id) && (
                                        <Icon name="check" size={20} color={C.colors.blue} style={styles.checkIcon} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlayCenter}>
                    <View style={styles.successModal}>
                        <View style={styles.successIconContainer}>
                            <Icon name="check-circle" size={48} color={C.colors.success} />
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
        backgroundColor: C.colors.background,
    },
    header: {
        backgroundColor: C.colors.primary,
        paddingHorizontal: Theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: C.colors.card,
        fontSize: 17,
        fontWeight: '700',
    },
    headerSubtitle: {
        display: 'none',
    },
    notificationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.colors.card + '1F', // ~0.12 opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshWrapper: {
        display: 'none',
    },
    refreshPill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    refreshPillText: {
        ...Theme.typography.caption,
    },
    contentContainer: {
        paddingBottom: 40,
        paddingTop: Theme.spacing.md,
        paddingHorizontal: 12,
    },
    formCard: {
        backgroundColor: C.colors.card,
        borderRadius: 12,
        padding: Theme.spacing.md,
        ...C.shadow.sm,
        marginTop: 10,
    },
    cardTitle: {
        ...Theme.typography.body,
        fontWeight: '700',
        color: C.colors.text,
        marginBottom: Theme.spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        ...Theme.typography.body,
        color: C.colors.textSec,
        marginBottom: Theme.spacing.sm,
        fontWeight: '500',
    },
    toggleContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    toggleButton: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.colors.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: C.colors.blue,
    },
    toggleButtonText: {
        color: C.colors.blue,
        fontWeight: '600',
    },
    toggleButtonTextActive: {
        color: C.colors.card,
    },
    dropdownButton: {
        height: 52,
        backgroundColor: C.colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md,
    },
    dropdownText: {
        ...Theme.typography.bodyMd,
        color: C.colors.text,
    },
    autoTeacherCard: {
        minHeight: 52,
        backgroundColor: C.colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.colors.blueLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: 12,
    },
    autoTeacherTextBlock: {
        flex: 1,
        paddingRight: 12,
    },
    autoTeacherHint: {
        marginTop: Theme.spacing.xs,
        ...Theme.typography.caption,
        color: C.colors.textSec,
    },
    dropdownPlaceholder: {
        color: C.colors.textMuted,
    },
    inputField: {
        height: 52,
        backgroundColor: C.colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md,
    },
    inputText: {
        ...Theme.typography.bodyMd,
        color: C.colors.text,
    },
    textInputArea: {
        backgroundColor: C.colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.colors.border,
        padding: Theme.spacing.md,
        ...Theme.typography.bodyMd,
        color: C.colors.text,
        minHeight: 120,
    },
    submitBtn: {
        backgroundColor: C.colors.blue,
        height: 54,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitIcon: {
        marginRight: 10,
        transform: [{ rotate: '-45deg' }, { translateY: -2 }],
    },
    submitBtnText: {
        color: C.colors.card,
        ...Theme.typography.h4,
    },
    historyCardContainer: {
        backgroundColor: C.colors.card,
        marginTop: 15,
        borderRadius: 12,
        padding: Theme.spacing.md,
        ...C.shadow.sm,
    },
    emptyHistoryState: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    illustrationPlaceholder: {
        width: 150,
        height: 120,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illuLayer1: {
        width: 100,
        height: 100,
        backgroundColor: C.colors.backgroundAlt,
        borderRadius: 50,
        position: 'absolute',
    },
    illuLayer2: {
        width: 80,
        height: 80,
        backgroundColor: C.colors.border,
        borderRadius: 40,
        position: 'absolute',
        opacity: 0.5,
    },
    illuLayer3: {
        width: 60,
        height: 60,
        backgroundColor: C.colors.card,
        borderRadius: 30,
        position: 'absolute',
        ...C.shadow.sm,
    },
    illuIcon: {
        zIndex: 1,
    },
    emptyHistoryTitle: {
        ...Theme.typography.h4,
        color: C.colors.text,
        marginBottom: Theme.spacing.sm,
    },
    emptyHistorySubtitle: {
        fontSize: 13,
        color: C.colors.textSec,
        textAlign: 'center',
    },
    viewMoreBtn: {
        marginTop: Theme.spacing.sm,
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.colors.border,
        backgroundColor: C.colors.card,
    },
    viewMoreText: {
        fontSize: 13,
        fontWeight: '700',
        color: C.colors.blue,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: C.colors.text + '80', // 0.5 opacity
        justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: C.colors.text + '80', // 0.5 opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    teacherModalContent: {
        backgroundColor: C.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: C.colors.border,
    },
    modalTitle: {
        ...Theme.typography.h3,
        color: C.colors.text,
    },
    teacherList: {
        padding: 20,
    },
    teacherItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.colors.backgroundAlt,
    },
    teacherItemSelected: {
        backgroundColor: C.colors.blueLight,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: -12,
    },
    teacherItemAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.colors.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Theme.spacing.md,
    },
    teacherItemAvatarText: {
        color: C.colors.card,
        ...Theme.typography.h3,
    },
    teacherItemName: {
        ...Theme.typography.bodyMd,
        fontWeight: '600',
        color: C.colors.text,
    },
    teacherItemSubject: {
        fontSize: 13,
        color: C.colors.textSec,
        marginTop: 2,
    },
    checkIcon: {
        marginLeft: 'auto',
    },
    successModal: {
        backgroundColor: C.colors.card,
        borderRadius: 24,
        padding: Theme.spacing.lg,
        alignItems: 'center',
        width: width * 0.8,
    },
    successIconContainer: {
        marginBottom: Theme.spacing.md,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: C.colors.text,
        marginBottom: Theme.spacing.sm,
    },
    successMessage: {
        ...Theme.typography.body,
        color: C.colors.textSec,
        textAlign: 'center',
        lineHeight: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    badgeApproved: {
        backgroundColor: C.colors.successBg,
    },
    badgeRejected: {
        backgroundColor: C.colors.errorBg,
    },
    badgePending: {
        backgroundColor: C.colors.warningBg,
    },
    badgeText: {
        ...Theme.typography.label,
        fontWeight: 'bold',
    },
    badgeTextApproved: {
        color: C.colors.success,
    },
    badgeTextRejected: {
        color: C.colors.error,
    },
    badgeTextPending: {
        color: C.colors.warning,
    },
    historyCard: {
        backgroundColor: C.colors.cardAlt,
        borderRadius: 16,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.md,
        borderWidth: 1,
        borderColor: C.colors.border,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme.spacing.md,
    },
    historyTeacherInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyTeacherAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: C.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyTeacherAvatarText: {
        color: C.colors.textSec,
        ...Theme.typography.h4,
    },
    historyTeacherName: {
        ...Theme.typography.body,
        fontWeight: 'bold',
        color: C.colors.text,
    },
    historyDuration: {
        ...Theme.typography.caption,
        color: C.colors.textSec,
        marginTop: 2,
    },
    historyCardBody: {
        gap: 10,
    },
    historyDateRange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyDateText: {
        fontSize: 13,
        color: C.colors.text,
    },
    historyReason: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    historyReasonText: {
        fontSize: 13,
        color: C.colors.textSec,
        lineHeight: 18,
        flex: 1,
    },
    historyFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: C.colors.border,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    viewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    viewDetailsText: {
        fontSize: 13,
        color: C.colors.blue,
        fontWeight: '600',
    },
    detailCard: {
        backgroundColor: C.colors.card,
    },
    detailStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    detailDateText: {
        ...Theme.typography.caption,
        color: C.colors.textMuted,
    },
    detailInfoSection: {
        marginBottom: 20,
    },
    detailLabel: {
        ...Theme.typography.label,
        fontWeight: 'bold',
        color: C.colors.textMuted,
        marginBottom: Theme.spacing.sm,
        letterSpacing: 0.5,
    },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    detailValueText: {
        ...Theme.typography.bodyMd,
        color: C.colors.text,
        fontWeight: '600',
    },
    detailSubValueText: {
        ...Theme.typography.caption,
        color: C.colors.textMuted,
        marginTop: 2,
    },
    detailAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: C.colors.blueLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailAvatarText: {
        color: C.colors.blue,
        ...Theme.typography.h4,
    },
    detailDurationText: {
        fontSize: 13,
        color: C.colors.blue,
        fontWeight: '600',
    },
    detailReasonBox: {
        backgroundColor: C.colors.background,
        padding: Theme.spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.colors.border,
    },
    detailReasonText: {
        ...Theme.typography.body,
        color: C.colors.text,
        lineHeight: 20,
    },
    modalCloseBtn: {
        margin: 20,
        backgroundColor: C.colors.backgroundAlt,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtnText: {
        color: C.colors.textSec,
        ...Theme.typography.h4,
    },
});
