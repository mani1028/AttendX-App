import { Theme, C } from '../../theme/tokens';
import { useNavigation } from '@react-navigation/native';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import Loader from '../../components/common/Loader';
import { attendanceStatusLabel } from '../../utils/helpers';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getStudentAttendanceByMonth } from '../../services/studentService';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import AppText from '../../components/common/AppText';

interface AttendanceData {
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
}

interface MonthlyStats {
    total: number;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    holiday: number;
    percentage: string;
}

export default function StudentAttendanceScreen() {
    const navigation = useNavigation<any>();
    const handleScroll = useScrollTabBar();
    const canGoBack = navigation.canGoBack();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendance, setAttendance] = useState<AttendanceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<MonthlyStats>({
        total: 0,
        present: 0,
        absent: 0,
        halfDay: 0,
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
            else if (curr.status === 'HALF_DAY') {acc.halfDay++;}
            else if (curr.status === 'LEAVE') {acc.leave++;}
            else if (curr.status === 'HOLIDAY') {acc.holiday++;}
            return acc;
        }, { present: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0 });

        const total = stats.present + stats.absent + stats.halfDay + stats.leave;
        const percentage = total > 0
            ? ((stats.present + stats.halfDay * 0.5) / total * 100).toFixed(1)
            : '0';

        setStats({
            total,
            ...stats,
            percentage,
        });
    };

    const attendanceStatusColors: Record<string, string> = {
        PRESENT: C.colors.success,
        ABSENT: C.colors.error,
        HALF_DAY: C.colors.warning,
        LEAVE: C.colors.blue,
        HOLIDAY: C.colors.textMuted,
    };

    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const shiftMonth = (delta: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const markedDates = useMemo(() => {
        const marked: any = {};
        attendance.forEach(item => {
            let bgColor = 'transparent';
            let textColor = C.colors.text;

            switch (item.status) {
                case 'PRESENT':
                    bgColor = C.colors.successBg;
                    textColor = C.colors.success;
                    break;
                case 'HALF_DAY':
                    bgColor = C.colors.warningBg;
                    textColor = C.colors.warning;
                    break;
                case 'ABSENT':
                    bgColor = C.colors.errorBg;
                    textColor = C.colors.error;
                    break;
                case 'LEAVE':
                    bgColor = C.colors.blueLight;
                    textColor = C.colors.blue;
                    break;
                case 'HOLIDAY':
                    bgColor = C.colors.backgroundAlt;
                    textColor = C.colors.textMuted;
                    break;
                default:
                    break;
            }

            marked[item.date] = {
                customStyles: {
                    container: {
                        backgroundColor: bgColor,
                        borderRadius: Theme.radius.md,
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
                    borderRadius: Theme.radius.md,
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

    const getStatusForDate = (date: string) => {
        const record = attendance.find(a => a.date === date);
        return record?.status ?? '';
    };

    const getStatusLabel = (date: string) => {
        const status = getStatusForDate(date);
        return status ? attendanceStatusLabel(status) : 'No Record';
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
                contentContainerStyle={innerPageLayoutStyles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
                title="My Attendance"
                subtitle={monthLabel}
                onBackPress={canGoBack ? () => navigation.goBack() : undefined}
                showBack={canGoBack}
                rightActions={(
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={heroHeaderStyles.iconBtn}
                        onPress={onRefresh}
                        accessibilityLabel="Refresh attendance"
                    >
                        <RefreshCw size={20} color={Theme.colors.card} />
                    </TouchableOpacity>
                )}
            />
                <View style={styles.pageBody}>
                {/* Month navigation */}
                <View style={styles.monthNav}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.monthNavBtn}
                        onPress={() => shiftMonth(-1)}
                    >
                        <ChevronLeft size={20} color={C.colors.primary} />
                    </TouchableOpacity>
                    <AppText weight="bold" style={styles.monthNavLabel}>{monthLabel}</AppText>
                    <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.monthNavBtn}
                        onPress={() => shiftMonth(1)}
                    >
                        <ChevronRight size={20} color={C.colors.primary} />
                    </TouchableOpacity>
                </View>

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
                            <Text style={styles.statValue}>{stats.present}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: C.colors.warning }]} />
                            <Text style={styles.statLabel}>Half Day:</Text>
                            <Text style={styles.statValue}>{stats.halfDay}</Text>
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
                                color: attendanceStatusColors[getStatusForDate(selectedDate)] || C.colors.textMuted,
                            }]}>
                                {getStatusLabel(selectedDate)}
                            </Text>
                        </View>
                        <View style={[styles.statusIndicator, {
                            backgroundColor: attendanceStatusColors[getStatusForDate(selectedDate)] || C.colors.textMuted,
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
                            <Text style={styles.legendText}>Half Day</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.blueLight }]} />
                            <Text style={styles.legendText}>Leave</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: C.colors.backgroundAlt }]} />
                            <Text style={styles.legendText}>Holiday</Text>
                        </View>
                    </View>
                </View>
                </View>
            </ScrollView>

            {loading && !refreshing && (
                <View style={styles.loaderOverlay}>
                    <Loader size="lg" label="Loading attendance…" />
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
    scrollView: {
        flex: 1,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: C.colors.card,
        borderRadius: Theme.radius.lg,
        paddingVertical: 10,
        paddingHorizontal: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
        ...C.shadow.sm,
    },
    monthNavBtn: {
        width: 40,
        height: 40,
        borderRadius: Theme.radius.xl,
        backgroundColor: C.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthNavLabel: {
        fontSize: Theme.typography.h4.fontSize,
        color: C.colors.text,
    },
    pageBody: {
    },
    statsOverview: {
        flexDirection: 'row',
        backgroundColor: C.colors.card,
        borderRadius: Theme.radius.xl,
        padding: Theme.spacing.xl,
        alignItems: 'center',
        ...C.shadow.sm,
        marginBottom: Theme.spacing.xl,
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
        fontSize: Theme.typography.label.fontSize,
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
        gap: Theme.spacing.sm,
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
        fontSize: Theme.typography.caption.fontSize,
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
        borderRadius: Theme.radius.xl,
        padding: 10,
        marginBottom: Theme.spacing.xl,
        ...C.shadow.sm,
        overflow: 'hidden',
    },
    calendar: {
        borderRadius: Theme.radius.xl,
        backgroundColor: C.colors.card,
    },
    detailsCard: {
        backgroundColor: C.colors.card,
        borderRadius: Theme.radius.xl,
        padding: Theme.spacing.xl,
        marginBottom: Theme.spacing.xl,
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
        fontSize: Theme.typography.caption.fontSize,
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
        borderRadius: Theme.radius.sm,
    },
    legendCard: {
        backgroundColor: C.colors.card,
        borderRadius: Theme.radius.xl,
        padding: Theme.spacing.xl,
        marginBottom: Theme.spacing.xl,
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
        fontSize: Theme.typography.caption.fontSize,
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
