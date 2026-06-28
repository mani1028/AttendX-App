import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Settings, Video, ClipboardList, Image as ImageIcon } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import * as adminService from '../../services/adminService';
import { useNavigation } from '@react-navigation/native';

type AttendanceModeField =
  | 'enable_manual_attendance'
  | 'enable_video_attendance'
  | 'enable_photo_attendance';

interface SchoolAttendanceMode {
  id: string;
  school_name?: string;
  name?: string;
  enable_manual_attendance?: boolean;
  enable_video_attendance?: boolean;
  enable_photo_attendance?: boolean;
  daily_sessions?: number;
  attendance_frequency?: number;
}

const ATTENDANCE_MODE_FIELDS: AttendanceModeField[] = [
  'enable_manual_attendance',
  'enable_video_attendance',
  'enable_photo_attendance',
];

const getAttendanceFrequency = (school: SchoolAttendanceMode): number => {
  const value = Number(school.attendance_frequency ?? school.daily_sessions ?? 1);
  return value === 2 ? 2 : 1;
};

export default function ManualAttendanceManagerScreen() {
  const navigation = useNavigation();
  const [schools, setSchools] = useState<SchoolAttendanceMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadSchools = useCallback(async () => {
    try {
      const data = await adminService.getAllAttendanceModes();
      setSchools(data);
    } catch {
      Alert.alert('Error', 'Failed to load attendance settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const updateSchool = async (
    schoolId: string,
    payload: Record<string, unknown>,
    optimisticPatch: Partial<SchoolAttendanceMode>,
  ) => {
    setSavingId(schoolId);
    try {
      const result = await adminService.updateSchoolAttendanceSettings(schoolId, payload);
      setSchools(prev =>
        prev.map(s =>
          String(s.id) === String(schoolId)
            ? { ...s, ...optimisticPatch, ...result }
            : s,
        ),
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update setting');
    } finally {
      setSavingId(null);
    }
  };

  const toggleMode = async (school: SchoolAttendanceMode, field: AttendanceModeField, current: boolean) => {
    const schoolId = String(school.id);
    const nextValue = !current;

    const payload: Record<string, unknown> = {
      [field]: nextValue,
    };

    const optimisticPatch: Partial<SchoolAttendanceMode> = {
      [field]: nextValue,
    };

    if (nextValue) {
      ATTENDANCE_MODE_FIELDS.forEach(modeField => {
        if (modeField !== field) {
          payload[modeField] = false;
          optimisticPatch[modeField] = false;
        }
      });
    }

    await updateSchool(schoolId, payload, optimisticPatch);
  };

  const setFrequency = async (school: SchoolAttendanceMode, frequency: 1 | 2) => {
    const schoolId = String(school.id);
    if (getAttendanceFrequency(school) === frequency) { return; }

    await updateSchool(
      schoolId,
      { attendance_frequency: frequency },
      { attendance_frequency: frequency, daily_sessions: frequency },
    );
  };

  const manualCount = schools.filter(s => s.enable_manual_attendance).length;
  const videoCount = schools.filter(s => s.enable_video_attendance).length;
  const photoCount = schools.filter(s => s.enable_photo_attendance).length;

  return (
    <View style={styles.container}>
      <StandardPageHeader title="Attendance Settings" onBackPress={() => navigation.goBack()} />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSchools();
            }}
          />
        }
      >
        <AppCard style={styles.noteCard}>
          <AppText style={styles.noteText}>
            Only one attendance mode can be active per school. Set how many times attendance is taken each day (1 or 2).
          </AppText>
        </AppCard>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard}>
            <AppText style={styles.statLabel}>Manual</AppText>
            <AppText weight="bold" style={styles.statValue}>{manualCount}</AppText>
          </AppCard>
          <AppCard style={styles.statCard}>
            <AppText style={styles.statLabel}>Video</AppText>
            <AppText weight="bold" style={styles.statValue}>{videoCount}</AppText>
          </AppCard>
          <AppCard style={styles.statCard}>
            <AppText style={styles.statLabel}>Photo</AppText>
            <AppText weight="bold" style={styles.statValue}>{photoCount}</AppText>
          </AppCard>
          <AppCard style={styles.statCard}>
            <AppText style={styles.statLabel}>Schools</AppText>
            <AppText weight="bold" style={styles.statValue}>{schools.length}</AppText>
          </AppCard>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
        ) : schools.length === 0 ? (
          <AppText style={styles.empty}>No schools found.</AppText>
        ) : (
          schools.map(school => {
            const name = school.school_name || school.name || `School ${school.id}`;
            const isSaving = savingId === String(school.id);
            const frequency = getAttendanceFrequency(school);

            return (
              <AppCard key={String(school.id)} style={styles.schoolCard}>
                <View style={styles.schoolHeader}>
                  <Settings size={18} color={Theme.colors.primary} />
                  <AppText weight="bold" style={styles.schoolName}>{name}</AppText>
                  {isSaving && <ActivityIndicator size="small" color={Theme.colors.primary} />}
                </View>

                <View style={styles.frequencyBlock}>
                  <AppText style={styles.blockTitle}>No. of times per day</AppText>
                  <View style={styles.frequencyRow}>
                    {[1, 2].map(value => {
                      const active = frequency === value;
                      return (
                        <TouchableOpacity
                          key={`freq-${value}`}
                          style={[styles.frequencyChip, active && styles.frequencyChipActive]}
                          onPress={() => setFrequency(school, value as 1 | 2)}
                          disabled={isSaving}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <AppText style={[styles.frequencyChipText, active && styles.frequencyChipTextActive]}>
                            {value} time{value === 2 ? 's' : ''}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <ToggleRow
                  icon={<ClipboardList size={18} color={Theme.colors.textSec} />}
                  label="Manual Attendance"
                  value={Boolean(school.enable_manual_attendance)}
                  onChange={() =>
                    toggleMode(school, 'enable_manual_attendance', Boolean(school.enable_manual_attendance))
                  }
                  disabled={isSaving}
                />
                <ToggleRow
                  icon={<Video size={18} color={Theme.colors.textSec} />}
                  label="Video Attendance"
                  value={Boolean(school.enable_video_attendance)}
                  onChange={() =>
                    toggleMode(school, 'enable_video_attendance', Boolean(school.enable_video_attendance))
                  }
                  disabled={isSaving}
                />
                <ToggleRow
                  icon={<ImageIcon size={18} color={Theme.colors.textSec} />}
                  label="Photo Attendance"
                  value={Boolean(school.enable_photo_attendance)}
                  onChange={() =>
                    toggleMode(school, 'enable_photo_attendance', Boolean(school.enable_photo_attendance))
                  }
                  disabled={isSaving}
                />
              </AppCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        {icon}
        <AppText style={styles.toggleLabel}>{label}</AppText>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: Theme.colors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: 16, paddingBottom: 100 },
  noteCard: { marginBottom: 12, padding: 14, backgroundColor: '#EFF6FF' },
  noteText: { fontSize: 13, lineHeight: 20, color: Theme.colors.textSec },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '48%', flexGrow: 1, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, color: Theme.colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  statValue: { fontSize: 20, color: Theme.colors.text, marginTop: 4 },
  empty: { textAlign: 'center', color: Theme.colors.textMuted, marginTop: 32 },
  schoolCard: { marginBottom: 12, padding: 14 },
  schoolHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  schoolName: { flex: 1, fontSize: 16, color: Theme.colors.text },
  frequencyBlock: {
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  blockTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  frequencyRow: { flexDirection: 'row', gap: 10 },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
  },
  frequencyChipActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  frequencyChipText: { fontSize: 13, fontWeight: '600', color: Theme.colors.textSec },
  frequencyChipTextActive: { color: Theme.colors.primary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderLight,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toggleLabel: { color: Theme.colors.text, fontSize: 14 },
});
