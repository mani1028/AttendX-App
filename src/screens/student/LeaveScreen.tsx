import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCw } from 'lucide-react-native';
import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { getTeachersForLeave, getLeaveRequests, submitLeaveRequest } from '../../services/studentService';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { resolveApiErrorMessage } from '../../utils/helpers';
import {
    leaveStyles,
    LeaveApplyForm,
    LeaveHistorySection,
    LeaveDetailModal,
    TeacherSelectModal,
    LeaveSuccessModal,
    getAutoSelectedTeacher,
    getSchoolCode,
    getStudentId,
    getParentId,
    formatDate,
    type Teacher,
    type LeaveRequest,
    type LeaveType,
} from '../../components/student/leave';

export default function LeaveScreen({ navigation }: any) {
    const handleScroll = useScrollTabBar();
    const isMounted = useRef(true);
    const initialHistoryLimit = 10;

    const [schoolCode, setSchoolCode] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [parentId, setParentId] = useState<string>('');

    const [leaveType, setLeaveType] = useState<LeaveType>('ONE_DAY');
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [reason, setReason] = useState<string>('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [history, setHistory] = useState<LeaveRequest[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

    const [showFromDatePicker, setShowFromDatePicker] = useState<boolean>(false);
    const [showToDatePicker, setShowToDatePicker] = useState<boolean>(false);

    useEffect(() => {
        isMounted.current = true;
        const loadInitialData = async () => {
            const code = await getSchoolCode();
            const sid = await getStudentId();
            const pid = await getParentId();
            if (!isMounted.current) {
                return;
            }
            setSchoolCode(code);
            setStudentId(sid);
            setParentId(pid);

            if (sid) {
                try {
                    const cachedTeachers = await AsyncStorage.getItem(`teachers_cache_${sid}`);
                    if (cachedTeachers && isMounted.current) {
                        setTeachers(JSON.parse(cachedTeachers));
                    }

                    const cachedHistory = await AsyncStorage.getItem(`leave_history_cache_${sid}`);
                    if (cachedHistory && isMounted.current) {
                        setHistory(JSON.parse(cachedHistory));
                    }
                } catch {
                    console.log('Failed to load leave cache');
                }
            }
        };
        loadInitialData();
        return () => {
            isMounted.current = false;
        };
    }, []);

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
        if (!studentId) {
            return;
        }

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
        if (!studentId) {
            return;
        }

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
                Alert.alert('Error', resolveApiErrorMessage(error, 'Failed to submit leave request'));
            }
        } finally {
            if (isMounted.current) {
                setSubmitting(false);
            }
        }
    };

    const onFromDateChange = (_event: unknown, selectedDate?: Date) => {
        setShowFromDatePicker(false);
        if (selectedDate) {
            setFromDate(selectedDate);
            if (!toDate || selectedDate > toDate) {
                setToDate(null);
            }
        }
    };

    const onToDateChange = (_event: unknown, selectedDate?: Date) => {
        setShowToDatePicker(false);
        if (selectedDate) {
            setToDate(selectedDate);
        }
    };

    const handleTeacherPress = () => {
        if (teachers.length > 0) {
            setShowTeacherModal(true);
        } else {
            Alert.alert('No teachers', 'No class teacher is available yet. Please try again later.');
        }
    };

    const selectedTeacher = teachers.find((t) => String(t.teacher_id) === String(teacherId));
    const canGoBack = navigation.canGoBack();

    return (
        <View style={leaveStyles.container}>
            <ScrollView
                style={innerPageLayoutStyles.scrollViewFront}
                contentContainerStyle={innerPageLayoutStyles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.colors.primary} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
                title="Leave Requests"
                subtitle={`${history.length} record${history.length === 1 ? '' : 's'}`}
                onBackPress={() => (canGoBack ? navigation.goBack() : navigation.navigate('MainTabs'))}
                showBack={canGoBack}
                rightActions={
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={heroHeaderStyles.iconBtn}
                        onPress={refreshAll}
                        accessibilityLabel="Refresh leave requests"
                    >
                        <RefreshCw size={20} color={Theme.colors.card} />
                    </TouchableOpacity>
                }
            />
                <View style={leaveStyles.pageBody}>
                    <LeaveApplyForm
                        leaveType={leaveType}
                        onLeaveTypeChange={setLeaveType}
                        selectedTeacher={selectedTeacher}
                        onTeacherPress={handleTeacherPress}
                        fromDate={fromDate}
                        toDate={toDate}
                        reason={reason}
                        onReasonChange={setReason}
                        showFromDatePicker={showFromDatePicker}
                        showToDatePicker={showToDatePicker}
                        onShowFromDatePicker={() => setShowFromDatePicker(true)}
                        onShowToDatePicker={() => setShowToDatePicker(true)}
                        onFromDateChange={onFromDateChange}
                        onToDateChange={onToDateChange}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                    />

                    <LeaveHistorySection
                        history={history}
                        showAllHistory={showAllHistory}
                        initialHistoryLimit={initialHistoryLimit}
                        onViewRequest={(request) => {
                            setSelectedRequest(request);
                            setShowDetailModal(true);
                        }}
                        onViewMore={handleViewMoreHistory}
                    />
                </View>
            </ScrollView>

            <LeaveDetailModal
                visible={showDetailModal}
                request={selectedRequest}
                onClose={() => setShowDetailModal(false)}
            />

            <TeacherSelectModal
                visible={showTeacherModal}
                teachers={teachers}
                teacherId={teacherId}
                onSelect={(id) => {
                    setTeacherId(id);
                    setShowTeacherModal(false);
                }}
                onClose={() => setShowTeacherModal(false)}
            />

            <LeaveSuccessModal visible={showSuccessModal} />
        </View>
    );
}
