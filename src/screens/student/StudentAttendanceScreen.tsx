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
    StatusBar,
    Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStudentAttendanceByMonth } from '../../services/studentService';
import Icon from '@react-native-vector-icons/feather';

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
        percentage: '0'
    });

    const isMounted = useRef(true);

    const loadAttendance = useCallback(async (month: Date, showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const monthStr = (month.getMonth() + 1).toString().padStart(2, '0');
            const yearStr = month.getFullYear().toString();

            const data = await getStudentAttendanceByMonth(monthStr, yearStr);
            if (!isMounted.current) return;
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
            if (curr.status === 'PRESENT') acc.present++;
            else if (curr.status === 'ABSENT') acc.absent++;
            else if (curr.status === 'LATE') acc.late++;
            else if (curr.status === 'LEAVE') acc.leave++;
            else if (curr.status === 'HOLIDAY') acc.holiday++;
            return acc;
        }, { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 });

        const total = stats.present + stats.absent + stats.late + stats.leave;
        const percentage = total > 0 ? ((stats.present + stats.late) / total * 100).toFixed(1) : '0';

        setStats({
            total,
            ...stats,
            percentage
        });
    };

    const markedDates = useMemo(() => {
        const marked: any = {};
        attendance.forEach(item => {
            let color = '#E2E8F0';
            let textColor = '#64748B';

            switch (item.status) {
                case 'PRESENT':
                    color = '#DCFCE7';
                    textColor = '#166534';
                    break;
                case 'ABSENT':
                    color = '#FEE2E2';
                    textColor = '#991B1B';
                    break;
                case 'LATE':
                    color = '#FEF3C7';
                    textColor = '#92400E';
                    break;
                case 'LEAVE':
                    color = '#DBEAFE';
                    textColor = '#1E40AF';
                    break;
                case 'HOLIDAY':
                    color = '#F1F5F9';
                    textColor = '#475569';
                    break;
            }

            marked[item.date] = {
                customStyles: {
                    container: {
                        backgroundColor: color,
                        borderRadius: 8,
                        elevation: 1,
                    },
                    text: {
                        color: textColor,
                        fontWeight: 'bold',
                    }
                }
            };
        });

        // Highlight selected date
        if (marked[selectedDate]) {
            marked[selectedDate].customStyles.container.borderWidth = 2;
            marked[selectedDate].customStyles.container.borderColor = '#3B82F6';
        } else {
            marked[selectedDate] = {
                customStyles: {
                    container: {
                        borderWidth: 2,
                        borderColor: '#3B82F6',
                        borderRadius: 8,
                    },
                    text: {
                        color: '#3B82F6',
                        fontWeight: 'bold',
                    }
                }
            };
        }

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
            <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Attendance History</Text>
                </View>
                <TouchableOpacity
                    style={styles.headerRight}
                    onPress={onRefresh}
                >
                    <Icon name="refresh-cw" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
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
                            <View style={[styles.statDot, { backgroundColor: '#22C55E' }]} />
                            <Text style={styles.statLabel}>Present:</Text>
                            <Text style={styles.statValue}>{stats.present + stats.late}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.statLabel}>Absent:</Text>
                            <Text style={styles.statValue}>{stats.absent}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
                            <Text style={styles.statLabel}>On Leave:</Text>
                            <Text style={styles.statValue}>{stats.leave}</Text>
                        </View>
                    </View>
                </View>

                {/* Calendar Card */}
                <View style={styles.calendarCard}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={day => setSelectedDate(day.dateString)}
                        onMonthChange={handleMonthChange}
                        markingType={'custom'}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#64748B',
                            selectedDayBackgroundColor: '#3B82F6',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#3B82F6',
                            dayTextColor: '#1E293B',
                            textDisabledColor: '#CBD5E1',
                            dotColor: '#3B82F6',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#3B82F6',
                            monthTextColor: '#1E293B',
                            textDayFontWeight: '500',
                            textMonthFontWeight: '700',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12,
                        }}
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
                                year: 'numeric'
                            })}
                        </Text>
                    </View>

                    <View style={styles.statusBox}>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>Attendance Status</Text>
                            <Text style={[styles.statusValue, {
                                color: getStatusText(selectedDate) === 'PRESENT' ? '#22C55E' :
                                       getStatusText(selectedDate) === 'ABSENT' ? '#EF4444' :
                                       getStatusText(selectedDate) === 'LATE' ? '#F59E0B' :
                                       getStatusText(selectedDate) === 'LEAVE' ? '#3B82F6' : '#64748B'
                            }]}>
                                {getStatusText(selectedDate)}
                            </Text>
                        </View>
                        <View style={[styles.statusIndicator, {
                            backgroundColor: getStatusText(selectedDate) === 'PRESENT' ? '#22C55E' :
                                            getStatusText(selectedDate) === 'ABSENT' ? '#EF4444' :
                                            getStatusText(selectedDate) === 'LATE' ? '#F59E0B' :
                                            getStatusText(selectedDate) === 'LEAVE' ? '#3B82F6' : '#64748B'
                        }]} />
                    </View>
                </View>

                <View style={styles.legendCard}>
                    <Text style={styles.legendTitle}>LEGEND</Text>
                    <View style={styles.legendGrid}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#DCFCE7' }]} />
                            <Text style={styles.legendText}>Present</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FEE2E2' }]} />
                            <Text style={styles.legendText}>Absent</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FEF3C7' }]} />
                            <Text style={styles.legendText}>Late</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#DBEAFE' }]} />
                            <Text style={styles.legendText}>Leave</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {loading && !refreshing && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#001F3F',
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerRight: {
        width: 40,
        height: 40,
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
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
    },
    percentageCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    percentageLabel: {
        fontSize: 10,
        color: '#64748B',
    },
    statsDivider: {
        width: 1,
        height: 60,
        backgroundColor: '#E2E8F0',
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
        marginRight: 8,
    },
    statLabel: {
        fontSize: 13,
        color: '#64748B',
        flex: 1,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    calendarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    detailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 10,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    detailsDate: {
        fontSize: 13,
        color: '#64748B',
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 15,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    legendTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94A3B8',
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
        marginRight: 8,
    },
    legendText: {
        fontSize: 13,
        color: '#475569',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
