import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { resolveAttendancePct } from './helpers';
import type { Attendance, Employee } from './types';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  employees: Employee[];
  attMap: Record<string, Attendance>;
  wDays: number;
};

export default function AttendanceSummaryTable({ employees, attMap, wDays }: Props) {
  const rows = employees.filter(e => attMap[e.teacher_id]).slice(0, 10);

  return (
    <View style={styles.attSummaryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.attSummaryHeaderRow}>
            <Text style={[styles.attSummaryHeaderCell, styles.attSummaryNameCol]}>Staff</Text>
            <Text style={styles.attSummaryHeaderCell}>Present</Text>
            <Text style={[styles.attSummaryHeaderCell, styles.attSummaryLopCol]}>LOP</Text>
            <Text style={styles.attSummaryHeaderCell}>Casual</Text>
            <Text style={styles.attSummaryHeaderCell}>Sick</Text>
            <Text style={styles.attSummaryHeaderCell}>Paid</Text>
            <Text style={styles.attSummaryHeaderCell}>Comp</Text>
            <Text style={styles.attSummaryHeaderCell}>Att %</Text>
          </View>
          {rows.map(emp => {
            const att = attMap[emp.teacher_id];
            const breakdown = att.leave_breakdown || { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 };
            const pct = resolveAttendancePct(att, att.applicable_working_days || wDays);
            const pctColor = pct >= 80 ? styles.attPctGreen : pct >= 70 ? styles.attPctYellow : styles.attPctRed;
            return (
              <View key={emp.teacher_id} style={styles.attSummaryRow}>
                <View style={styles.attSummaryNameCol}>
                  <Text style={styles.attSummaryName} numberOfLines={1}>{emp.teacher_full_name}</Text>
                  <Text style={styles.attSummaryId}>{emp.employee_id}</Text>
                </View>
                <Text style={[styles.attSummaryCell, styles.attSummaryPresent]}>{att.present_days || 0}</Text>
                <Text style={[styles.attSummaryCell, styles.attSummaryLopCol, styles.attSummaryLop]}>{att.lop_days || 0}</Text>
                <Text style={styles.attSummaryCell}>{breakdown.CASUAL || 0}</Text>
                <Text style={styles.attSummaryCell}>{breakdown.SICK || 0}</Text>
                <Text style={styles.attSummaryCell}>{breakdown.PAID || 0}</Text>
                <Text style={styles.attSummaryCell}>{breakdown.COMP_OFF || 0}</Text>
                <Text style={[styles.attSummaryCell, styles.attSummaryPct, pctColor]}>{pct.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      {employees.length > 10 ? (
        <Text style={styles.attSummaryFootnote}>Showing first 10 of {employees.length} staff</Text>
      ) : null}
    </View>
  );
}
