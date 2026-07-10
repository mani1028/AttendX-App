import React from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { Calendar } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import {
  getLeaveRemainingForType,
  type LeaveAllocationItem,
  type StaffLeaveBalance,
} from '../../../services/teacherService';
import { leaveRequestStyles as styles } from './leaveRequestStyles';
import { LEAVE_CATEGORY_OPTIONS, formatDateToYMD } from './helpers';

export interface LeaveApplicationFormProps {
  embedded?: boolean;
  leaveType: 'one-day' | 'multiple';
  setLeaveType: (v: 'one-day' | 'multiple') => void;
  allocationType: LeaveAllocationItem['type'];
  setAllocationType: (v: LeaveAllocationItem['type']) => void;
  fromDate: Date | null;
  toDate: Date | null;
  reason: string;
  setReason: (v: string) => void;
  balanceLoading: boolean;
  leaveBalance: StaffLeaveBalance | null;
  submitting: boolean;
  onSubmit: () => void;
  onOpenFromDate: () => void;
  onOpenToDate: () => void;
}

export default function LeaveApplicationForm({
  embedded,
  leaveType,
  setLeaveType,
  allocationType,
  setAllocationType,
  fromDate,
  toDate,
  reason,
  setReason,
  balanceLoading,
  leaveBalance,
  submitting,
  onSubmit,
  onOpenFromDate,
  onOpenToDate,
}: LeaveApplicationFormProps) {
  return (
    <AppCard style={[styles.mainCard, embedded && styles.mainCardEmbedded]} elevated={false} variant="flat">
      <View style={styles.cardHeader}>
        <Calendar size={20} color={Theme.colors.primary} />
        <AppText weight="bold" style={styles.cardTitle}>New Application</AppText>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.typeBtn, leaveType === 'one-day' && styles.typeBtnActive]}
          onPress={() => setLeaveType('one-day')}
        >
          <AppText weight="semibold" style={[styles.typeBtnText, leaveType === 'one-day' && styles.typeBtnTextActive]}>Single Day</AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.typeBtn, leaveType === 'multiple' && styles.typeBtnActive]}
          onPress={() => setLeaveType('multiple')}
        >
          <AppText weight="semibold" style={[styles.typeBtnText, leaveType === 'multiple' && styles.typeBtnTextActive]}>Multiple Days</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <AppText weight="semibold" style={styles.inputLabel}>Leave Type</AppText>
        {balanceLoading ? (
          <AppText style={styles.balanceHint}>Loading leave balance…</AppText>
        ) : null}
        <View style={styles.chipContainer}>
          {LEAVE_CATEGORY_OPTIONS.map((option) => {
            const isLop = option.key === 'LOP';
            const remaining = getLeaveRemainingForType(leaveBalance, option.key);
            const noBalance = !isLop && (remaining ?? 0) <= 0;
            const disabled = balanceLoading || noBalance;
            const chipLabel = isLop
              ? option.label
              : noBalance
                ? option.label
                : `${option.label} (${remaining})`;
            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="button"
                disabled={disabled}
                style={[
                  styles.chip,
                  allocationType === option.key && styles.chipActive,
                  disabled && styles.chipDisabled,
                ]}
                onPress={() => setAllocationType(option.key)}
              >
                <AppText
                  weight="semibold"
                  style={[
                    styles.chipText,
                    allocationType === option.key && styles.chipTextActive,
                    disabled && styles.chipTextDisabled,
                  ]}
                >
                  {chipLabel}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.inputGroup}>
          <AppText weight="semibold" style={styles.inputLabel}>{leaveType === 'one-day' ? 'Date' : 'From Date'}</AppText>
          <TouchableOpacity accessibilityRole="button" style={styles.dateSelector} onPress={onOpenFromDate}>
            <AppText weight="semibold" style={fromDate ? styles.dateValue : styles.datePlaceholder}>
              {fromDate ? formatDateToYMD(fromDate) : 'YYYY-MM-DD'}
            </AppText>
            <Calendar size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {leaveType === 'multiple' && (
          <View style={styles.inputGroup}>
            <AppText weight="semibold" style={styles.inputLabel}>To Date</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.dateSelector} onPress={onOpenToDate}>
              <AppText weight="semibold" style={toDate ? styles.dateValue : styles.datePlaceholder}>
                {toDate ? formatDateToYMD(toDate) : 'YYYY-MM-DD'}
              </AppText>
              <Calendar size={16} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <AppText weight="semibold" style={styles.inputLabel}>Reason for Leave</AppText>
        <TextInput
          style={styles.reasonInput}
          multiline
          numberOfLines={3}
          placeholder="e.g. Family emergency, Medical checkup..."
          placeholderTextColor={Theme.colors.textMuted}
          value={reason}
          onChangeText={setReason}
        />
      </View>

      <AppButton
        title="Submit Application"
        onPress={onSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
      />
    </AppCard>
  );
}
