import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { fmt } from './helpers';
import { RupeeInput } from './PayrollFormFields';
import type { HourlyEmployee } from './types';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  emp: HourlyEmployee;
  onRateChange: (teacherId: string, rate: number) => void;
  onFetchHours: (teacherId: string) => void;
};

export default function HoursPayrollRow({ emp, onRateChange, onFetchHours }: Props) {
  return (
    <View style={[styles.hoursRow, emp.gross !== null && styles.hoursRowGenerated]}>
      <View style={styles.hoursHeaderRow}>
        <View style={styles.hoursAvatar}>
          <Text style={styles.hoursAvatarText}>{(emp.teacher_full_name || 'T').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.hoursInfo}>
          <Text style={styles.hoursName}>{emp.teacher_full_name}</Text>
          <Text style={styles.hoursId}>{emp.employee_id || 'Part-Time'}</Text>
        </View>
        {emp.gross !== null ? (
          <View style={styles.hoursGross}>
            <Text style={styles.hoursGross}>₹{fmt(emp.gross)}</Text>
            <Text style={styles.hoursGrossDetail}>{emp.totalHours.toFixed(1)}h × ₹{fmt(emp.hourlyRate)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.hoursBodyRow}>
        <View style={styles.hoursRateCol}>
          <Text style={styles.hoursRateLabel}>Rate / Hour</Text>
          <RupeeInput value={emp.hourlyRate} onChange={(rate) => onRateChange(emp.teacher_id, rate)} />
        </View>
        <View style={styles.hoursStatusCol}>
          <Text style={styles.hoursRateLabel}>Hours Worked</Text>
          {emp.attFetched ? (
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursBadgeText}>{emp.totalHours.toFixed(1)}h</Text>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.fetchHoursButton}
              onPress={() => onFetchHours(emp.teacher_id)}
              disabled={emp.loadingAtt}
            >
              {emp.loadingAtt ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              ) : (
                <Text style={styles.fetchHoursButton}>Fetch Hours</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
