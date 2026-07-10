import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Home, Edit2, CreditCard, Mail, AlertTriangle } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme, colors } from '../../../theme/tokens';
import AdminStatusBadge from './AdminStatusBadge';
import { formatDate, getDaysLeft, getDaysLeftColor } from './helpers';
import { dashboardStyles as styles } from './dashboardStyles';
import { modalStyles } from './modalStyles';
import type { AdminSchool, AgentPermissions } from './types';

interface AdminSchoolCardProps {
  school: AdminSchool;
  onEdit: (school: AdminSchool) => void;
  onSubscription: (school: AdminSchool) => void;
  onResendCredentials: (school: AdminSchool) => void;
  onSendReminder: (school: AdminSchool) => void;
  onViewInfo: (school: AdminSchool) => void;
  isAgent?: boolean;
  agentPermissions?: AgentPermissions;
}

export default function AdminSchoolCard({
  school,
  onEdit,
  onSubscription,
  onResendCredentials,
  onSendReminder,
  onViewInfo,
  isAgent = false,
  agentPermissions,
}: AdminSchoolCardProps) {
  const daysLeft = getDaysLeft(school.trial_end_at || school.subscription_end_at || null);
  const daysLeftColor = getDaysLeftColor(daysLeft);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;

  return (
    <AppCard style={styles.schoolCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.schoolId}>{school.school_id}</AppText>
          <AppText style={styles.schoolName}>{school.name}</AppText>
        </View>
        <AdminStatusBadge status={school.status} type="school" />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Email:</AppText>
          <AppText style={styles.detailValue}>{school.email}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Plan:</AppText>
          <AppText style={styles.detailValue}>{school.current_plan_name || 'Basic Attendance'}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Status:</AppText>
          <AdminStatusBadge status={school.subscription_status || ''} type="subscription" />
        </View>
        {!!school.trial_end_at && (
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Trial End:</AppText>
            <AppText style={[styles.detailValue, { color: daysLeftColor }]}>
              {formatDate(school.trial_end_at)}
              {daysLeft !== null && (
                <AppText style={{ ...Theme.typography.label }}> ({daysLeft < 0 ? 'Expired' : `${daysLeft} days left`})</AppText>
              )}
            </AppText>
          </View>
        )}
        {!!school.last_payment_amount && (!isAgent || agentPermissions?.can_view_payments) && (
          <View style={styles.detailRow}>
            <AppText style={styles.detailLabel}>Last Payment:</AppText>
            <AppText style={styles.detailValue}>₹{school.last_payment_amount}</AppText>
          </View>
        )}
      </View>

      {isExpiringSoon && (
        <View style={modalStyles.warningBanner}>
          <AlertTriangle size={14} color={colors.warning} />
          <AppText style={modalStyles.warningText}>Trial ending in {daysLeft} days!</AppText>
        </View>
      )}

      <View style={styles.cardActions}>
        {(!isAgent || agentPermissions?.can_view_payments) && (
          <TouchableOpacity accessibilityRole="button" style={styles.actionBtn} onPress={() => onViewInfo(school)}>
            <Home size={12} color={colors.textMuted} />
            <AppText style={styles.actionBtnText}>Info</AppText>
          </TouchableOpacity>
        )}
        {(!isAgent || agentPermissions?.can_edit_features) && (
          <TouchableOpacity accessibilityRole="button" style={styles.actionBtn} onPress={() => onEdit(school)}>
            <Edit2 size={12} color={colors.textMuted} />
            <AppText style={styles.actionBtnText}>Edit</AppText>
          </TouchableOpacity>
        )}
        {(!isAgent || agentPermissions?.can_view_payments) && (
          <TouchableOpacity accessibilityRole="button" style={styles.actionBtn} onPress={() => onSubscription(school)}>
            <CreditCard size={12} color={colors.textMuted} />
            <AppText style={styles.actionBtnText}>Payments</AppText>
          </TouchableOpacity>
        )}
        {!isAgent && (
          <TouchableOpacity accessibilityRole="button" style={styles.actionBtn} onPress={() => onResendCredentials(school)}>
            <Mail size={12} color={colors.textMuted} />
            <AppText style={styles.actionBtnText}>Resend</AppText>
          </TouchableOpacity>
        )}
      </View>
    </AppCard>
  );
}
