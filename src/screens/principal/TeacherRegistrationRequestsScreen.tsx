import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, XCircle, Eye, X, RefreshCw } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import { Theme } from '../../theme/tokens';
import * as teacherService from '../../services/teacherService';

interface StaffRequest {
  id: string;
  staff_full_name?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  designation?: string;
  status?: string;
  created_at?: string;
}

export default function TeacherRegistrationRequestsScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const rows = await teacherService.getStaffRegistrationRequests(true);
      setRequests(rows);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await teacherService.getStaffRegistrationRequestDetail(id);
      setSelected(data);
      setEditData(data?.staff_data || data || {});
    } catch {
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selected?.id) { return; }
    setActionLoading(true);
    try {
      await teacherService.acceptStaffRegistrationRequest(String(selected.id), editData);
      Alert.alert('Success', 'Teacher registration accepted');
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to accept');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!selected?.id) { return; }
    Alert.alert('Reject Request', 'Reject this teacher registration?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await teacherService.rejectStaffRegistrationRequest(String(selected.id));
            Alert.alert('Rejected', 'Request rejected');
            setSelected(null);
            fetchRequests();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.detail || 'Failed to reject');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: StaffRequest }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <AppText weight="bold" style={styles.avatarText}>
            {(item.staff_full_name || '?').slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="bold" style={styles.name}>{item.staff_full_name || 'Teacher'}</AppText>
          <AppText style={styles.meta}>{item.email || item.phone || '—'}</AppText>
          <AppText style={styles.meta}>{item.designation || 'Staff'} • {item.status || 'Pending'}</AppText>
        </View>
      </View>
      <TouchableOpacity style={styles.viewBtn} onPress={() => openDetail(String(item.id))}>
        <Eye size={16} color={Theme.colors.primary} />
        <AppText style={styles.viewBtnText}>Review</AppText>
      </TouchableOpacity>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Staff Registration"
        onBackPress={() => navigation.goBack()}
        rightIcon={<RefreshCw size={20} color={Theme.colors.card} />}
        onRightIconPress={() => { setRefreshing(true); fetchRequests(); }}
      />

      {loading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          style={innerPageLayoutStyles.scrollViewFront}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} />}
          ListEmptyComponent={
            <AppText style={styles.empty}>No pending staff registration requests.</AppText>
          }
        />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Review Request</AppText>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <X size={22} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.modalBody}>
              {Object.keys(editData).slice(0, 20).map(key => (
                <View key={key} style={styles.field}>
                  <AppText style={styles.fieldLabel}>{key.replace(/_/g, ' ')}</AppText>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(editData[key] ?? '')}
                    onChangeText={v => setEditData(p => ({ ...p, [key]: v }))}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <AppButton
              title={actionLoading ? 'Processing...' : 'Accept'}
              onPress={handleAccept}
              disabled={actionLoading}
              leftIcon={<CheckCircle2 size={18} color="#fff" />}
            />
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={actionLoading}>
              <XCircle size={18} color={Theme.colors.error} />
              <AppText style={styles.rejectText} weight="semibold">Reject</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  list: { padding: 16, paddingBottom: 100 },
  card: { marginBottom: 12, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#d97706' },
  name: { fontSize: 16, color: Theme.colors.text },
  meta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: `${Theme.colors.primary}12`, borderRadius: 8 },
  viewBtnText: { color: Theme.colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: Theme.colors.textMuted, marginTop: 40 },
  modal: { flex: 1, backgroundColor: Theme.colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, backgroundColor: Theme.colors.card },
  modalTitle: { fontSize: 18 },
  modalBody: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, color: Theme.colors.textMuted, textTransform: 'capitalize', marginBottom: 4, fontWeight: '600' },
  fieldInput: { backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, padding: 10, color: Theme.colors.text },
  modalActions: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: Theme.colors.border, backgroundColor: Theme.colors.card },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  rejectText: { color: Theme.colors.error },
});
