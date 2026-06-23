import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  School,
  MapPin,
  Phone,
  Mail,
  Users,
  CreditCard,
  Calendar,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { safeGoBack } from '../../utils/navigationHelpers';
import { formatErrorMessage } from '../../utils/helpers';

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

const SchoolDetailsScreen = () => {
  const navigation = useNavigation();
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchoolDetails = useCallback(async () => {
    try {
      const [schoolRes, paymentsRes] = await Promise.allSettled([
        API.get('admin/school/details'),
        API.get('admin/school/payments'),
      ]);

      if (schoolRes.status === 'fulfilled') {
        const data = schoolRes.value.data;
        const s = data.school || data.data || data;
        setSchool({
          id: String(s.id ?? s._id ?? ''),
          name: s.name ?? s.school_name ?? '',
          school_code: s.school_code ?? '',
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
          subscription_plan: s.subscription_plan ?? s.plan ?? '',
          subscription_expires: s.subscription_expires ?? s.expires_at ?? '',
          created_at: s.created_at ?? '',
          status: s.status ?? 'active',
        });
      }

      if (paymentsRes.status === 'fulfilled') {
        const data = paymentsRes.value.data;
        const list = Array.isArray(data) ? data : (data.payments || data.data || []);
        setPayments(list.map((p: any) => ({
          id: String(p.id ?? ''),
          amount: Number(p.amount ?? 0),
          date: p.date ?? p.created_at ?? '',
          method: p.method ?? p.payment_method ?? '',
          status: p.status ?? 'completed',
          description: p.description ?? '',
        })));
      }
    } catch (error) {
      console.error('Failed to fetch school details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchoolDetails();
  }, [fetchSchoolDetails]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
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
        <StandardPageHeader title="School Details" onBackPress={() => safeGoBack(navigation as any)} />
        <ActivityIndicator size="large" color={Theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.container}>
        <StandardPageHeader title="School Details" onBackPress={() => safeGoBack(navigation as any)} />
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={Theme.colors.border} />
          <AppText style={styles.emptyText}>School details not available</AppText>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSchoolDetails}>
            <RefreshCw size={16} color={Theme.colors.primary} />
            <AppText style={styles.retryBtnText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StandardPageHeader title="School Details" onBackPress={() => safeGoBack(navigation as any)} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {/* School Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.schoolIcon}>
            <School size={28} color="#fff" />
          </View>
          <AppText style={styles.schoolName}>{school.name}</AppText>
          <View style={styles.codeBadge}>
            <AppText style={styles.codeText}>Code: {school.school_code}</AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (school.status === 'active' ? '#dcfce7' : '#fef2f2') }]}>
            <AppText style={[styles.statusText, { color: school.status === 'active' ? '#16a34a' : '#ef4444' }]}>
              {school.status === 'active' ? 'Active' : school.status || 'Unknown'}
            </AppText>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {renderStatCard('Students', school.total_students || 0, '#2563eb')}
          {renderStatCard('Teachers', school.total_teachers || 0, '#16a34a')}
          {renderStatCard('Staff', school.total_staff || 0, '#f59e0b')}
        </View>

        {/* Contact Information */}
        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle}>Contact Information</AppText>
          {renderInfoRow(<MapPin size={18} color={Theme.colors.primary} />, 'Address', [school.address, school.city, school.state].filter(Boolean).join(', '))}
          {renderInfoRow(<Phone size={18} color={Theme.colors.primary} />, 'Phone', school.phone || '')}
          {renderInfoRow(<Mail size={18} color={Theme.colors.primary} />, 'Email', school.email || '')}
        </View>

        {/* Principal */}
        {school.principal_name ? (
          <View style={styles.sectionCard}>
            <AppText style={styles.sectionTitle}>Principal</AppText>
            {renderInfoRow(<Users size={18} color={Theme.colors.primary} />, 'Name', school.principal_name)}
            {school.principal_email && renderInfoRow(<Mail size={18} color={Theme.colors.primary} />, 'Email', school.principal_email)}
          </View>
        ) : null}

        {/* Subscription */}
        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle}>Subscription</AppText>
          {renderInfoRow(
            <CreditCard size={18} color={Theme.colors.primary} />,
            'Status',
            school.subscription_status || 'N/A',
          )}
          {school.subscription_plan && renderInfoRow(
            <Calendar size={18} color={Theme.colors.primary} />,
            'Plan',
            school.subscription_plan,
          )}
          {school.subscription_expires && renderInfoRow(
            <Calendar size={18} color={Theme.colors.primary} />,
            'Expires',
            formatDate(school.subscription_expires),
          )}
        </View>

        {/* Payment History */}
        {payments.length > 0 && (
          <View style={styles.sectionCard}>
            <AppText style={styles.sectionTitle}>Recent Payments</AppText>
            {payments.slice(0, 5).map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <AppText style={styles.paymentAmount}>₹{payment.amount.toLocaleString('en-IN')}</AppText>
                  <AppText style={styles.paymentDate}>{formatDate(payment.date)}</AppText>
                </View>
                <View style={[styles.paymentStatus, {
                  backgroundColor: payment.status === 'completed' ? '#dcfce7' : '#fef3c7',
                }]}>
                  <AppText style={[styles.paymentStatusText, {
                    color: payment.status === 'completed' ? '#16a34a' : '#d97706',
                  }]}>
                    {payment.status}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Created date */}
        {school.created_at && (
          <View style={styles.footerInfo}>
            <AppText style={styles.footerText}>Created: {formatDate(school.created_at)}</AppText>
          </View>
        )}
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
    padding: 20,
    paddingBottom: 40,
    marginTop: -20,
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
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textSec,
    marginTop: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + '10',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  headerCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  schoolIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 12,
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
    borderRadius: 10,
    backgroundColor: Theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text,
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
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  paymentDate: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  paymentStatus: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
});

export default SchoolDetailsScreen;
