import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, AlertCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface MarksActionBarProps {
  totalSaved: number;
  totalPending: number;
  totalAbsent: number;
  savingMarks: boolean;
  autoSave: boolean;
  onSave: () => void;
  onToggleAutoSave: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function MarksActionBar({
  totalSaved,
  totalPending,
  totalAbsent,
  savingMarks,
  autoSave,
  onSave,
  onToggleAutoSave,
  onRefresh,
  onExport,
}: MarksActionBarProps) {
  return (
    <View style={styles.actionBar}>
      <View style={styles.statsRow}>
        <View style={[styles.statChip, styles.statSaved]}>
          <CheckCircle2 size={12} color="#15803d" />
          <AppText weight="bold" style={styles.statText}>{totalSaved} Saved</AppText>
        </View>
        <View style={[styles.statChip, styles.statPending]}>
          <AlertCircle size={12} color="#b45309" />
          <AppText weight="bold" style={styles.statText}>{totalPending} Pending</AppText>
        </View>
        <View style={[styles.statChip, styles.statAbsent]}>
          <XCircle size={12} color="#b91c1c" />
          <AppText weight="bold" style={styles.statText}>{totalAbsent} Absent</AppText>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <AppButton
          title={savingMarks ? 'Saving...' : 'Save Marks'}
          onPress={onSave}
          disabled={savingMarks}
          style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])}
        />
        <TouchableOpacity accessibilityRole="button"
          style={[styles.autoSaveBtn, autoSave && styles.autoSaveBtnActive]}
          onPress={onToggleAutoSave}
        >
          <Clock size={16} color={autoSave ? Theme.colors.card : Theme.colors.textSec} />
          <AppText weight="bold" style={[styles.autoSaveText, autoSave && styles.autoSaveTextActive]}>
            {autoSave ? 'Auto ON' : 'Auto OFF'}
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onRefresh}>
          <RefreshCw size={16} color={Theme.colors.primary} />
          <AppText weight="semibold" style={styles.secondaryBtnText}>Refresh</AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onExport}>
          <Download size={16} color={Theme.colors.primary} />
          <AppText weight="semibold" style={styles.secondaryBtnText}>Export</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
