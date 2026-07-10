import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  School,
  MapPin,
  Phone,
  Mail,
  Users,
  CreditCard,
  Calendar,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { safeGoBack } from '../../utils/navigationHelpers';
import { RootStackParamList } from '../../navigation/types';
import * as adminService from '../../services/adminService';

interface SchoolDetails {
  id: string;
  name: string;
  school_code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  principal_name?: string;
  principal_email?: string;
  total_students?: number;
  total_teachers?: number;
  total_staff?: number;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_expires?: string;
  created_at?: string;
  status?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  description?: string;
}

type SchoolDetailsRoute = RouteProp<RootStackParamList, 'SchoolDetails'>;

const SchoolDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<SchoolDetailsRoute>();
  const schoolDbId = route.params?.schoolId || '';

  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSchoolDetails = useCallback(async () => {
    if (!schoolDbId) {
      setErrorMessage('Select a school from the dashboard to view its details.');
      setSchool(null);
      setPayments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setErrorMessage('');
    try {
      const [schoolData, paymentData] = await Promise.all([
        adminService.getSchoolDetails(schoolDbId),
        adminService.getSchoolPayments(schoolDbId),
      ]);

      const s = schoolData?.school || schoolData?.data || schoolData || {};
      setSchool({
        id: String(s.id ?? s._id ?? schoolDbId),
        name: s.name ?? s.school_name ?? '',
        school_code: s.school_code ?? s.school_id ?? '',
        address: s.address ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        phone: s.phone ?? s.contact_phone ?? '',
        email: s.email ?? s.contact_email ?? '',
        principal_name: s.principal_name ?? s.principal ?? '',
        principal_email: s.principal_email ?? '',
        total_students: Number(s.total_students ?? s.students_count ?? 0),
        total_teachers: Number(s.total_teachers ?? s.teachers_count ?? 0),
        total_staff: Number(s.total_staff ?? s.staff_count ?? 0),
        subscription_status: s.subscription_status ?? s.status ?? 'active',
        subscription_plan: s.subscription_plan ?? s.current_plan_name ?? s.plan ?? '',
        subscription_expires: s.subscription_expires ?? s.subscription_end_at ?? s.expires_at ?? '',
        created_at: s.created_at ?? '',
        status: s.status ?? 'active',
      });

      setPayments(
        (Array.isArray(paymentData) ? paymentData : []).map((p: any) => ({
          id: String(p.id ?? p.payment_id ?? ''),
          amount: Number(p.amount ?? 0),
          date: p.date ?? p.created_at ?? p.payment_date ?? '',
          method: p.method ?? p.payment_method ?? '',
          status: p.status ?? 'completed',
          description: p.description ?? p.notes ?? '',
        })),
      );
    } catch (error) {
      console.error('Failed to fetch school details:', error);
      setErrorMessage('Could not load school details. Please try again.');
      setSchool(null);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolDbId]);

  useEffect(() => {
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) { return 'N/A'; }
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderInfoRow = (icon: React.ReactNode, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={styles.infoValue}>{value || 'N/A'}</AppText>
      </View>
    </View>
  );

  const renderStatCard = (label: string, value: number, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={innerPageLayoutStyles.scrollPageContent}>
          <StandardPageHeader
            scrollWithContent
            title="School Details"
            onBackPress={() => safeGoBack(navigation as any)}
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          />
          <ScreenSkeleton variant="list" />
        </ScrollView>
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={innerPageLayoutStyles.scrollPageContent}>
          <StandardPageHeader
            scrollWithContent
            title="School Details"
            onBackPress={() => safeGoBack(navigation as any)}
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          />
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={Theme.colors.border} />
            <AppText style={styles.emptyText}>
              {errorMessage || 'School details not available'}
            </AppText>
            {schoolDbId ? (
              <TouchableOpacity style={styles.retryBtn} onPress={fetchSchoolDetails}>
                <RefreshCw size={16} color={Theme.colors.primary} />
                <AppText style={styles.retryBtnText}>Retry</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="School Details"
          onBackPress={() => safeGoBack(navigation as any)}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        <View style={styles.headerCard}>
          <View style={styles.schoolIcon}>
            <School size={28} color={Theme.colors.card} />
          </View>
          <AppText style={styles.schoolName}>{school.name}</AppText>
          <View style={styles.codeBadge}>
            <AppText style={styles.codeText}>Code: {school.school_code}</AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: school.status === 'active' ? '#dcfce7' : '#fef2f2' }]}>
            <AppText style={[styles.statusText, { color: school.status === 'active' ? '#16a34a' : Theme.colors.error }]}>
              {school.status === 'active' ? 'Active' : school.status || 'Unknown'}
            </AppText>
          </View>
        </View>

        <View style={styles.statsRow}>
          {renderStatCard('Students', school.total_students || 0, Theme.colors.blue)}
          {renderStatCard('Teachers', school.total_teachers || 0, '#16a34a')}
          {renderStatCard('Staff', school.total_staff || 0, Theme.colors.warning)}
        </View>

        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle}>Contact Information</AppText>
          {renderInfoRow(<MapPin size={18} color={Theme.colors.primary} />, 'Address', [school.address, school.city, school.state].filter(Boolean).join(', '))}
          {renderInfoRow(<Phone size={18} color={Theme.colors.primary} />, 'Phone', school.phone || '')}
          {renderInfoRow(<Mail size={18} color={Theme.colors.primary} />, 'Email', school.email || '')}
        </View>

        {school.principal_name ? (
          <View style={styles.sectionCard}>
            <AppText style={styles.sectionTitle}>Principal</AppText>
            {renderInfoRow(<Users size={18} color={Theme.colors.primary} />, 'Name', school.principal_name)}
            {school.principal_email && renderInfoRow(<Mail size={18} color={Theme.colors.primary} />, 'Email', school.principal_email)}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle}>Subscription</AppText>
          {renderInfoRow(<CreditCard size={18} color={Theme.colors.primary} />, 'Status', school.subscription_status || 'N/A')}
          {school.subscription_plan && renderInfoRow(<Calendar size={18} color={Theme.colors.primary} />, 'Plan', school.subscription_plan)}
          {school.subscription_expires && renderInfoRow(<Calendar size={18} color={Theme.colors.primary} />, 'Expires', formatDate(school.subscription_expires))}
        </View>

        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle}>Payment History</AppText>
          {payments.length === 0 ? (
            <AppText style={styles.emptyPayments}>No payments recorded for this school.</AppText>
          ) : (
            payments.slice(0, 10).map(payment => (
              <View key={payment.id || payment.date} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <AppText style={styles.paymentAmount}>₹{payment.amount.toLocaleString('en-IN')}</AppText>
                  <AppText style={styles.paymentDate}>{formatDate(payment.date)}</AppText>
                </View>
                <View style={[styles.paymentStatus, {
                  backgroundColor: payment.status === 'completed' ? '#dcfce7' : Theme.colors.amberLight,
                }]}>
                  <AppText style={[styles.paymentStatusText, {
                    color: payment.status === 'completed' ? '#16a34a' : Theme.colors.warning,
                  }]}>
                    {payment.status}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </View>

        {school.created_at && (
          <View style={styles.footerInfo}>
            <AppText style={styles.footerText}>Created: {formatDate(school.created_at)}</AppText>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: Theme.spacing.xl,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Theme.colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyText: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Theme.spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.primary + '10',
  },
  retryBtnText: {
    fontSize: Theme.typography.body.fontSize,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  headerCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  schoolIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  schoolName: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  codeBadge: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    marginBottom: 10,
  },
  codeText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  statusBadge: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
  },
  statusText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  statLabel: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionTitle: {
    fontSize: Theme.typography.bodyMd.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border + '50',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Theme.typography.body.fontSize,
    fontWeight: '500',
    color: Theme.colors.text,
  },
  emptyPayments: {
    fontSize: Theme.typography.body.fontSize,
    color: Theme.colors.textMuted,
    paddingVertical: Theme.spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border + '50',
  },
  paymentInfo: {},
  paymentAmount: {
    fontSize: Theme.typography.bodyMd.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  paymentDate: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  paymentStatus: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.sm,
  },
  paymentStatusText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  footerText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
  },
});

export default SchoolDetailsScreen;
