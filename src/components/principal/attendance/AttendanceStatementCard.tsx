import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';
import type { AttendanceStatement, StmtScope } from './types';

export interface AttendanceStatementCardProps {
  stmtScope: StmtScope;
  statement: AttendanceStatement | null;
  loading: boolean;
}

export default function AttendanceStatementCard({ stmtScope, statement, loading }: AttendanceStatementCardProps) {
  return (
    <AppCard elevated={false} variant="flat" style={styles.statementCard}>
      <View style={styles.statementHeader}>
        <View style={styles.statementTitleContainer}>
          <AppText style={styles.statementTitle} weight="semibold">
            {stmtScope === 'monthly' ? 'Monthly' : 'Weekly'} summary
          </AppText>
          {loading ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: Theme.spacing.sm }} />
          ) : (
            <AppText style={styles.statementRange}>
              {statement?.period?.start_date && statement?.period?.end_date
                ? `${statement.period.start_date} – ${statement.period.end_date}`
                : 'Loading…'}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.statementGrid}>
        <View style={styles.statementItem}>
          <View style={styles.statementItemHeader}>
            <AppText style={styles.statementItemLabel} weight="medium">Teachers</AppText>
            <AppText style={styles.statementItemValue} weight="bold">
              {statement?.teachers?.attendance_pct ?? 0}%
            </AppText>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${statement?.teachers?.attendance_pct ?? 0}%`, backgroundColor: C.primary },
              ]}
            />
          </View>
          <AppText style={styles.statementItemSub}>
            Present: {statement?.teachers?.present_equivalent ?? 0} • Half: {statement?.teachers?.half_day_equivalent ?? 0}
          </AppText>
        </View>

        <View style={styles.statementItem}>
          <View style={styles.statementItemHeader}>
            <AppText style={styles.statementItemLabel} weight="medium">Students</AppText>
            <AppText style={styles.statementItemValue} weight="bold">
              {statement?.students?.attendance_pct ?? 0}%
            </AppText>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${statement?.students?.attendance_pct ?? 0}%`, backgroundColor: Theme.colors.success },
              ]}
            />
          </View>
          <AppText style={styles.statementItemSub}>
            Present: {statement?.students?.present_equivalent ?? 0} • Half: {statement?.students?.half_day_equivalent ?? 0}
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}
