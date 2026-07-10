import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import {
  getStudentRegistrationRequests,
  approveStudentRegistration,
  rejectStudentRegistration,
} from '../../services/teacherService';
import { useNavigation } from '@react-navigation/native';
import { Users, CheckCircle2, XCircle, Eye, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { resolveApiErrorMessage } from '../../utils/helpers';

function resolveRegistrationRequestId(req: Record<string, unknown>): string {
  return String(req.id ?? req.request_id ?? req.registration_id ?? '').trim();
}

export default function StudentRegistrationRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const navigation = useNavigation();

  useEffect(() => {
    isMounted.current = true;
    fetchRequests();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const branchId = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
      if (!schoolCode || !branchId) {
        if (!isMounted.current) {
          return;
        }
        setRequests([]);
        setLoadError('School or branch information is missing. Please log in again.');
        return;
      }

      const res = await getStudentRegistrationRequests(schoolCode, branchId);
      const items = res?.items || (Array.isArray(res) ? res : []);
      if (!isMounted.current) {
        return;
      }
      setRequests(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load registration requests', err);
      if (!isMounted.current) {
        return;
      }
      setRequests([]);
      setLoadError(
        resolveApiErrorMessage(err, 'Could not load registration requests. Pull down to retry.'),
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(true);
  };

  const handleApprove = async (req: Record<string, unknown>) => {
    const id = resolveRegistrationRequestId(req);
    if (!id) {
      Alert.alert('Error', 'This request is missing an ID. Pull down to refresh and try again.');
      return;
    }
    const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
    const branchId = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
    if (!schoolCode || !branchId) {
      Alert.alert('Error', 'School or branch information is missing. Please log in again.');
      return;
    }

    try {
      setProcessingId(id);
      await approveStudentRegistration(schoolCode, branchId, id);
      setRequests(prev => prev.filter(r => resolveRegistrationRequestId(r) !== id));
    } catch (err: any) {
      console.error('Approve failed', err);
      Alert.alert('Could not approve', resolveApiErrorMessage(err, 'Failed to approve this request.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: Record<string, unknown>) => {
    const id = resolveRegistrationRequestId(req);
    if (!id) {
      Alert.alert('Error', 'This request is missing an ID. Pull down to refresh and try again.');
      return;
    }
    Alert.alert('Reject registration', 'Are you sure you want to reject this registration request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
          const branchId = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
          if (!schoolCode || !branchId) {
            Alert.alert('Error', 'School or branch information is missing. Please log in again.');
            return;
          }
          try {
            setProcessingId(id);
            await rejectStudentRegistration(schoolCode, branchId, id);
            setRequests(prev => prev.filter(r => resolveRegistrationRequestId(r) !== id));
          } catch (err: any) {
            console.error('Reject failed', err);
            Alert.alert('Could not reject', resolveApiErrorMessage(err, 'Failed to reject this request.'));
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const headerSubtitle = loading
    ? 'Loading requests...'
    : loadError
      ? 'Unable to load requests'
      : `${requests.length} pending request${requests.length === 1 ? '' : 's'}`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          title="Approvals"
          subtitle={headerSubtitle}
          onBackPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('TeacherDashboard' as never)
          }
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh approvals"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />
        <View style={[innerPageLayoutStyles.scrollBody, styles.pageBody]}>
          {loadError ? (
            <AppCard style={styles.errorCard}>
              <AlertCircle size={32} color={Theme.colors.error} />
              <AppText weight="semibold" style={styles.errorTitle}>Could not load requests</AppText>
              <AppText style={styles.errorText}>{loadError}</AppText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRequests()}>
                <AppText weight="semibold" style={styles.retryBtnText}>Try again</AppText>
              </TouchableOpacity>
            </AppCard>
          ) : loading ? (
            <View style={styles.loaderWrap}>
              <ScreenSkeleton variant="list" />
              <AppText style={styles.loaderText}>Loading registration requests...</AppText>
            </View>
          ) : requests.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Users size={40} color={Theme.colors.textSec} style={{ marginBottom: Theme.spacing.sm }} />
              <AppText weight="semibold" style={styles.emptyTitle}>No pending requests</AppText>
              <AppText style={styles.emptyText}>
                New student registration requests will appear here for your review.
              </AppText>
            </AppCard>
          ) : (
            requests.map((req: any) => {
              const requestId = resolveRegistrationRequestId(req);
              return (
              <AppCard key={requestId || req.student_full_name} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.cardIcon}>
                      <CheckCheck size={16} color={Theme.colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText weight="semibold" style={styles.studentName}>
                        {req.full_name ||
                          req.student_full_name ||
                          `${req.first_name || ''} ${req.last_name || ''}`.trim() ||
                          'Student'}
                      </AppText>
                      <AppText style={styles.meta}>
                        Class {req.class_grade || req.class || '—'} · Section {req.section || '—'}
                      </AppText>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.quickActionBtn, styles.viewBtn]}
                    onPress={() => navigation.navigate('TeacherStudentRegistration' as never)}
                  >
                    <Eye size={16} color={Theme.colors.text} />
                    <AppText weight="semibold" style={styles.viewBtnText}>View</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.quickActionBtn, styles.approveBtn, !!processingId && styles.quickActionDisabled]}
                    onPress={() => handleApprove(req)}
                    disabled={!!processingId}
                  >
                    <CheckCircle2 size={16} color={Theme.colors.card} />
                    <AppText weight="semibold" style={styles.actionText}>Accept</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.quickActionBtn, styles.rejectBtn, !!processingId && styles.quickActionDisabled]}
                    onPress={() => handleReject(req)}
                    disabled={!!processingId}
                  >
                    <XCircle size={16} color={Theme.colors.card} />
                    <AppText weight="semibold" style={styles.actionText}>Reject</AppText>
                  </TouchableOpacity>
                </View>
              </AppCard>
            );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  pageBody: { paddingBottom: 96 },
  loaderWrap: { paddingVertical: Theme.spacing.xxl, alignItems: 'center', gap: Theme.spacing.md },
  loaderText: { color: Theme.colors.textMuted, ...Theme.typography.body },
  errorCard: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  errorTitle: { color: Theme.colors.text, fontSize: Theme.typography.h4.fontSize, marginTop: Theme.spacing.xs },
  errorText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  retryBtn: {
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
  },
  retryBtnText: { color: Theme.colors.card },
  emptyCard: { padding: 28, alignItems: 'center', marginTop: Theme.spacing.xs },
  emptyTitle: { color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  emptyText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  card: { padding: Theme.spacing.md, marginBottom: Theme.spacing.md },
  cardHeader: { marginBottom: Theme.spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: { color: Theme.colors.text },
  meta: { ...Theme.typography.caption, color: Theme.colors.textMuted, marginTop: Theme.spacing.xs },
  actionsRow: { flexDirection: 'row', marginTop: Theme.spacing.md },
  quickActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
    paddingHorizontal: 10,
  },
  viewBtn: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  viewBtnText: { color: Theme.colors.text, fontSize: Theme.typography.caption.fontSize },
  approveBtn: { backgroundColor: Theme.colors.success },
  rejectBtn: { backgroundColor: Theme.colors.error, marginRight: 0 },
  actionText: { color: Theme.colors.card, fontSize: Theme.typography.caption.fontSize },
  quickActionDisabled: { opacity: 0.5 },
});
