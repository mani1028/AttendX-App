import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Calendar, Download } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { iso } from './helpers';
import { attendanceStyles as styles } from './styles';
import type { AttendanceView, StmtScope } from './types';

export interface AttendanceControlsRowProps {
  date: Date;
  onDatePress: () => void;
  stmtScope: StmtScope;
  onStmtScopeChange: (scope: StmtScope) => void;
  view: AttendanceView;
  onExportPress: () => void;
}

export default function AttendanceControlsRow({
  date,
  onDatePress,
  stmtScope,
  onStmtScopeChange,
  onExportPress,
}: AttendanceControlsRowProps) {
  return (
    <View style={styles.controlsRow}>
      <TouchableOpacity accessibilityRole="button" style={styles.controlPill} onPress={onDatePress} activeOpacity={0.8}>
        <Calendar size={15} color={C.primary} style={{ marginRight: 6 }} />
        <AppText style={styles.controlPillText} weight="bold">{iso(date)}</AppText>
      </TouchableOpacity>

      <View style={styles.scopeSwitcher}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.scopeSwitcherBtn, stmtScope === 'weekly' && styles.scopeSwitcherBtnActive]}
          onPress={() => onStmtScopeChange('weekly')}
          activeOpacity={0.8}
        >
          <AppText
            style={[styles.scopeSwitcherBtnText, stmtScope === 'weekly' && styles.scopeSwitcherBtnTextActive]}
            weight="semibold"
          >
            Weekly
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.scopeSwitcherBtn, stmtScope === 'monthly' && styles.scopeSwitcherBtnActive]}
          onPress={() => onStmtScopeChange('monthly')}
          activeOpacity={0.8}
        >
          <AppText
            style={[styles.scopeSwitcherBtnText, stmtScope === 'monthly' && styles.scopeSwitcherBtnTextActive]}
            weight="semibold"
          >
            Monthly
          </AppText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.exportPill} onPress={onExportPress} activeOpacity={0.8}>
        <Download size={15} color={C.white} style={{ marginRight: 6 }} />
        <AppText style={styles.exportPillText} weight="bold">Export</AppText>
      </TouchableOpacity>
    </View>
  );
}
