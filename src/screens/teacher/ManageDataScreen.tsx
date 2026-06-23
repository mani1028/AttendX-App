import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Users,
  ClipboardList,
  BookOpen,
  FileText,
  Database,
  Clock,
  RefreshCw,
} from 'lucide-react-native';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

const MOCK_SUMMARY = {
  totalStudents: 248,
  totalRecords: 1853,
  lastSyncTime: '2026-06-23 09:15 AM',
};

interface DataCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  count: string;
}

const DATA_CARDS: DataCard[] = [
  {
    id: 'students',
    icon: <Users size={24} color={Theme.colors.primary} />,
    title: 'Student Data',
    description: 'Manage student profiles, enrollment, and personal details.',
    color: Theme.colors.primary,
    bgColor: '#eef2ff',
    count: '248',
  },
  {
    id: 'attendance',
    icon: <ClipboardList size={24} color={Theme.colors.success} />,
    title: 'Attendance Data',
    description: 'View and edit daily attendance records and reports.',
    color: Theme.colors.success,
    bgColor: '#f0fdf4',
    count: '1,853',
  },
  {
    id: 'marks',
    icon: <BookOpen size={24} color={Theme.colors.warning} />,
    title: 'Marks Data',
    description: 'Manage exam marks, grades, and performance records.',
    color: Theme.colors.warning,
    bgColor: '#fff7ed',
    count: '326',
  },
  {
    id: 'homework',
    icon: <FileText size={24} color={Theme.colors.violet} />,
    title: 'Homework Data',
    description: 'View assigned homework, submissions, and completion rates.',
    color: Theme.colors.violet,
    bgColor: '#ede9fe',
    count: '72',
  },
];

export default function ManageDataScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText weight="bold" style={styles.headerTitle}>Manage Data</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Database size={20} color={Theme.colors.primary} />
            <AppText weight="bold" style={styles.summaryTitle}>Data Overview</AppText>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <AppText weight="bold" style={styles.summaryValue}>{MOCK_SUMMARY.totalStudents}</AppText>
              <AppText style={styles.summaryLabel}>Students</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <AppText weight="bold" style={styles.summaryValue}>{MOCK_SUMMARY.totalRecords.toLocaleString()}</AppText>
              <AppText style={styles.summaryLabel}>Records</AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Clock size={14} color={Theme.colors.textMuted} />
              <AppText style={styles.summaryLabel}>Last Sync</AppText>
              <AppText weight="semibold" style={styles.syncTime}>{MOCK_SUMMARY.lastSyncTime}</AppText>
            </View>
          </View>
        </AppCard>

        <View style={styles.cardsContainer}>
          {DATA_CARDS.map((item) => (
            <AppCard key={item.id} style={styles.dataCard}>
              <View style={styles.dataCardTop}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                  {item.icon}
                </View>
                <View style={[styles.countBadge, { backgroundColor: item.bgColor }]}>
                  <AppText weight="bold" style={[styles.countText, { color: item.color }]}>{item.count}</AppText>
                </View>
              </View>
              <AppText weight="bold" style={styles.dataCardTitle}>{item.title}</AppText>
              <AppText style={styles.dataCardDesc}>{item.description}</AppText>
              <AppButton
                title="Manage"
                type="secondary"
                size="sm"
                onPress={() => {}}
                style={styles.manageBtn}
              />
            </AppCard>
          ))}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: Theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: Theme.spacing.lg,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Theme.colors.border,
  },
  syncTime: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 4,
    fontSize: 11,
  },
  cardsContainer: {
    gap: Theme.spacing.md,
  },
  dataCard: {
    padding: 20,
  },
  dataCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radius.full,
  },
  countText: {
    fontSize: 13,
  },
  dataCardTitle: {
    fontSize: 17,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  dataCardDesc: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
    lineHeight: 20,
  },
  manageBtn: {
    alignSelf: 'flex-start',
  },
});
