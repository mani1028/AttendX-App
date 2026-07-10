import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Image, ActivityIndicator } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
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
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import { principalFaceReviewStyles as styles } from '../../components/principal/principalFaceReview/principalFaceReviewStyles';



/* ── helpers ── */
const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
  const tok = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
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
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (res) => {
      if (res.didCancel) {return;}
      const asset = res.assets?.[0];
      if (asset?.uri) { setPreview(asset.uri); setFileName(asset.fileName || 'photo.jpg'); setError(''); }
    });
  };

  const captureImage = () => {
    launchCamera({ mediaType: 'photo', quality: 0.9, cameraType: 'front' }, (res) => {
      if (res.didCancel) {return;}
      const asset = res.assets?.[0];
      if (asset?.uri) { setPreview(asset.uri); setFileName(asset.fileName || `capture_${target?.id}.jpg`); setError(''); }
    });
  };

  const handleUpload = async () => {
    if (!preview || !target) {return;}
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
      else {setError(res.data?.detail || 'Upload failed');}
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
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
            <TouchableOpacity accessibilityRole="button" onPress={onClose} disabled={uploading}>
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
              <TouchableOpacity accessibilityRole="button" style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                <UploadCloud size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>📁 Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.pickBtn, { backgroundColor: Theme.colors.text }]} onPress={captureImage} disabled={uploading}>
                <Camera size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>📷 Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity accessibilityRole="button" style={styles.outlineBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.primaryBtn, (!preview || uploading) && { opacity: 0.45 }]}
              onPress={handleUpload}
              disabled={!preview || uploading}>
              {uploading
                ? <ActivityIndicator size="small" color={Theme.colors.card} />
                : <><UploadCloud size={14} color={Theme.colors.card} /><Text style={styles.primaryBtnText}>Save Photo</Text></>}
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
          if (!g) {return;}
          if (!map[g]) {map[g] = new Set();}
          if (row.section) {map[g].add(row.section);}
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
            <Image source={{ uri: normalizePhotoUri(item.photo_url) || '' }} style={styles.photo} onError={() => {}} />
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
              <TouchableOpacity accessibilityRole="button"
                style={[styles.actionBtn, { backgroundColor: !item.has_photo ? Theme.colors.error : Theme.colors.warning }]}
                onPress={() => setModal({ id, name: item.name, type: isStaff ? 'Staff' : 'Student' })}>
                <UploadCloud size={11} color={Theme.colors.card} />
                <Text style={styles.actionBtnText}>{!item.has_photo ? 'Upload Photo' : 'Update Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.actionBtn, { backgroundColor: Theme.colors.text }]}
                onPress={() => setModal({ id, name: item.name, type: isStaff ? 'Staff' : 'Student' })}>
                <Camera size={11} color={Theme.colors.card} />
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


      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Face Photo Review"
        subtitle="Principal Control"
        onBackPress={() => navigation.goBack()}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={() => load(page)}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={18} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

        <View style={innerPageLayoutStyles.contentFront}>

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
        <View style={[innerPageLayoutStyles.segmentedControl, styles.tabs]}>
          {(['students', 'staff'] as ActiveTab[]).map(tab => (
            <TouchableOpacity accessibilityRole="button"
              key={tab}
              style={[innerPageLayoutStyles.segmentedTab, activeTab === tab && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => { setActiveTab(tab); setPage(1); }}>
              {tab === 'students'
                ? <Users size={15} color={segmentedControlIconColor(activeTab === tab)} />
                : <Briefcase size={15} color={segmentedControlIconColor(activeTab === tab)} />}
              <Text style={[innerPageLayoutStyles.segmentedTabText, activeTab === tab && innerPageLayoutStyles.segmentedTabTextActive]}>
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
            <TouchableOpacity accessibilityRole="button"
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Theme.spacing.sm }}>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.chip, classFilter === '' && styles.chipActive]}
                onPress={() => { setClassFilter(''); setSectionFilter(''); }}>
                <Text style={[styles.chipText, classFilter === '' && styles.chipTextActive]}>All Classes</Text>
              </TouchableOpacity>
              {classes.map(c => (
                <TouchableOpacity accessibilityRole="button"
                  key={c.class_grade}
                  style={[styles.chip, classFilter === c.class_grade && styles.chipActive]}
                  onPress={() => { setClassFilter(c.class_grade); setSectionFilter(''); }}>
                  <Text style={[styles.chipText, classFilter === c.class_grade && styles.chipTextActive]}>{c.class_grade}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {classFilter && selectedClassObj && selectedClassObj.sections.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Theme.spacing.sm }}>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.chip, sectionFilter === '' && styles.chipActive]}
                  onPress={() => setSectionFilter('')}>
                  <Text style={[styles.chipText, sectionFilter === '' && styles.chipTextActive]}>All Sections</Text>
                </TouchableOpacity>
                {selectedClassObj.sections.map(s => (
                  <TouchableOpacity accessibilityRole="button"
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
            <ScreenSkeleton variant="list" />
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
            <TouchableOpacity accessibilityRole="button"
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              onPress={() => { const p = page - 1; setPage(p); load(p); }}
              disabled={page === 1}>
              <ChevronLeft size={16} color={page === 1 ? Theme.colors.textMuted : Theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
              onPress={() => { const p = page + 1; setPage(p); load(p); }}
              disabled={page === totalPages}>
              <ChevronRight size={16} color={page === totalPages ? Theme.colors.textMuted : Theme.colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
        </View>
      </ScrollView>

      {modal ? (
        <PhotoUploadModal target={modal} onClose={() => setModal(null)} onSuccess={onPhotoSuccess} />
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
