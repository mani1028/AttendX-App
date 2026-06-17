import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import { getStudentRegistrationRequests, approveStudentRegistration, rejectStudentRegistration } from '../../services/teacherService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, ChevronLeft, Users, CheckCircle2, XCircle, Eye, CheckCheck } from 'lucide-react-native';
import { Theme } from '../../theme/theme';

export default function StudentRegistrationRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const navigation = useNavigation();

  useEffect(() => {
    isMounted.current = true;
    fetchRequests();
    return () => { isMounted.current = false; };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      const branchId = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '';
      if (!schoolCode || !branchId) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const res = await getStudentRegistrationRequests(schoolCode, branchId);
      const items = res?.items || (Array.isArray(res) ? res : []);
      if (!isMounted.current) return;
      setRequests(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load registration requests', err);
      if (isMounted.current) setRequests([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
    const branchId = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '';
    if (!schoolCode || !branchId) return;

    try {
      setProcessingId(id);
      await approveStudentRegistration(schoolCode, branchId, id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error('Approve failed', err);
      Alert.alert('Error', (err?.response?.data?.detail) || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    Alert.alert('Reject', 'Are you sure you want to reject this registration request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        const schoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
        const branchId = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '';
        if (!schoolCode || !branchId) return;
        try {
          setProcessingId(id);
          await rejectStudentRegistration(schoolCode, branchId, id);
          setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
          console.error('Reject failed', err);
          Alert.alert('Error', (err?.response?.data?.detail) || 'Failed to reject request');
        } finally {
          setProcessingId(null);
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <AppText style={styles.headerTitle}>Student Approvals</AppText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerChip}>
            <BadgeCheck size={14} color={Theme.colors.success} />
            <AppText weight="bold" style={styles.headerChipText}>Registration Requests</AppText>
          </View>
          <AppText style={styles.headerSubtitle}>Approve or reject new student registrations from one place.</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 20 }} />
        ) : requests.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Users size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <AppText>No pending requests</AppText>
          </AppCard>
        ) : (
          requests.map((req: any) => (
            <AppCard key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIcon}>
                    <CheckCheck size={16} color={Theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold" style={styles.studentName}>{req.full_name || req.student_full_name || (req.first_name + ' ' + req.last_name) || 'Student'}</AppText>
                    <AppText style={styles.meta}>{req.class_grade || req.class || '—'} | Section {req.section || '—'}</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.viewBtn]}
                  onPress={() => navigation.navigate('DirectorStudentRegistration' as never)}
                >
                  <Eye size={16} color="#0f172a" />
                  <AppText weight="semibold" style={styles.viewBtnText}>View</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.approveBtn, !!processingId && styles.quickActionDisabled]}
                  onPress={() => handleApprove(req.id)}
                  disabled={!!processingId}
                >
                  <CheckCircle2 size={16} color="#fff" />
                  <AppText weight="semibold" style={styles.actionText}>Accept</AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.rejectBtn, !!processingId && styles.quickActionDisabled]}
                  onPress={() => handleReject(req.id)}
                  disabled={!!processingId}
                >
                  <XCircle size={16} color="#fff" />
                  <AppText weight="semibold" style={styles.actionText}>Reject</AppText>
                </TouchableOpacity>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerContent: {
    marginTop: 18,
  },
  headerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  headerChipText: {
    color: '#0f172a',
    fontSize: 12,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16, paddingBottom: 40, paddingTop: 16 },
  emptyCard: { padding: 20, alignItems: 'center' },
  card: { padding: 16, marginBottom: 12 },
  cardHeader: { marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.colors.successBg, alignItems: 'center', justifyContent: 'center' },
  studentName: { color: Theme.colors.text },
  meta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', marginTop: 12 },
  quickActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginRight: 8,
    paddingHorizontal: 10,
  },
  viewBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewBtnText: {
    color: '#0f172a',
    fontSize: 13,
  },
  approveBtn: {
    backgroundColor: Theme.colors.success,
  },
  rejectBtn: {
    backgroundColor: Theme.colors.error,
    marginRight: 0,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
});
