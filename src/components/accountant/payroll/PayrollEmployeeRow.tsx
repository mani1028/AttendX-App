import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { fmt, formatDesignation } from './helpers';
import type { Attendance, Employee, PayrollResult } from './types';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  emp: Employee;
  att?: Attendance;
  result?: PayrollResult;
  mode: string;
  isPeriodFuture: boolean;
  attFetched: boolean;
  downloading: boolean;
  onGenerate: () => void;
  onView: () => void;
  onDownload: () => void;
  onRecalculate: () => void;
};

export default function PayrollEmployeeRow({
  emp,
  att,
  result,
  mode,
  isPeriodFuture,
  attFetched,
  downloading,
  onGenerate,
  onView,
  onDownload,
  onRecalculate,
}: Props) {
  const isGen = !!result;

  return (
    <View style={[styles.employeeCard, isGen && styles.employeeCardGenerated]}>
      <View style={styles.employeeInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(emp.teacher_full_name || 'T').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.employeeTextBlock}>
          <Text style={styles.employeeNameText} numberOfLines={1}>{emp.teacher_full_name}</Text>
          <Text style={styles.employeeIdText} numberOfLines={1}>
            {emp.employee_id} · {formatDesignation(emp.designation)}
          </Text>
        </View>
      </View>
      <View style={styles.employeeStatsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Salary</Text>
          <Text style={styles.statValue}>₹{fmt(emp.salary_amount || 0)}</Text>
        </View>
        {att ? (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={[styles.statValue, styles.statValueGreen]}>{att.present_days ?? '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>LOP</Text>
              <Text style={[styles.statValue, styles.statValueRed]}>{att.lop_days ?? att.absent_days ?? '—'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Work Days</Text>
              <Text style={styles.statValue}>{att.applicable_working_days ?? '—'}</Text>
            </View>
          </>
        ) : null}
        {isGen && result ? (
          <>
            {mode === 'corporate' ? (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Gross</Text>
                <Text style={styles.statValue}>₹{fmt(result.gross)}</Text>
              </View>
            ) : null}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Net Pay</Text>
              <Text style={[styles.statValue, styles.statValueBold]}>₹{fmt(result.net)}</Text>
            </View>
          </>
        ) : null}
      </View>
      <View style={styles.employeeActionsRow}>
        {!isGen ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.generateEmpButton}
            onPress={onGenerate}
            disabled={isPeriodFuture || !attFetched}
          >
            <Text style={styles.generateEmpButtonText}>Generate</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtonsGroup}>
            <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.viewBtn]} onPress={onView}>
              <Text style={styles.actionBtnText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.pdfBtn]} onPress={onDownload} disabled={downloading}>
              {downloading ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <Text style={[styles.actionBtnText, styles.actionBtnTextLight]}>PDF</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.recalcBtn]} onPress={onRecalculate}>
              <Text style={styles.recalcBtnText}>⟳</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
