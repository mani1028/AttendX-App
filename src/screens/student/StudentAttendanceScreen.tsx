import { Theme, C } from '../../theme/tokens';
import { useNavigation } from '@react-navigation/native';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStudentAttendanceByMonth } from '../../services/studentService';
import Icon from 'react-native-vector-icons/Feather';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

const { width } = Dimensions.get('window');

interface AttendanceData {
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY';
}

interface MonthlyStats {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    holiday: number;
    percentage: string;
}

export default function StudentAttendanceScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendance, setAttendance] = useState<AttendanceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<MonthlyStats>({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        holiday: 0,
        percentage: '0',
    });

    const isMounted = useRef(true);

    const loadAttendance = useCallback(async (month: Date, showLoader = true) => {
        if (showLoader) {setLoading(true);}
        try {
            const monthStr = (month.getMonth() + 1).toString().padStart(2, '0');
            const yearStr = month.getFullYear().toString();

            const data = await getStudentAttendanceByMonth(monthStr, yearStr);
            if (!isMounted.current) {return;}
            setAttendance(data);
            calculateStats(data);
        } catch (error: any) {
            if (error?.response?.status !== 401) {
                console.error('Failed to load attendance:', error);
                Alert.alert('Error', 'Failed to load attendance data');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        loadAttendance(currentMonth);
        return () => {
            isMounted.current = false;
        };
    }, [currentMonth, loadAttendance]);

    const calculateStats = (data: AttendanceData[]) => {
        const stats = data.reduce((acc, curr) => {
            if (curr.status === 'PRESENT') {acc.present++;}
            else if (curr.status === 'ABSENT') {acc.absent++;}
            else if (curr.status === 'LATE') {acc.late++;}
            else if (curr.status === 'LEAVE') {acc.leave++;}
            else if (curr.status === 'HOLIDAY') {acc.holiday++;}
            return acc;
        }, { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 });

        const total = stats.present + stats.absent + stats.late + stats.leave;
        const percentage = total > 0 ? ((stats.present + stats.late) / total * 100).toFixed(1) : '0';

        setStats({
            total,
            ...stats,
            percentage,
        });
    };

    const attendanceStatusColors: Record<string, string> = {
        PRESENT: C.colors.success,
        ABSENT: C.colors.error,
        LATE: C.colors.warning,
        LEAVE: C.colors.blue,
        HOLIDAY: C.colors.textMuted,
    };

    const markedDates = useMemo(() => {
        const marked: any = {};
        attendance.forEach(item => {
            const isPresent = item.status === 'PRESENT' || item.status === 'LATE';
            const isAbsent = item.status === 'ABSENT';
            const isLeave = item.status === 'LEAVE';

            let bgColor = 'transparent';
            let textColor = C.colors.text;

            if (isPresent) {
                bgColor = C.colors.successBg;
                textColor = C.colors.success;
            } else if (isAbsent) {
                bgColor = C.colors.errorBg;
                textColor = C.colors.error;
            } else if (isLeave) {
                bgColor = C.colors.blueLight;
                textColor = C.colors.blue;
            }

            marked[item.date] = {
                customStyles: {
                    container: {
                        backgroundColor: bgColor,
                        borderRadius: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    text: {
                        color: textColor,
                        fontWeight: '600',
                    },
                },
            };
        });

        // Selected date override
        marked[selectedDate] = {
            ...marked[selectedDate],
            customStyles: {
                container: {
                    backgroundColor: C.colors.primary,
                    borderRadius: 10,
                    elevation: 3,
                    shadowColor: C.colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                text: {
                    color: Theme.colors.card,
                    fontWeight: 'bold',
                },
            },
        };

        return marked;
    }, [attendance, selectedDate]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAttendance(currentMonth, false);
    };

    const handleMonthChange = (monthData: any) => {
        const newDate = new Date(monthData.year, monthData.month - 1);
        setCurrentMonth(newDate);
    };

    const getStatusText = (date: string) => {
        const record = attendance.find(a => a.date === date);
        return record ? record.status : 'NO RECORD';
    };

    return (
        <View style={styles.container}>


            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Attendance History</Text>
                </View>
                <TouchableOpacity
                    style={styles.headerRight}
                    onPress={onRefresh}
                >
                    <Icon name="refresh-cw" size={20} color={HEADER_CONSTANTS.TEXT_COLOR} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />
                }
            >
                {/* Overall Stats Card */}
                <View style={styles.statsOverview}>
                    <View style={styles.percentageCircle}>
                        <Text style={styles.percentageValue}>{stats.percentage}%</Text>
                        <Text style={styles.percentageLabel}>Overall</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsRight}>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: C.colors.success }]} />
                            <Text style={styles.statLabel}>Present:</Text>
                            <Text style={styles.statValue}>{stats.present + stats.late}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: C.colors.error }]} />
                            <Text style={styles.statLabel}>Absent:</Text>
                            <Text style={styles.statValue}>{stats.absent}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: C.colors.blue }]} />
                            <Text style={styles.statLabel}>On Leave:</Text>
                            <Text style={styles.statValue}>{stats.leave}</Text>
                        </View>
                    </View>
                </View>

                {/* Calendar Card */}
                <View style={styles.calendarCard}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                        onMonthChange={handleMonthChange}
                        markingType={'custom'}
                        markedDates={markedDates}
                        enableSwipeMonths={true}
                        hideExtraDays={true}
                        theme={{
                            backgroundColor: C.colors.card,
                            calendarBackground: C.colors.card,
                            textSectionTitleColor: C.colors.textMuted,
                            selectedDayBackgroundColor: C.colors.primary,
                            selectedDayTextColor: C.colors.card,
                            todayTextColor: C.colors.primary,
                            dayTextColor: C.colors.text,
                            textDisabledColor: C.colors.border,
                            dotColor: C.colors.primary,
                            selectedDotColor: C.colors.card,
                            arrowColor: C.colors.primary,
                            monthTextColor: C.colors.text,
                            textDayFontWeight: '500',
                            textMonthFontWeight: '700',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12,
                            todayBackgroundColor: C.colors.primary + '10',
                        }}
                        style={styles.calendar}
                    />
                </View>

                {/* Selected Date Details */}
                <View style={styles.detailsCard}>
                    <View style={styles.detailsHeader}>
                        <Text style={styles.detailsTitle}>Daily Summary</Text>
                        <Text style={styles.detailsDate}>
                            {new Date(selectedDate).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>

                    <View style={styles.statusBox}>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>Attendance Status</Text>
                            <Text style={[styles.statusValue, {
                                color: getStatusText(selectedDate) === 'PRESENT' ? C.colors.success :
                                       getStatusText(selectedDate) === 'ABSENT' ? C.colors.error :
                                       getStatusText(selectedDate) === 'LATE' ? C.colors.warning :
                                       getStatusText(selectedDate) === 'LEAVE' ? C.colors.blue : C.colors.textMuted,
                            }]}>
                                {getStatusText(selectedDate)}
                            </Text>
                        </View>
                        <View style={[styles.statusIndicator, {
                            backgroundColor: getStatusText(selectedDate) === 'PRESENT' ? C.colors.success :
                                            getStatusText(selectedDate) === 'ABSENT' ? C.colors.error :
                                            getStatusText(selectedDate) === 'LATE' ? C.colors.warning :
                                            getStatusText(selectedDate) === 'LEAVE' ? C.colors.blue : C.colors.textMuted,
                        }]} />
                    </View>
                </View>

                <View style={styles.legendCard}>
                    <Text style={styles.legendTitle}>LEGEND</Text>
                    <View style={styles.legendGrid}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.successBg }]} />
                            <Text style={styles.legendText}>Present</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.errorBg }]} />
                            <Text style={styles.legendText}>Absent</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.warningBg }]} />
                            <Text style={styles.legendText}>Late</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.blueLight }]} />
                            <Text style={styles.legendText}>Leave</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {loading && !refreshing && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={C.colors.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.colors.background,
    },
    header: {
        backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
        paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
        height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
        fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
        color: HEADER_CONSTANTS.TEXT_COLOR,
    },
    headerRight: {
        width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
        height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    statsOverview: {
        flexDirection: 'row',
        backgroundColor: C.colors.card,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        ...C.shadow.sm,
        marginBottom: 20,
    },
    percentageCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: C.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageValue: {
        ...Theme.typography.h3,
        color: C.colors.text,
    },
    percentageLabel: {
        fontSize: 10,
        color: C.colors.textMuted,
    },
    statsDivider: {
        width: 1,
        height: 60,
        backgroundColor: C.colors.border,
        marginHorizontal: 25,
    },
    statsRight: {
        flex: 1,
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Theme.spacing.sm,
    },
    statLabel: {
        fontSize: 13,
        color: C.colors.textMuted,
        flex: 1,
    },
    statValue: {
        ...Theme.typography.body,
        fontWeight: '700',
        color: C.colors.text,
    },
    calendarCard: {
        backgroundColor: C.colors.card,
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
        ...C.shadow.sm,
        overflow: 'hidden',
    },
    calendar: {
        borderRadius: 20,
        backgroundColor: C.colors.card,
    },
    detailsCard: {
        backgroundColor: C.colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...C.shadow.sm,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.colors.border,
        paddingBottom: 10,
    },
    detailsTitle: {
        ...Theme.typography.h4,
        color: C.colors.text,
    },
    detailsDate: {
        fontSize: 13,
        color: C.colors.textMuted,
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.colors.background,
        padding: 15,
        borderRadius: 15,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        ...Theme.typography.caption,
        color: C.colors.textMuted,
        marginBottom: Theme.spacing.xs,
    },
    statusValue: {
        ...Theme.typography.h4,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendCard: {
        backgroundColor: C.colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    legendTitle: {
        ...Theme.typography.caption,
        fontWeight: 'bold',
        color: C.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 15,
    },
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '45%',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 4,
        marginRight: Theme.spacing.sm,
    },
    legendText: {
        fontSize: 13,
        color: C.colors.textSec,
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: C.colors.card + 'B3', // 70% opacity
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
