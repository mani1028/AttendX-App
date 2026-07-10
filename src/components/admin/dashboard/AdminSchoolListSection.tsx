import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Frown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Loader from '../../common/Loader';
import AppText from '../../common/AppText';
import AdminEmptyState from '../AdminEmptyState';
import AdminSchoolCard from './AdminSchoolCard';
import { colors, Theme } from '../../../theme/tokens';
import { dashboardStyles as styles } from './dashboardStyles';
import type { AdminSchool, AgentPermissions } from './types';

interface AdminSchoolListSectionProps {
  loading: boolean;
  refreshing: boolean;
  schools: AdminSchool[];
  currentPage: number;
  totalPages: number;
  isAgent: boolean;
  agentPermissions: AgentPermissions;
  onPageChange: (page: number) => void;
  onEdit: (school: AdminSchool) => void;
  onSubscription: (school: AdminSchool) => void;
  onResendCredentials: (school: AdminSchool) => void;
  onSendReminder: (school: AdminSchool) => void;
  onViewInfo: (school: AdminSchool) => void;
}

export default function AdminSchoolListSection({
  loading,
  refreshing,
  schools,
  currentPage,
  totalPages,
  isAgent,
  agentPermissions,
  onPageChange,
  onEdit,
  onSubscription,
  onResendCredentials,
  onSendReminder,
  onViewInfo,
}: AdminSchoolListSectionProps) {
  if (loading && !refreshing) {
    return (
      <View style={{ marginTop: 40 }}>
        <Loader />
      </View>
    );
  }

  if (schools.length === 0) {
    return (
      <AdminEmptyState
        icon={<Frown size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />}
        title="No schools found"
        description="Try adjusting your search or filters"
      />
    );
  }

  return (
    <>
      {schools.map(school => (
        <AdminSchoolCard
          key={school.id}
          school={school}
          onEdit={onEdit}
          onSubscription={onSubscription}
          onResendCredentials={onResendCredentials}
          onSendReminder={onSendReminder}
          onViewInfo={onViewInfo}
          isAgent={isAgent}
          agentPermissions={agentPermissions}
        />
      ))}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textPrimary} />
          </TouchableOpacity>
          <AppText style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
