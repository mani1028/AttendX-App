import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as teacherService from '../../services/teacherService';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

const { width } = Dimensions.get('window');

// Types
interface GalleryImage {
  id: string;
  image_url: string;
  date: string;
  timestamp: string;
  teacher_name?: string;
  student_count?: number;
  class_grade?: string;
  section?: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) || '';
};

const getEmployeeId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('employee_id');
  return id || (await AsyncStorage.getItem('employeeId')) || '';
};

// Image Gallery Component
const ImageGallery: React.FC<{
  images: GalleryImage[];
  loading: boolean;
  onRefresh: () => void;
  onImagePress: (image: GalleryImage) => void;
}> = ({ images, loading, onRefresh, onImagePress }) => {
  if (loading) {
    return <Loader />;
  }

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyTitle}>No images found</Text>
        <Text style={styles.emptyText}>No attendance images available for this selection</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.imageRow}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.imageCard}
          onPress={() => onImagePress(item)}
        >
          <Image source={{ uri: item.image_url }} style={styles.imageThumb} />
          <View style={styles.imageInfo}>
            <Text style={styles.imageDate}>{item.date}</Text>
            {item.teacher_name && (
              <Text style={styles.imageTeacher}>{item.teacher_name}</Text>
            )}
            {item.student_count && (
              <Text style={styles.imageCount}>{item.student_count} students</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
    />
  );
};

// Class Selector Modal
const ClassSelectorModal: React.FC<{
  visible: boolean;
  selectedClass: string;
  selectedSection: string;
  onSelect: (classGrade: string, section: string) => void;
  onClose: () => void;
}> = ({ visible, selectedClass, selectedSection, onSelect, onClose }) => {
  const classOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const sectionOptions = ['A', 'B', 'C'];

  const [tempClass, setTempClass] = useState(selectedClass);
  const [tempSection, setTempSection] = useState(selectedSection);

  useEffect(() => {
    setTempClass(selectedClass);
    setTempSection(selectedSection);
  }, [selectedClass, selectedSection, visible]);

  const handleConfirm = () => {
    if (tempClass && tempSection) {
      onSelect(tempClass, tempSection);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Class & Section</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {classOptions.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.chip, tempClass === cls && styles.chipActive]}
                    onPress={() => setTempClass(cls)}
                  >
                    <Text style={[styles.chipText, tempClass === cls && styles.chipTextActive]}>
                      Class {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {sectionOptions.map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.chip, tempSection === sec && styles.chipActive]}
                    onPress={() => setTempSection(sec)}
                  >
                    <Text style={[styles.chipText, tempSection === sec && styles.chipTextActive]}>
                      Section {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title="Confirm" onPress={handleConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Image Detail Modal
const ImageDetailModal: React.FC<{
  visible: boolean;
  image: GalleryImage | null;
  onClose: () => void;
}> = ({ visible, image, onClose }) => {
  if (!image) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.detailOverlay}>
        <View style={styles.detailContent}>
          <TouchableOpacity style={styles.detailClose} onPress={onClose}>
            <Text style={styles.detailCloseText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: image.image_url }} style={styles.detailImage} />
          <View style={styles.detailInfo}>
            <Text style={styles.detailDate}>📅 {image.date}</Text>
            {image.teacher_name && (
              <Text style={styles.detailTeacher}>👨‍🏫 {image.teacher_name}</Text>
            )}
            {image.student_count && (
              <Text style={styles.detailCount}>👥 {image.student_count} students</Text>
            )}
            {image.class_grade && image.section && (
              <Text style={styles.detailClass}>📚 Class {image.class_grade} - Section {image.section}</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AttendanceGalleryScreen() {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [teacherImages, setTeacherImages] = useState<GalleryImage[]>([]);
  const [studentImages, setStudentImages] = useState<GalleryImage[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState<boolean>(false);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(false);
  
  // Student filters
  const [classGrade, setClassGrade] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [showClassSelector, setShowClassSelector] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showImageDetail, setShowImageDetail] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const tid = await getTeacherId();
        const eid = await getEmployeeId();

        setSchoolCode(code);
        setBranchId(bid);
        setTeacherId(tid);
        setEmployeeId(eid);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCredentials();
  }, []);

  // Fetch teacher images
  const fetchTeacherImages = async () => {
    if (!schoolCode || !branchId || !teacherId) return;
    
    setLoadingTeacher(true);
    try {
      const images = await teacherService.getTeacherGallery(schoolCode, branchId, teacherId);
      setTeacherImages(images);
    } catch (error) {
      console.error('Failed to fetch teacher images:', error);
      setTeacherImages([]);
    } finally {
      setLoadingTeacher(false);
    }
  };

  // Fetch student images
  const fetchStudentImages = async () => {
    if (!schoolCode || !branchId || !classGrade || !section) return;
    
    setLoadingStudent(true);
    try {
      const images = await teacherService.getStudentGallery(schoolCode, branchId, classGrade, section);
      setStudentImages(images);
    } catch (error) {
      console.error('Failed to fetch student images:', error);
      setStudentImages([]);
    } finally {
      setLoadingStudent(false);
    }
  };

  // Load data when tab changes or dependencies change
  useEffect(() => {
    if (activeTab === 'teacher' && schoolCode && branchId && teacherId) {
      fetchTeacherImages();
    }
  }, [activeTab, schoolCode, branchId, teacherId]);

  useEffect(() => {
    if (activeTab === 'student' && schoolCode && branchId && classGrade && section) {
      fetchStudentImages();
    }
  }, [activeTab, schoolCode, branchId, classGrade, section]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'teacher') {
      await fetchTeacherImages();
    } else if (activeTab === 'student' && classGrade && section) {
      await fetchStudentImages();
    }
    setRefreshing(false);
  }, [activeTab, classGrade, section]);

  const handleClassSelect = (cls: string, sec: string) => {
    setClassGrade(cls);
    setSection(sec);
  };

  const handleImagePress = (image: GalleryImage) => {
    setSelectedImage(image);
    setShowImageDetail(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🖼️ Attendance Gallery</Text>
          <Text style={styles.subtitle}>View and manage attendance verification images</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'teacher' && styles.tabActive]}
            onPress={() => setActiveTab('teacher')}
          >
            <Text style={[styles.tabText, activeTab === 'teacher' && styles.tabTextActive]}>
              👤 Teacher
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'student' && styles.tabActive]}
            onPress={() => setActiveTab('student')}
          >
            <Text style={[styles.tabText, activeTab === 'student' && styles.tabTextActive]}>
              👥 Student
            </Text>
          </TouchableOpacity>
        </View>

        {/* Teacher Tab */}
        {activeTab === 'teacher' && (
          <View>
            <AppCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👤</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Teacher Face Verification Images</Text>
                  <Text style={styles.infoText}>
                    These images are captured during teacher attendance verification. They help verify teacher attendance records.
                  </Text>
                </View>
              </View>
            </AppCard>

            {!schoolCode || !branchId || !teacherId ? (
              <AppCard style={styles.warningCard}>
                <View style={styles.warningRow}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View>
                    <Text style={styles.warningTitle}>Missing Information</Text>
                    <Text style={styles.warningText}>Unable to load teacher data. Please log in again.</Text>
                  </View>
                </View>
              </AppCard>
            ) : (
              <ImageGallery
                images={teacherImages}
                loading={loadingTeacher}
                onRefresh={fetchTeacherImages}
                onImagePress={handleImagePress}
              />
            )}
          </View>
        )}

        {/* Student Tab */}
        {activeTab === 'student' && (
          <View>
            <AppCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👥</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Student Attendance Class Images</Text>
                  <Text style={styles.infoText}>
                    These are the attendance images taken during student attendance marking. They show the class group photo used for face recognition.
                  </Text>
                </View>
              </View>
            </AppCard>

            {/* Class Selector Button */}
            <TouchableOpacity
              style={styles.classSelectorBtn}
              onPress={() => setShowClassSelector(true)}
            >
              <Text style={styles.classSelectorText}>
                {classGrade && section
                  ? `Class ${classGrade} - Section ${section}`
                  : 'Select Class & Section'}
              </Text>
              <Text style={styles.classSelectorArrow}>▼</Text>
            </TouchableOpacity>

            {!classGrade || !section ? (
              <AppCard style={styles.warningCard}>
                <View style={styles.warningRow}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View>
                    <Text style={styles.warningTitle}>Select a Class</Text>
                    <Text style={styles.warningText}>
                      Please select a class from above to view attendance images.
                    </Text>
                  </View>
                </View>
              </AppCard>
            ) : (
              <ImageGallery
                images={studentImages}
                loading={loadingStudent}
                onRefresh={fetchStudentImages}
                onImagePress={handleImagePress}
              />
            )}
          </View>
        )}

        {/* Footer Info Cards */}
        <View style={styles.footerGrid}>
          <AppCard style={styles.footerCard}>
            <Text style={styles.footerIcon}>🖼️</Text>
            <Text style={styles.footerTitle}>Organized Storage</Text>
            <Text style={styles.footerText}>All images are organized by date and class</Text>
          </AppCard>

          <AppCard style={styles.footerCard}>
            <Text style={styles.footerIcon}>📅</Text>
            <Text style={styles.footerTitle}>Date Filtering</Text>
            <Text style={styles.footerText}>View images from specific attendance dates</Text>
          </AppCard>

          <AppCard style={styles.footerCard}>
            <Text style={styles.footerIcon}>⬇️</Text>
            <Text style={styles.footerTitle}>Easy Download</Text>
            <Text style={styles.footerText}>Download images for record keeping</Text>
          </AppCard>
        </View>
      </ScrollView>

      {/* Class Selector Modal */}
      <ClassSelectorModal
        visible={showClassSelector}
        selectedClass={classGrade}
        selectedSection={section}
        onSelect={handleClassSelect}
        onClose={() => setShowClassSelector(false)}
      />

      {/* Image Detail Modal */}
      <ImageDetailModal
        visible={showImageDetail}
        image={selectedImage}
        onClose={() => {
          setShowImageDetail(false);
          setSelectedImage(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4a5568',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  tabTextActive: {
    color: '#fff',
  },
  infoCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  warningCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  warningRow: {
    flexDirection: 'row',
    gap: 12,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#b45309',
  },
  classSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  classSelectorText: {
    fontSize: 14,
    color: '#0d1b2a',
    fontWeight: '500',
  },
  classSelectorArrow: {
    fontSize: 12,
    color: '#4a5568',
  },
  imageRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageThumb: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  imageInfo: {
    padding: 8,
  },
  imageDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  imageTeacher: {
    fontSize: 10,
    color: '#4a5568',
    marginTop: 2,
  },
  imageCount: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
  },
  footerGrid: {
    marginTop: 24,
    gap: 12,
  },
  footerCard: {
    padding: 16,
    alignItems: 'center',
  },
  footerIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#4a5568',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#4a5568',
  },
  chipTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailCloseText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  detailImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  detailInfo: {
    padding: 16,
  },
  detailDate: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 4,
  },
  detailTeacher: {
    fontSize: 14,
    color: '#0d1b2a',
    marginBottom: 4,
  },
  detailCount: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
  },
  detailClass: {
    fontSize: 14,
    color: '#4a5568',
  },
});