import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Theme, colors } from '../../theme/tokens';
import { RootStackParamList } from '../../navigation/types';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import {
  ChevronLeft,
  Building2,
  BookOpen,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react-native';

interface SchoolManualAttendance {
  id: string;
  schoolName: string;
  manualAttendanceEnabled: boolean;
  classCount: number;
  totalStudents: number;
}

const MOCK_DATA: SchoolManualAttendance[] = [
  {
    id: '1',
    schoolName: 'Sunrise Academy',
    manualAttendanceEnabled: true,
    classCount: 12,
    totalStudents: 420,
  },
  {
    id: '2',
    schoolName: 'Green Valley School',
    manualAttendanceEnabled: false,
    classCount: 8,
    totalStudents: 280,
  },
  {
    id: '3',
    schoolName: 'Lighthouse Public School',
    manualAttendanceEnabled: true,
    classCount: 15,
    totalStudents: 560,
  },
  {
    id: '4',
    schoolName: 'Horizon International',
    manualAttendanceEnabled: true,
    classCount: 10,
    totalStudents: 350,
  },
  {
    id: '5',
    schoolName: 'Crescent Moon Academy',
    manualAttendanceEnabled: false,
    classCount: 6,
    totalStudents: 190,
  },
  {
    id: '6',
    schoolName: 'Royal Oak School',
    manualAttendanceEnabled: false,
    classCount: 9,
    totalStudents: 310,
  },
  {
    id: '7',
    schoolName: 'Silver Bells Academy',
    manualAttendanceEnabled: true,
    classCount: 14,
    totalStudents: 490,
  },
];

export default function ManualAttendanceManagerScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [schools, setSchools] = useState<SchoolManualAttendance[]>(MOCK_DATA);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const enabledCount = schools.filter(s => s.manualAttendanceEnabled).length;
  const totalCount = schools.length;
  const percentage = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0;

  const toggleManualAttendance = (id: string) => {
    setSchools(prev =>
      prev.map(s =>
        s.id === id ? { ...s, manualAttendanceEnabled: !s.manualAttendanceEnabled } : s
      )
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText variant="h3" weight="bold" style={styles.headerTitle}>
          Manual Attendance
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconBox}>
              <BarChart3 size={22} color={Theme.colors.primary} />
            </View>
            <AppText variant="h4" weight="bold">Summary</AppText>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <AppText variant="h2" weight="extrabold" style={{ color: Theme.colors.success }}>
                {enabledCount}
              </AppText>
              <AppText variant="caption" muted>Enabled</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <AppText variant="h2" weight="extrabold" style={{ color: Theme.colors.text }}>
                {totalCount}
              </AppText>
              <AppText variant="caption" muted>Total Schools</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <AppText variant="h2" weight="extrabold" style={{ color: Theme.colors.primary }}>
                {percentage}%
              </AppText>
              <AppText variant="caption" muted>Rate</AppText>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
        </AppCard>

        {schools.map(school => (
          <AppCard key={school.id} style={styles.schoolCard}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <View style={[
                  styles.iconBox,
                  { backgroundColor: school.manualAttendanceEnabled ? Theme.colors.successBg : Theme.colors.cardAlt },
                ]}>
                  <ClipboardCheck
                    size={20}
                    color={school.manualAttendanceEnabled ? Theme.colors.success : Theme.colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="h4" weight="bold">{school.schoolName}</AppText>
                  <View style={styles.metaRow}>
                    <BookOpen size={12} color={Theme.colors.textMuted} />
                    <AppText variant="caption" muted> {school.classCount} classes · {school.totalStudents} students</AppText>
                  </View>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.statusDotRow}>
                  {school.manualAttendanceEnabled ? (
                    <CheckCircle2 size={14} color={Theme.colors.success} />
                  ) : (
                    <XCircle size={14} color={Theme.colors.error} />
                  )}
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={{ color: school.manualAttendanceEnabled ? Theme.colors.success : Theme.colors.error }}
                  >
                    {school.manualAttendanceEnabled ? 'On' : 'Off'}
                  </AppText>
                </View>
                <Switch
                  value={school.manualAttendanceEnabled}
                  onValueChange={() => toggleManualAttendance(school.id)}
                  trackColor={{ false: Theme.colors.border, true: Theme.colors.successBg }}
                  thumbColor={school.manualAttendanceEnabled ? Theme.colors.success : Platform.OS === 'ios' ? '#fff' : Theme.colors.textMuted}
                />
              </View>
            </View>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
  },
  headerTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: Theme.spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: Theme.colors.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: Theme.colors.cardAlt,
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
  },
  schoolCard: {
    marginBottom: Theme.spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
