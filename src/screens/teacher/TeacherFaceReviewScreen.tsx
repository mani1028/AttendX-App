import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
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
import { teacherFaceReviewStyles as styles } from '../../components/teacher/teacherFaceReview/teacherFaceReviewStyles';
import PhotoUploadModal from '../../components/teacher/teacherFaceReview/PhotoUploadModal';
import { getHeaders, getTeacherEmployeeId, daysSince } from '../../components/teacher/teacherFaceReview/helpers';
import type { StudentItem, ClassOption, ReviewData } from '../../components/teacher/teacherFaceReview/types';




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
                style={[styles.actionBtn, { backgroundColor: !item.has_photo ? Theme.colors.error : Theme.colors.warning }]}
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
      <ScrollView
        style={[styles.scroll, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          title="Face Photo Review"
          subtitle={data.class_grade ? `Class ${data.class_grade}${data.section ? `-${data.section}` : ''}` : 'Review student face photos'}
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
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
        <View style={innerPageLayoutStyles.scrollBody}>

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
            <ScreenSkeleton variant="list" />
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
