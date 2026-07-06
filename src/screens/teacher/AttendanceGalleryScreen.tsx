import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, ChevronRight, Calendar, User, Users } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { Theme } from '../../theme/tokens';
import API from '../../services/api';
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';
import * as teacherService from '../../services/teacherService';

const { width: SCREEN_W } = Dimensions.get('window');

type GalleryImage = {
  url: string;
  session_label?: string;
  filename?: string;
};

export default function AttendanceGalleryScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [classSections, setClassSections] = useState<Array<{ class_name: string; sections: string[] }>>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const dateStr = date.toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      setSchoolCode((await AsyncStorage.getItem('school_code')) || '');
      setBranchId((await AsyncStorage.getItem('branch_id')) || '');
      setEmployeeId(
        (await AsyncStorage.getItem('employee_id')) ||
        (await AsyncStorage.getItem('teacher_id')) ||
        '',
      );
    };
    load();
  }, []);

  useEffect(() => {
    if (!schoolCode || !branchId) { return; }
    teacherService.getClassesSections(branchId, schoolCode).then(data => {
      const items = Array.isArray(data?.items) ? data.items : [];
      const grouped = new Map<string, Set<string>>();
      items.forEach((item: any) => {
        const cls = String(item?.class_name ?? item?.class_grade ?? '').trim();
        if (!cls) { return; }
        const secs = Array.isArray(item?.sections) ? item.sections : [item?.section].filter(Boolean);
        if (!grouped.has(cls)) { grouped.set(cls, new Set()); }
        secs.forEach((s: string) => grouped.get(cls)!.add(String(s).trim()));
      });
      setClassSections(Array.from(grouped.entries()).map(([class_name, sections]) => ({
        class_name,
        sections: Array.from(sections),
      })));
    }).catch(() => setClassSections([]));
  }, [schoolCode, branchId]);

  const normalizeImages = (data: any, fallback: string): GalleryImage[] => {
    const mediaFiles = Array.isArray(data?.media_files) ? data.media_files : [];
    const raw = mediaFiles.length > 0
      ? mediaFiles.filter((f: any) => String(f.file_type || '').toLowerCase() === 'image')
      : (Array.isArray(data?.images) ? data.images : []);

    return raw.map((item: any) => {
      if (typeof item === 'string') {
        const url = normalizePhotoUri(item) || item;
        return { url, session_label: 'Session 1' };
      }
      const url = normalizePhotoUri(
        item.view_url || item.download_url || item.local_url || item.url || '',
      );
      return {
        url: url || '',
        session_label: item.session_label || `Session ${item.attendance_session || 1}`,
        filename: item.file_name || item.display_filename || fallback,
      };
    }).filter((img: GalleryImage) => Boolean(img.url));
  };

  const fetchImages = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    setLoading(true);
    setError('');
    setImages([]);
    try {
      if (activeTab === 'teacher') {
        if (!employeeId) {
          setError('Missing employee ID');
          return;
        }
        const res = await API.get('manage/attendance/staff/images', {
          params: {
            school_code: schoolCode,
            branch_id: branchId,
            employee_id: employeeId,
            class_grade: selectedClass,
            section: selectedSection,
            attendance_date: dateStr,
          },
        });
        const normalized = normalizeImages(res.data, 'teacher_attendance.jpg');
        setImages(normalized);
        if (!normalized.length) { setError('No teacher verification images for this date'); }
      } else {
        if (!selectedClass || !selectedSection) {
          setError('Select class and section');
          return;
        }
        const res = await API.get('manage/attendance/student/attendance-images', {
          params: {
            school_code: schoolCode,
            branch_id: branchId,
            class_grade: selectedClass,
            section: selectedSection,
            attendance_date: dateStr,
          },
        });
        const normalized = normalizeImages(res.data, 'student_attendance.jpg');
        setImages(normalized);
        if (!normalized.length) { setError('No student attendance images for this date'); }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }, [activeTab, schoolCode, branchId, employeeId, selectedClass, selectedSection, dateStr]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const sectionOptions = classSections.find(c => c.class_name === selectedClass)?.sections || [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.content]}
      >
        <StandardPageHeader
          title="Attendance Gallery"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
        <View style={[innerPageLayoutStyles.segmentedControl, styles.tabs]}>
          <TouchableOpacity
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'teacher' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setActiveTab('teacher')}
          >
            <User size={16} color={segmentedControlIconColor(activeTab === 'teacher')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'teacher' && innerPageLayoutStyles.segmentedTabTextActive]}>Teacher</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'student' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setActiveTab('student')}
          >
            <Users size={16} color={segmentedControlIconColor(activeTab === 'student')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'student' && innerPageLayoutStyles.segmentedTabTextActive]}>Students</AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Calendar size={18} color={Theme.colors.primary} />
          <AppText style={styles.dateText}>{dateStr}</AppText>
        </TouchableOpacity>

        {activeTab === 'student' && (
          <View style={styles.filters}>
            <TouchableOpacity style={styles.filterChip} onPress={() => setClassPickerOpen(true)}>
              <AppText style={styles.filterText}>{selectedClass || 'Select Class'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip} onPress={() => selectedClass && setSectionPickerOpen(true)}>
              <AppText style={styles.filterText}>{selectedSection || 'Section'}</AppText>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 32 }} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <View style={styles.grid}>
            {images.map((img, idx) => (
              <TouchableOpacity
                key={`${img.url}-${idx}`}
                style={styles.thumbWrap}
                onPress={() => { setPreviewIndex(idx); setPreviewOpen(true); }}
              >
                <Image source={{ uri: img.url }} style={styles.thumb} resizeMode="cover" />
                <AppText style={styles.thumbLabel} numberOfLines={1}>{img.session_label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) { setDate(d); }
          }}
        />
      )}

      <CustomPickerModal
        visible={classPickerOpen}
        title="Select Class"
        options={classSections.map(c => ({ label: c.class_name, value: c.class_name }))}
        selectedValue={selectedClass}
        onValueChange={v => { setSelectedClass(v); setSelectedSection(''); setClassPickerOpen(false); }}
        onClose={() => setClassPickerOpen(false)}
      />
      <CustomPickerModal
        visible={sectionPickerOpen}
        title="Select Section"
        options={sectionOptions.map(s => ({ label: s, value: s }))}
        selectedValue={selectedSection}
        onValueChange={v => { setSelectedSection(v); setSectionPickerOpen(false); }}
        onClose={() => setSectionPickerOpen(false)}
      />

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewOpen(false)}>
            <AppText style={styles.previewCloseText}>Close</AppText>
          </TouchableOpacity>
          {images[previewIndex] ? (
            <>
              <Image source={{ uri: images[previewIndex].url }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewNav}>
                <TouchableOpacity
                  disabled={previewIndex <= 0}
                  onPress={() => setPreviewIndex(i => Math.max(0, i - 1))}
                >
                  <ChevronLeft size={32} color="#fff" />
                </TouchableOpacity>
                <AppText style={styles.previewLabel}>{images[previewIndex].session_label}</AppText>
                <TouchableOpacity
                  disabled={previewIndex >= images.length - 1}
                  onPress={() => setPreviewIndex(i => Math.min(images.length - 1, i + 1))}
                >
                  <ChevronRight size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const thumbSize = (SCREEN_W - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingBottom: 100 },
  tabs: { marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: Theme.colors.card, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  dateText: { color: Theme.colors.text, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { flex: 1, padding: 10, backgroundColor: Theme.colors.card, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border },
  filterText: { textAlign: 'center', color: Theme.colors.text, fontSize: 13 },
  error: { color: Theme.colors.error, textAlign: 'center', marginTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  thumbWrap: { width: thumbSize, marginBottom: 4 },
  thumb: { width: thumbSize, height: thumbSize, borderRadius: 12, backgroundColor: Theme.colors.backgroundAlt },
  thumbLabel: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 4, textAlign: 'center' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 56, right: 20, zIndex: 2 },
  previewCloseText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  previewImage: { width: SCREEN_W - 24, height: SCREEN_W - 24 },
  previewNav: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20 },
  previewLabel: { color: '#fff', fontWeight: '600', minWidth: 100, textAlign: 'center' },
});
