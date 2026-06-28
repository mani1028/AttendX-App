import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  UploadCloud,
  Camera,
  CalendarCheck,
  Clock,
  Bell,
  User,
  Scan,
} from 'lucide-react-native';
import API from '../../services/api';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';

import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';



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

const getTeacherEmployeeId = async (): Promise<string | null> => {
  try {
    const raw = (await AsyncStorage.getItem('user')) || '{}';
    const u = JSON.parse(raw);
    return (
      u.employee_id ||
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
      null
    );
  } catch {
    return (
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
      null
    );
  }
};

function daysSince(iso: string | null): number | null {
  if (!iso) {return null;}
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/* ── Types ── */
interface StudentItem {
  roll_no: string;
  name: string;
  has_photo: boolean;
  has_embedding: boolean;
  photo_url?: string | null;
}

interface ClassOption {
  class_grade: string;
  section: string;
}

interface ReviewData {
  items: StudentItem[];
  total: number;
  class_grade: string | null;
  section: string | null;
  teacher_name: string | null;
  teacher_employee_id: string | null;
  last_review: string | null;
  assigned_classes: ClassOption[];
  selected_all?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   PHOTO UPLOAD MODAL
───────────────────────────────────────────────────────────── */
interface PhotoModalProps {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
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
      if (asset?.uri) {
        setPreview(asset.uri);
        setFileName(asset.fileName || 'photo.jpg');
        setError('');
      }
    });
  };

  const captureImage = () => {
    launchCamera({ mediaType: 'photo', quality: 0.9, cameraType: 'front' }, (res) => {
      if (res.didCancel) {return;}
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setPreview(asset.uri);
        setFileName(asset.fileName || `capture_${target?.id}.jpg`);
        setError('');
      }
    });
  };

  const handleUpload = async () => {
    if (!preview || !target) {return;}
    setUploading(true);
    setError('');
    try {
      const headers = await getHeaders();
      const fd = new FormData();
      fd.append('photo', {
        uri: preview,
        type: 'image/jpeg',
        name: fileName || 'photo.jpg',
      } as any);
      const res = await API.post(
        `/profile-photo/upload/student/${encodeURIComponent(target.id)}`,
        fd,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } },
      );
      if (res.data?.ok) {
        onSuccess(target.id);
        onClose();
      } else {
        setError(res.data?.detail || 'Upload failed');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <UploadCloud size={18} color={Theme.colors.primary} />
              <Text style={styles.modalTitle}>Update Photo — {target?.name}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} disabled={uploading}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            {error ? (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color={Theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Preview area */}
            {preview ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: preview }} style={styles.previewImg} />
                <Text style={styles.previewName} numberOfLines={1}>{fileName}</Text>
                <Text style={styles.previewHint}>Tap buttons below to change</Text>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <User size={40} color={Theme.colors.textMuted} style={{ opacity: 0.35 }} />
                <Text style={styles.emptyPreviewText}>No photo selected</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.pickRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                <UploadCloud size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.pickBtn, { backgroundColor: Theme.colors.text }]} onPress={captureImage} disabled={uploading}>
                <Camera size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity accessibilityRole="button" style={styles.outlineBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.primaryBtn, (!preview || uploading) && { opacity: 0.45 }]}
              onPress={handleUpload}
              disabled={!preview || uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <>
                  <UploadCloud size={14} color={Theme.colors.card} />
                  <Text style={styles.primaryBtnText}>Save Photo</Text>
                </>
              )}
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
export default function TeacherFaceReviewScreen() {
  const navigation = useNavigation();

  const [data, setData] = useState<ReviewData>({
    items: [],
    total: 0,
    class_grade: null,
    section: null,
    teacher_name: null,
    teacher_employee_id: null,
    last_review: null,
    assigned_classes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'no_photo' | 'no_embedding'>('all');
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [modal, setModal] = useState<{ id: string; name: string } | null>(null);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [logging, setLogging] = useState(false);
  const [logDone, setLogDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getHeaders();
      const params: Record<string, any> = {
        status: statusFilter,
        page: 1,
        page_size: 200,
      };
      if (search) {params.search = search;}
      if (selectedAll) {params.class_grade = 'ALL';}
      else if (selectedClass) {
        params.class_grade = selectedClass.class_grade;
        params.section = selectedClass.section;
      }
      const r = await API.get('/staff/face-review/my-class', { headers, params });
      const empId = r.data.teacher_employee_id || (await getTeacherEmployeeId());
      setData({ ...r.data, teacher_employee_id: empId });

      // Fix infinite loading loop: only update if value actually changed
      if (r.data.selected_all) {
        if (!selectedAll) {
          setSelectedAll(true);
          setSelectedClass(null);
        }
      } else if (r.data.class_grade) {
        const currentClassGrade = selectedClass?.class_grade;
        const currentSection = selectedClass?.section;
        if (selectedAll || currentClassGrade !== r.data.class_grade || currentSection !== r.data.section) {
          setSelectedAll(false);
          setSelectedClass({ class_grade: r.data.class_grade, section: r.data.section });
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load class data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, selectedAll, selectedClass]);

  // Unified load effect with debouncing for search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      load();
    }, search ? 400 : 0);
    return () => clearTimeout(delayDebounce);
  }, [statusFilter, selectedAll, selectedClass, search, load]);

  const handleMarkComplete = async () => {
    setLogging(true);
    try {
      const headers = await getHeaders();
      const params = selectedAll
        ? { class_grade: 'ALL' }
        : selectedClass
        ? { class_grade: selectedClass.class_grade, section: selectedClass.section }
        : {};
      await API.post('/staff/face-review/log-review', {}, { headers, params });
      setLogDone(true);
      setData(prev => ({ ...prev, last_review: new Date().toISOString() }));
      Alert.alert('Success', 'Quarterly review marked complete! Next review due in 90 days.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to log review');
    } finally {
      setLogging(false);
    }
  };

  const onPhotoSuccess = (id: string) => {
    setResolved(prev => ({ ...prev, [id]: true }));
    load();
  };

  const days = daysSince(data.last_review);
  const isOverdue = days === null || days >= 90;
  const isSoon = days !== null && days >= 60 && days < 90;
  const items = data.items || [];
  const noIssues = items.filter(i => !i.has_photo || !i.has_embedding).length;

  const statusFilters: Array<{ key: typeof statusFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'no_photo', label: '❌ No Photo' },
    { key: 'no_embedding', label: '⚠️ No Embed' },
  ];

  const bannerColor = isOverdue
    ? ['#7f1d1d', '#991b1b']
    : isSoon
    ? ['#78350f', '#92400e']
    : ['#064e3b', '#065f46'];

  const renderItem = ({ item }: { item: StudentItem }) => {
    const isResolved = !!resolved[item.roll_no];
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

    const baseUrl = (API.defaults.baseURL || '').replace(/\/api\/?$/, '');

    return (
      <View style={styles.card}>
        <View style={styles.photoArea}>
          {item.photo_url ? (
            <Image
              source={{ uri: `${baseUrl}${item.photo_url}` }}
              style={styles.photo}
              onError={() => {}}
            />
          ) : (
            <View style={styles.noPhotoWrap}>
              <User size={32} color={Theme.colors.textMuted} style={{ opacity: 0.3 }} />
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
          <Text style={styles.cardSub}>{item.roll_no}</Text>
          {isResolved ? (
            <View style={styles.resolvedRow}>
              <CheckCircle size={12} color={Theme.colors.success} />
              <Text style={[styles.resolvedText, { color: Theme.colors.success }]}>Updated ✓</Text>
            </View>
          ) : (
            <View style={styles.btnCol}>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.actionBtn, { backgroundColor: !item.has_photo ? Theme.colors.error : '#f59e0b' }]}
                onPress={() => setModal({ id: item.roll_no, name: item.name })}>
                <UploadCloud size={11} color={Theme.colors.card} />
                <Text style={styles.actionBtnText}>{!item.has_photo ? 'Upload Photo' : 'Update Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.actionBtn, { backgroundColor: Theme.colors.text }]}
                onPress={() => setModal({ id: item.roll_no, name: item.name })}>
                <Camera size={11} color={Theme.colors.card} />
                <Text style={styles.actionBtnText}>Live Capture</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Face Photo Review"
        subtitle={data.class_grade ? `Class ${data.class_grade}${data.section ? `-${data.section}` : ''}` : 'Review student face photos'}
        onBackPress={() => navigation.goBack()}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={load}
            accessibilityLabel="Refresh face review list"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={[styles.scroll, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[styles.scrollContent, innerPageLayoutStyles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={innerPageLayoutStyles.contentFront}>

        {/* Teacher info */}
        {data.teacher_name ? (
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherName}>{data.teacher_name}</Text>
            {data.teacher_employee_id ? (
              <Text style={styles.teacherEmp}>Employee ID: {data.teacher_employee_id}</Text>
            ) : null}
            {data.class_grade ? (
              <Text style={styles.teacherClass}>Class {data.class_grade}{data.section ? `-${data.section}` : ''}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Quarterly review banner */}
        {!loading && data.class_grade ? (
          <View style={[styles.banner, { backgroundColor: bannerColor[0] }]}>
            <View style={styles.bannerLeft}>
              {isOverdue ? <Bell size={18} color={Theme.colors.card} /> : isSoon ? <Clock size={18} color={Theme.colors.card} /> : <CalendarCheck size={18} color={Theme.colors.card} />}
              <Text style={styles.bannerTitle}>
                {isOverdue
                  ? days === null ? 'First Face Review Needed' : `Review Overdue — ${days} days ago`
                  : isSoon
                  ? `Review Due Soon — ${days} days ago`
                  : `Up to Date — ${days} days ago`}
              </Text>
              <Text style={styles.bannerSub}>
                {isOverdue
                  ? 'Review all student photos below and tap "Mark Complete".'
                  : isSoon
                  ? 'Upcoming quarterly review. Verify photos and mark complete.'
                  : `Next review due in ${90 - (days || 0)} days.`}
              </Text>
              {noIssues > 0 ? (
                <Text style={styles.bannerWarn}>⚠️ {noIssues} student{noIssues !== 1 ? 's' : ''} need photo updates</Text>
              ) : null}
            </View>
            {(isOverdue || isSoon) ? (
              <TouchableOpacity accessibilityRole="button"
                style={styles.bannerBtn}
                onPress={handleMarkComplete}
                disabled={logging || logDone}>
                <CalendarCheck size={14} color={Theme.colors.card} />
                <Text style={styles.bannerBtnText}>{logging ? 'Saving…' : logDone ? '✓ Done' : 'Mark Complete'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Stats pills */}
        {!loading && items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            {[
              { label: 'Total', val: items.length, color: Theme.colors.text },
              { label: '✅ Detected', val: items.filter(i => i.has_embedding || resolved[i.roll_no]).length, color: Theme.colors.success },
              { label: '❌ No Photo', val: items.filter(i => !i.has_photo && !resolved[i.roll_no]).length, color: Theme.colors.error },
              { label: '⚠️ No Embed', val: items.filter(i => i.has_photo && !i.has_embedding && !resolved[i.roll_no]).length, color: Theme.colors.warning },
              { label: 'Updated', val: Object.keys(resolved).length, color: Theme.colors.primary },
            ].map(s => (
              <View key={s.label} style={styles.statPill}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Search + filters */}
        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <Search size={15} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student…"
              placeholderTextColor={Theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Class selector */}
        {(data.assigned_classes || []).length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
            {(data.assigned_classes || []).length > 1 ? (
              <TouchableOpacity accessibilityRole="button"
                style={[styles.classChip, selectedAll && styles.classChipActive]}
                onPress={() => { setSelectedAll(true); setSelectedClass(null); }}>
                <Text style={[styles.classChipText, selectedAll && styles.classChipTextActive]}>All Classes</Text>
              </TouchableOpacity>
            ) : null}
            {(data.assigned_classes || []).map((ac, i) => {
              const active = !selectedAll && selectedClass?.class_grade === ac.class_grade && selectedClass?.section === ac.section;
              return (
                <TouchableOpacity accessibilityRole="button"
                  key={i}
                  style={[styles.classChip, active && styles.classChipActive]}
                  onPress={() => { setSelectedAll(false); setSelectedClass(ac); }}>
                  <Text style={[styles.classChipText, active && styles.classChipTextActive]}>
                    Class {ac.class_grade}{ac.section ? `-${ac.section}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Status filter chips */}
        <View style={styles.statusChips}>
          {statusFilters.map(f => (
            <TouchableOpacity accessibilityRole="button"
              key={f.key}
              style={[styles.chip, statusFilter === f.key && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}>
              <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={15} color={Theme.colors.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {/* Content */}
        {loading ? (
          <View style={[styles.centered, { minHeight: 300 }]}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Loading your class…</Text>
          </View>
        ) : !data.class_grade && !selectedAll ? (
          <View style={styles.centered}>
            <User size={48} color={Theme.colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No class assigned</Text>
            <Text style={styles.emptyText}>Ask the principal to assign you to a class.</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <CheckCircle size={48} color={Theme.colors.success} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>No students match this filter</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map(item => renderItem({ item }))}
          </View>
        )}

        {/* Bottom mark complete */}
        {!loading && items.length > 0 && (isOverdue || isSoon) && !logDone ? (
          <TouchableOpacity accessibilityRole="button"
            style={styles.markCompleteBtn}
            onPress={handleMarkComplete}
            disabled={logging}>
            <CalendarCheck size={18} color={Theme.colors.card} />
            <Text style={styles.markCompleteBtn}>
              {logging ? 'Saving…' : '✓ Mark Quarterly Review Complete'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {logDone ? (
          <View style={styles.logDoneBox}>
            <CheckCircle size={20} color={Theme.colors.success} />
            <Text style={styles.logDoneText}>Quarterly review marked complete! Next review due in 90 days.</Text>
          </View>
        ) : null}
        </View>
      </ScrollView>

      {/* Photo Modal */}
      {modal ? (
        <PhotoUploadModal target={modal} onClose={() => setModal(null)} onSuccess={onPhotoSuccess} />
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  scroll: { flex: 1 },
  scrollContent: { padding: Theme.spacing.md, paddingBottom: 40 },

  teacherInfo: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.sm,
  },
  teacherName: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  teacherEmp: { fontSize: 13, color: Theme.colors.textMuted, marginTop: Theme.spacing.xs },
  teacherClass: { ...Theme.typography.bodyMd, color: Theme.colors.primary, fontWeight: '700', marginTop: Theme.spacing.xs },

  banner: {
    borderRadius: 14,
    padding: Theme.spacing.md,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerLeft: { flex: 1, gap: 4 },
  bannerTitle: { color: Theme.colors.card, ...Theme.typography.body, fontWeight: '800', marginTop: Theme.spacing.xs },
  bannerSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13 },
  bannerWarn: { color: 'rgba(255,255,255,0.9)', ...Theme.typography.caption, marginTop: Theme.spacing.xs },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  bannerBtnText: { color: Theme.colors.card, fontWeight: '700', fontSize: 13 },

  statsScroll: { marginBottom: 14 },
  statPill: {
    backgroundColor: Theme.colors.card,
    borderRadius: 10,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { ...Theme.typography.label, color: Theme.colors.textMuted, marginTop: 2 },

  filterRow: { flexDirection: 'row', marginBottom: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, ...Theme.typography.body, color: Theme.colors.text },

  classScroll: { marginBottom: 10 },
  classChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    marginRight: Theme.spacing.sm,
  },
  classChipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  classChipText: { fontSize: 13, color: Theme.colors.textMuted, fontWeight: '600' },
  classChipTextActive: { color: Theme.colors.card },

  statusChips: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
  },
  chipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  chipText: { ...Theme.typography.caption, color: Theme.colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.card },

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

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 12 },
  loadingText: { color: Theme.colors.textMuted, ...Theme.typography.body, marginTop: Theme.spacing.sm },
  emptyTitle: { ...Theme.typography.bodyMd, fontWeight: '700', color: Theme.colors.text, textAlign: 'center' },
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
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  noPhotoWrap: { alignItems: 'center', gap: 4 },
  noPhotoText: { ...Theme.typography.label, color: Theme.colors.textMuted },
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
  cardSub: { ...Theme.typography.label, color: Theme.colors.textMuted, marginBottom: Theme.spacing.sm },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  resolvedText: { ...Theme.typography.caption, fontWeight: '700' },
  btnCol: { gap: 5 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 7,
  },
  actionBtnText: { color: Theme.colors.card, ...Theme.typography.label, fontWeight: '700' },

  markCompleteBtn: {
    marginTop: Theme.spacing.lg,
    backgroundColor: Theme.colors.success,
    borderRadius: 12,
    paddingVertical: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  logDoneBox: {
    marginTop: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.successBg,
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: `${Theme.colors.success}30`,
  },
  logDoneText: { ...Theme.typography.body, flex: 1, color: Theme.colors.success, fontWeight: '700' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
  },
  modalBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text, flex: 1, marginLeft: 6 },
  closeX: { fontSize: 20, color: Theme.colors.textMuted, paddingHorizontal: Theme.spacing.xs },
  modalBody: { padding: Theme.spacing.md },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.errorBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: Theme.colors.error, fontSize: 13 },
  previewWrap: { alignItems: 'center', gap: 6, marginBottom: 14 },
  previewImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Theme.colors.success },
  previewName: { fontSize: 13, fontWeight: '600', color: Theme.colors.text, maxWidth: 200 },
  previewHint: { ...Theme.typography.label, color: Theme.colors.textMuted },
  emptyPreview: {
    height: 120,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  emptyPreviewText: { fontSize: 13, color: Theme.colors.textMuted },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  pickBtnText: { color: Theme.colors.card, fontSize: 13, fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  outlineBtn: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: Theme.colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  primaryBtnText: { color: Theme.colors.card, fontSize: 13, fontWeight: '700' },
});
