import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  UploadCloud,
  Camera,
  Users,
  Briefcase,
  User,
  Scan,
} from 'lucide-react-native';
import API from '../../services/api';
import { Theme } from '../../theme/theme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

/* ── helpers ── */
const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
  const bid = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '';
  const tok = (await AsyncStorage.getItem('token')) || '';
  return {
    'X-School-Code': sc,
    'X-Branch-Id': bid,
    Authorization: `Bearer ${tok}`,
  };
};

type StatusFilter = 'all' | 'no_photo' | 'no_embedding' | 'needs_review';
type ActiveTab = 'students' | 'staff';

interface PersonItem {
  roll_no?: string;
  employee_id?: string;
  name: string;
  has_photo: boolean;
  has_embedding: boolean;
  photo_url?: string | null;
  class_grade?: string;
  section?: string;
  designation?: string;
  department?: string;
}

interface SummaryGroup {
  total?: number;
  no_photo?: number;
  no_embedding?: number;
  needs_review?: number;
}

interface Summary {
  students?: SummaryGroup;
  staff?: SummaryGroup;
}

interface ClassOption {
  class_grade: string;
  sections: string[];
}

/* ─────────────────────────────────────────────────────────────
   PHOTO UPLOAD MODAL
───────────────────────────────────────────────────────────── */
interface PhotoModalProps {
  target: { id: string; name: string; type: 'Staff' | 'Student' } | null;
  onClose: () => void;
  onSuccess: (id: string, embeddingSynced: boolean) => void;
}

function PhotoUploadModal({ target, onClose, onSuccess }: PhotoModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.92 }, (res) => {
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (asset?.uri) { setPreview(asset.uri); setFileName(asset.fileName || 'photo.jpg'); setError(''); }
    });
  };

  const captureImage = () => {
    launchCamera({ mediaType: 'photo', quality: 0.92, cameraType: 'front' }, (res) => {
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (asset?.uri) { setPreview(asset.uri); setFileName(asset.fileName || `capture_${target?.id}.jpg`); setError(''); }
    });
  };

  const handleUpload = async () => {
    if (!preview || !target) return;
    setUploading(true); setError('');
    try {
      const headers = await getHeaders();
      const fd = new FormData();
      fd.append('photo', { uri: preview, type: 'image/jpeg', name: fileName || 'photo.jpg' } as any);
      const endpoint = `/profile-photo/upload/${target.type.toLowerCase()}/${encodeURIComponent(target.id)}`;
      const res = await API.post(endpoint, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.ok) { onSuccess(target.id, !!res.data.embedding_synced); onClose(); }
      else setError(res.data?.detail || 'Upload failed');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <UploadCloud size={18} color={Theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Upload Photo</Text>
                {target ? (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {target.type === 'Staff' ? '🏢' : '👤'} {target.name} ({target.id})
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} disabled={uploading}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {error ? (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color={Theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {preview ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: preview }} style={styles.previewImg} />
                <Text style={styles.previewName} numberOfLines={1}>{fileName}</Text>
                <Text style={styles.previewHint}>Tap a button below to change</Text>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <UploadCloud size={36} color={Theme.colors.textMuted} style={{ opacity: 0.4 }} />
                <Text style={styles.emptyPreviewText}>No photo selected</Text>
                <Text style={styles.emptyPreviewHint}>JPEG, PNG or WEBP up to 5MB</Text>
              </View>
            )}

            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                <UploadCloud size={16} color="#fff" />
                <Text style={styles.pickBtnText}>📁 Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickBtn, { backgroundColor: '#0f172a' }]} onPress={captureImage} disabled={uploading}>
                <Camera size={16} color="#fff" />
                <Text style={styles.pickBtnText}>📷 Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.outlineBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, (!preview || uploading) && { opacity: 0.45 }]}
              onPress={handleUpload}
              disabled={!preview || uploading}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><UploadCloud size={14} color="#fff" /><Text style={styles.primaryBtnText}>Save Photo</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

export default function PrincipalFaceReviewScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ActiveTab>('students');
  const [students, setStudents] = useState<PersonItem[]>([]);
  const [staff, setStaff] = useState<PersonItem[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ id: string; name: string; type: 'Staff' | 'Student' } | null>(null);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  // Load class list for filter
  useEffect(() => {
    (async () => {
      try {
        const headers = await getHeaders();
        const r = await API.get('/principal/classes', { headers });
        const rawItems = r.data?.items || [];
        const map: Record<string, Set<string>> = {};
        rawItems.forEach((row: any) => {
          const g = row.class_grade || row.class_name || '';
          if (!g) return;
          if (!map[g]) map[g] = new Set();
          if (row.section) map[g].add(row.section);
        });
        const built = Object.keys(map).sort().map(g => ({ class_grade: g, sections: Array.from(map[g]).sort() }));
        setClasses(built);
      } catch {}
    })();
  }, []);

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const headers = await getHeaders();
      if (activeTab === 'students') {
        const r = await API.get('/principal/face-review/students', {
          headers,
          params: {
            status: statusFilter,
            class_grade: classFilter || undefined,
            section: sectionFilter || undefined,
            search: search || undefined,
            page: p,
            page_size: PAGE_SIZE,
          },
        });
        setStudents(r.data.items || []);
        setTotal(r.data.total || 0);
      } else {
        const r = await API.get('/principal/face-review/staff', {
          headers,
          params: { status: statusFilter, search: search || undefined, page: p, page_size: PAGE_SIZE },
        });
        setStaff(r.data.items || []);
        setTotal(r.data.total || 0);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load data');
    } finally { setLoading(false); }
  }, [activeTab, statusFilter, classFilter, sectionFilter, search]);

  const loadSummary = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const r = await API.get('/principal/face-review/summary', { headers });
      setSummary(r.data);
    } catch {}
  }, []);

  useEffect(() => { setPage(1); load(1); }, [activeTab, statusFilter, classFilter, sectionFilter, load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1); }, 400); return () => clearTimeout(t); }, [search, load]);

  const onPhotoSuccess = (id: string, _embeddingSynced: boolean) => {
    setResolved(prev => ({ ...prev, [id]: true }));
    loadSummary();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const items = activeTab === 'students' ? students : staff;
  const stu = summary.students || {};
  const stf = summary.staff || {};

  const baseUrl = (API.defaults.baseURL || '').replace(/\/api\/?$/, '');

  const statusFilters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'no_photo', label: '❌ No Photo' },
    { key: 'no_embedding', label: '⚠️ No Embed' },
    { key: 'needs_review', label: '🔄 Needs Review' },
  ];

  const renderPersonCard = (item: PersonItem) => {
    const id = activeTab === 'students' ? item.roll_no! : item.employee_id!;
    const isResolved = !!resolved[id];
    const isStaff = activeTab === 'staff';

    let badgeBg: string, badgeColor: string, BadgeIcon: any, badgeLabel: string;
    if (isResolved || item.has_embedding) {
      badgeBg = Theme.colors.successBg; badgeColor = Theme.colors.success;
      BadgeIcon = CheckCircle; badgeLabel = 'Detected';
    } else if (!item.has_photo) {
      badgeBg = Theme.colors.errorBg; badgeColor = Theme.colors.error;
      BadgeIcon = XCircle; badgeLabel = 'No Photo';
    } else {
      badgeBg = Theme.colors.warningBg; badgeColor = Theme.colors.warning;
      BadgeIcon = AlertTriangle; badgeLabel = 'No Embed';
    }

    return (
      <View key={id} style={styles.card}>
        <View style={styles.photoArea}>
          {item.photo_url ? (
            <Image source={{ uri: `${baseUrl}${item.photo_url}` }} style={styles.photo} onError={() => {}} />
          ) : (
            <View style={styles.noPhotoWrap}>
              {isStaff
                ? <Briefcase size={30} color={Theme.colors.textMuted} style={{ opacity: 0.3 }} />
                : <User size={30} color={Theme.colors.textMuted} style={{ opacity: 0.3 }} />}
              <Text style={styles.noPhotoText}>No photo</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <BadgeIcon size={10} color={badgeColor} />
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {isStaff
              ? `${item.designation || 'Staff'}${item.department ? ` · ${item.department}` : ''} · ${id}`
              : `Class ${item.class_grade}-${item.section} · ${id}`}
          </Text>
          {isResolved ? (
            <View style={styles.resolvedRow}>
              <CheckCircle size={12} color={Theme.colors.success} />
              <Text style={[styles.resolvedText, { color: Theme.colors.success }]}>Photo Updated ✓</Text>
            </View>
          ) : (
            <View style={styles.btnCol}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: !item.has_photo ? Theme.colors.error : '#f59e0b' }]}
                onPress={() => setModal({ id, name: item.name, type: isStaff ? 'Staff' : 'Student' })}>
                <UploadCloud size={11} color="#fff" />
                <Text style={styles.actionBtnText}>{!item.has_photo ? 'Upload Photo' : 'Update Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#0f172a' }]}
                onPress={() => setModal({ id, name: item.name, type: isStaff ? 'Staff' : 'Student' })}>
                <Camera size={11} color="#fff" />
                <Text style={styles.actionBtnText}>Live Capture</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const selectedClassObj = classes.find(c => c.class_grade === classFilter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Header */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
          borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Scan size={18} color="#fff" />
          <View>
            <Text style={styles.headerTitle}>Face Photo Review</Text>
            <Text style={styles.headerSub}>Principal Control</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => load(page)} style={styles.refreshBtn}>
          <RefreshCw size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Summary stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {[
            { label: 'Total People', val: (stu.total || 0) + (stf.total || 0), color: Theme.colors.text },
            { label: '❌ No Photo', val: (stu.no_photo || 0) + (stf.no_photo || 0), color: Theme.colors.error },
            { label: '⚠️ Not Detected', val: (stu.no_embedding || 0) + (stf.no_embedding || 0), color: Theme.colors.warning },
            { label: '🔄 Needs Review', val: (stu.needs_review || 0) + (stf.needs_review || 0), color: Theme.colors.violet },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['students', 'staff'] as ActiveTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => { setActiveTab(tab); setPage(1); }}>
              {tab === 'students'
                ? <Users size={15} color={activeTab === tab ? Theme.colors.primary : Theme.colors.textMuted} />
                : <Briefcase size={15} color={activeTab === tab ? Theme.colors.primary : Theme.colors.textMuted} />}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'students' ? 'Students' : 'Staff'}{' '}
                <Text style={styles.tabCount}>
                  ({tab === 'students' ? (stu.total || 0) : (stf.total || 0)})
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={15} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}…`}
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {statusFilters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, statusFilter === f.key && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}>
              <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Class filter (students only) */}
        {activeTab === 'students' && classes.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.chip, classFilter === '' && styles.chipActive]}
                onPress={() => { setClassFilter(''); setSectionFilter(''); }}>
                <Text style={[styles.chipText, classFilter === '' && styles.chipTextActive]}>All Classes</Text>
              </TouchableOpacity>
              {classes.map(c => (
                <TouchableOpacity
                  key={c.class_grade}
                  style={[styles.chip, classFilter === c.class_grade && styles.chipActive]}
                  onPress={() => { setClassFilter(c.class_grade); setSectionFilter(''); }}>
                  <Text style={[styles.chipText, classFilter === c.class_grade && styles.chipTextActive]}>{c.class_grade}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {classFilter && selectedClassObj && selectedClassObj.sections.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.chip, sectionFilter === '' && styles.chipActive]}
                  onPress={() => setSectionFilter('')}>
                  <Text style={[styles.chipText, sectionFilter === '' && styles.chipTextActive]}>All Sections</Text>
                </TouchableOpacity>
                {selectedClassObj.sections.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, sectionFilter === s && styles.chipActive]}
                    onPress={() => setSectionFilter(s)}>
                    <Text style={[styles.chipText, sectionFilter === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {/* Result count */}
        <Text style={styles.resultInfo}>
          Showing {items.length} of {total} {activeTab}
          {statusFilter !== 'all' ? ` · "${statusFilter}"` : ''}
        </Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={15} color={Theme.colors.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {/* Grid */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <CheckCircle size={48} color={Theme.colors.success} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptyText}>Try changing filters or refreshing.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map(item => renderPersonCard(item))}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              onPress={() => { const p = page - 1; setPage(p); load(p); }}
              disabled={page === 1}>
              <ChevronLeft size={16} color={page === 1 ? Theme.colors.textMuted : Theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
              onPress={() => { const p = page + 1; setPage(p); load(p); }}
              disabled={page === totalPages}>
              <ChevronRight size={16} color={page === totalPages ? Theme.colors.textMuted : Theme.colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {modal ? (
        <PhotoUploadModal target={modal} onClose={() => setModal(null)} onSuccess={onPhotoSuccess} />
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  header: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    gap: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  refreshBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  statsScroll: { marginBottom: 16 },
  statCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 3, fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.border,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
  tabActive: { borderBottomColor: Theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Theme.colors.textMuted },
  tabTextActive: { color: Theme.colors.primary },
  tabCount: { fontWeight: '400', fontSize: 12 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Theme.colors.text },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  chipText: { fontSize: 12, color: Theme.colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  resultInfo: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 10 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBoxText: { flex: 1, color: Theme.colors.error, fontSize: 13 },

  centered: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: Theme.colors.textMuted, fontSize: 14, marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Theme.colors.text, textAlign: 'center' },
  emptyText: { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: {
    width: '47%',
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoArea: {
    height: 130,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  noPhotoWrap: { alignItems: 'center', gap: 4 },
  noPhotoText: { fontSize: 11, color: Theme.colors.textMuted },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '700', color: Theme.colors.text },
  cardSub: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 8 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  resolvedText: { fontSize: 12, fontWeight: '700' },
  btnCol: { gap: 5 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 7,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageInfo: { fontSize: 13, fontWeight: '600', color: Theme.colors.text },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 18, width: '100%', maxWidth: 440,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  modalTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.text },
  modalSubtitle: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2 },
  closeX: { fontSize: 20, color: Theme.colors.textMuted, paddingHorizontal: 4 },
  modalBody: { padding: 16 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { flex: 1, color: Theme.colors.error, fontSize: 13 },
  previewWrap: { alignItems: 'center', gap: 6, marginBottom: 14 },
  previewImg: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: Theme.colors.success },
  previewName: { fontSize: 13, fontWeight: '600', color: Theme.colors.text, maxWidth: 220 },
  previewHint: { fontSize: 11, color: Theme.colors.textMuted },
  emptyPreview: { height: 130, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 2, borderColor: Theme.colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 },
  emptyPreviewText: { fontSize: 14, color: Theme.colors.textMuted },
  emptyPreviewHint: { fontSize: 11, color: Theme.colors.textMuted },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Theme.colors.primary, borderRadius: 8, paddingVertical: 10 },
  pickBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  outlineBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: Theme.colors.text },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});