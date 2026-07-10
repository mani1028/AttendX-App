import React from 'react';
import { View, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { AssignedClass, ClassOption, TeacherData } from './types';
import { attendanceStyles as styles } from './styles';

interface TeacherVerifiedStepProps {
  teacherData: TeacherData;
  teacherImage: string | null;
  assignedClasses: AssignedClass[];
  assignedClassOptions: ClassOption[];
  selectedClassKey: string;
  isClassTeacher: boolean;
  onSelectClass: (opt: ClassOption) => void;
  onContinue: () => void;
  onDashboard: () => void;
  onReset: () => void;
}

export default function TeacherVerifiedStep({
  teacherData,
  teacherImage,
  assignedClasses,
  assignedClassOptions,
  selectedClassKey,
  isClassTeacher,
  onSelectClass,
  onContinue,
  onDashboard,
  onReset,
}: TeacherVerifiedStepProps) {
  return (
    <AppCard style={styles.mainCard}>
      <View style={styles.cardHeader}>
        <CheckCircle2 size={20} color={Theme.colors.success} />
        <AppText style={styles.cardTitle}>Teacher Verified</AppText>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.teacherInfo}>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>Name</AppText>
            <AppText style={styles.infoValue}>{teacherData.teacher_full_name}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>Employee ID</AppText>
            <AppText style={styles.infoValue}>{teacherData.employee_id}</AppText>
          </View>
        </View>

        {teacherImage && (
          <View style={{
            marginTop: Theme.spacing.md,
            marginBottom: Theme.spacing.md,
            padding: Theme.spacing.md,
            backgroundColor: Theme.colors.successBg,
            borderRadius: Theme.radius.md,
            borderWidth: 1.5,
            borderColor: Theme.colors.success,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: Theme.radius.lg, backgroundColor: Theme.colors.success, alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} color={Theme.colors.card} />
              </View>
              <View>
                <AppText style={{ ...Theme.typography.body, fontWeight: '800', color: Theme.colors.green }}>Teacher Verification Image</AppText>
                <AppText style={{ ...Theme.typography.caption, color: Theme.colors.success, marginTop: 2 }}>
                  Captured for {teacherData.teacher_full_name} verification
                </AppText>
              </View>
            </View>
            <Image
              source={{ uri: teacherImage }}
              style={{ width: '100%', height: 200, borderRadius: Theme.radius.sm, borderWidth: 2, borderColor: Theme.colors.success, resizeMode: 'cover' }}
            />
          </View>
        )}

        {assignedClasses.length > 0 && (
          <View style={styles.field}>
            <AppText style={styles.label}>Select Assigned Class</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {assignedClassOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.chip, selectedClassKey === opt.key && styles.chipActive]}
                    onPress={() => onSelectClass(opt)}
                  >
                    <AppText style={[styles.chipText, selectedClassKey === opt.key && styles.chipTextActive]}>
                      {opt.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.buttonRow}>
          {isClassTeacher ? (
            <>
              <AppButton title="Continue →" onPress={onContinue} style={StyleSheet.flatten([styles.primaryButton, { flex: 1 }])} />
              <AppButton title="Reset" onPress={onReset} type="secondary" style={{ flex: 1 }} />
            </>
          ) : (
            <>
              <AppButton title="Back to Dashboard" onPress={onDashboard} style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])} />
              <AppButton title="Reset" onPress={onReset} type="secondary" style={{ flex: 1 }} />
            </>
          )}
        </View>
      </View>
    </AppCard>
  );
}
