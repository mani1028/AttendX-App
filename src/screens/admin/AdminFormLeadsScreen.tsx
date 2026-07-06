import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Mail, Phone, Building2, Search, Inbox } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import * as adminService from '../../services/adminService';

type FormType = 'all' | 'contact' | 'demo' | 'support';

const STATUS_OPTIONS = ['new', 'contacted', 'resolved', 'closed'];

function matchesType(formType: string | undefined, filter: FormType): boolean {
  if (filter === 'all') return true;
  const value = (formType || '').toLowerCase();
  if (filter === 'contact') return value.includes('contact');
  if (filter === 'demo') return value.includes('demo');
  if (filter === 'support') return value.includes('support');
  return true;
}

export default function AdminFormLeadsScreen() {
  const navigation = useNavigation();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FormType>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await adminService.getAdminForms();
      setForms(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load form leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms.filter(item => {
      if (!matchesType(item.form_type, filter)) return false;
      if (!q) return true;
      const haystack = [
        item.name,
        item.email,
        item.phone,
        item.school_name,
        item.message,
        item.form_type,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [forms, filter, search]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminService.updateAdminFormStatus(id, status);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  const filterChips: { key: FormType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'contact', label: 'Contact' },
    { key: 'demo', label: 'Demo' },
    { key: 'support', label: 'Support' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Website Forms"
          subtitle="Contact, demo and support leads"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <View style={styles.searchRow}>
            <Search size={16} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search leads..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={Theme.colors.textMuted}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {filterChips.map(chip => (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, filter === chip.key && styles.chipActive]}
                onPress={() => setFilter(chip.key)}
              >
                <AppText weight="semibold" style={[styles.chipText, filter === chip.key && styles.chipTextActive]}>
                  {chip.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={<Inbox size={28} color={Theme.colors.primary} />}
              title={search || filter !== 'all' ? 'No matching leads' : 'No form submissions yet'}
              description={
                search || filter !== 'all'
                  ? 'Try a different search term or filter.'
                  : 'Contact, demo and support requests from your website will show up here.'
              }
              actionLabel={search || filter !== 'all' ? undefined : 'Refresh'}
              onAction={search || filter !== 'all' ? undefined : () => { setLoading(true); load(); }}
            />
          ) : (
            filtered.map(item => (
              <AppCard key={String(item.id)} style={styles.leadCard}>
                <View style={styles.leadTop}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold">{item.name || 'Unknown'}</AppText>
                    <AppText style={styles.typeBadge}>{item.form_type || 'form'}</AppText>
                  </View>
                  <AppText style={styles.status}>{(item.status || 'new').toUpperCase()}</AppText>
                </View>

                {!!item.school_name && (
                  <View style={styles.metaRow}>
                    <Building2 size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.metaText}>{item.school_name}</AppText>
                  </View>
                )}
                {!!item.email && (
                  <View style={styles.metaRow}>
                    <Mail size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.metaText}>{item.email}</AppText>
                  </View>
                )}
                {!!item.phone && (
                  <View style={styles.metaRow}>
                    <Phone size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.metaText}>{item.phone}</AppText>
                  </View>
                )}
                {!!item.message && <AppText style={styles.message} numberOfLines={3}>{item.message}</AppText>}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusRow}>
                  {STATUS_OPTIONS.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, item.status === status && styles.statusChipActive]}
                      onPress={() => updateStatus(String(item.id), status)}
                    >
                      <AppText style={[styles.statusChipText, item.status === status && styles.statusChipTextActive]}>
                        {status}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </AppCard>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: Theme.colors.text, fontSize: 15 },
  chipScroll: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  chipText: { fontSize: 13, color: Theme.colors.textMuted },
  chipTextActive: { color: Theme.colors.card },
  leadCard: { marginBottom: 10 },
  leadTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  typeBadge: { fontSize: 12, color: Theme.colors.primary, marginTop: 4 },
  status: { fontSize: 11, fontWeight: '800', color: Theme.colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 13, color: Theme.colors.textSec, flex: 1 },
  message: { fontSize: 13, color: Theme.colors.text, marginTop: 8, lineHeight: 18 },
  statusRow: { marginTop: 12 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    marginRight: 6,
  },
  statusChipActive: { backgroundColor: Theme.colors.primary },
  statusChipText: { fontSize: 11, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'capitalize' },
  statusChipTextActive: { color: Theme.colors.card },
});
