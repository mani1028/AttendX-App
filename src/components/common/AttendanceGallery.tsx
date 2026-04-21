import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppCard from './AppCard';

interface GalleryImage {
  path: string;
  filename: string;
  date?: string;
}

interface Props {
  type?: 'teacher' | 'student';
  schoolCode?: string;
  branchId?: string;
  teacherId?: string;
  classGrade?: string;
  section?: string;
  employeeId?: string;
}

export default function AttendanceGallery({
  type = 'teacher',
  schoolCode = '',
  branchId = '',
  teacherId = '',
  classGrade = '',
  section = '',
}: Props) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const fetchTeacherImages = useCallback(async () => {
    if (!schoolCode || !branchId || !teacherId) {
      setError('Missing parameters');
      return;
    }
    setLoading(true);
    try {
      const res = await API.get('/manage/attendance/teacher/images', {
        params: { school_code: schoolCode, branch_id: branchId, teacher_id: teacherId },
      });
      setImages(res.data?.images || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch images');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, branchId, teacherId]);

  const fetchStudentDates = useCallback(async () => {
    if (!schoolCode || !branchId || !classGrade || !section) {
      setError('Missing parameters');
      return;
    }
    setLoading(true);
    try {
      const res = await API.get('/manage/attendance/student/attendance-dates', {
        params: { school_code: schoolCode, branch_id: branchId, class_grade: classGrade, section },
      });
      setDates(res.data?.dates || []);
      if (res.data?.dates?.length) setSelectedDate(res.data.dates[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dates');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, branchId, classGrade, section]);

  const fetchStudentImages = useCallback(async (date: string) => {
    if (!schoolCode || !branchId || !classGrade || !section) return;
    setLoading(true);
    try {
      const res = await API.get('/manage/attendance/student/images', {
        params: { school_code: schoolCode, branch_id: branchId, class_grade: classGrade, section, attendance_date: date },
      });
      setImages(res.data?.images || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch images');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, branchId, classGrade, section]);

  useEffect(() => {
    if (type === 'teacher') {
      if (schoolCode && branchId && teacherId) fetchTeacherImages();
    } else {
      if (schoolCode && branchId && classGrade && section) fetchStudentDates();
    }
  }, [type, schoolCode, branchId, teacherId, classGrade, section]);

  useEffect(() => {
    if (type === 'student' && selectedDate) fetchStudentImages(selectedDate);
  }, [selectedDate]);

  const getImageUrl = (path: string) => API.defaults.baseURL + `/media/${path}`;

  const downloadImage = async (url: string, filename: string) => {
    try {
      const fileUri = FileSystem.documentDirectory + filename;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert('Saved', `Image saved to ${downloadRes.uri}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to download image');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ margin: 40 }} />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View>
      {type === 'student' && dates.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateBar}>
          {dates.map(date => (
            <TouchableOpacity
              key={date}
              style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={selectedDate === date ? styles.dateTextActive : styles.dateText}>{date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {images.length === 0 ? (
        <Text style={styles.empty}>No images available</Text>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item, idx) => item.path + idx}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.thumb} onPress={() => setSelectedImage(item)}>
              <Image source={{ uri: getImageUrl(item.path) }} style={styles.thumbImage} />
              <Text style={styles.thumbLabel} numberOfLines={1}>{item.filename}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.fullOverlay}>
          <View style={styles.fullContainer}>
            <TouchableOpacity style={styles.closeFull} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeFullText}>✕</Text>
            </TouchableOpacity>
            {selectedImage && (
              <>
                <Image source={{ uri: getImageUrl(selectedImage.path) }} style={styles.fullImage} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => downloadImage(getImageUrl(selectedImage.path), selectedImage.filename)}
                >
                  <Text style={styles.downloadText}>Download</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBar: { flexDirection: 'row', marginBottom: 16 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  dateChipActive: { backgroundColor: '#2563eb' },
  dateText: { fontSize: 12, color: '#334155' },
  dateTextActive: { color: '#fff' },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  thumb: { width: '48%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  thumbImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  thumbLabel: { fontSize: 10, textAlign: 'center', padding: 4, color: '#475569' },
  empty: { textAlign: 'center', padding: 40, color: '#64748b' },
  error: { textAlign: 'center', color: '#dc2626', padding: 20 },
  fullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullContainer: { width: '90%', height: '80%', backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  closeFull: { position: 'absolute', top: 16, right: 16, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  closeFullText: { color: '#fff', fontSize: 16 },
  fullImage: { width: '100%', height: '80%' },
  downloadBtn: { backgroundColor: '#2563eb', padding: 12, margin: 16, borderRadius: 8, alignItems: 'center' },
  downloadText: { color: '#fff', fontWeight: '600' },
});