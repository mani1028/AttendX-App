import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
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
  StatusBar,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Bell,
  User,
  Users,
  Calendar,
  Camera,
  Info,
  X,
  ChevronRight,
  Filter,
  Image as ImageIcon
} from 'lucide-react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as teacherService from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { RootStackParamList } from '../../navigation/AppNavigator';
import API from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  path?: string;
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

// Image Gallery Component
const ImageGallery: React.FC<{
  images: GalleryImage[];
  loading: boolean;
  onRefresh: () => void;
  onImagePress: (image: GalleryImage) => void;
}> = ({ images, loading, onRefresh, onImagePress }) => {
  if (loading) {
    return (
      <View style={styles.listLoader}>
        <ActivityIndicator size="large" color="#001F3F" />
        <AppText style={styles.loaderText}>Fetching gallery...</AppText>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ImageIcon size={64} color="#CBD5E1" />
        <AppText style={styles.emptyTitle}>No images found</AppText>
        <AppText style={styles.emptyText}>No attendance images available for this selection</AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id || item.image_url || item.path || Math.random().toString()}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.imageRow}
      renderItem={({ item }) => {
        const imageUrl = item.image_url || (item.path ? `${API.getUri()}/media/${item.path}` : '');
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.imageCard}
            onPress={() => onImagePress({ ...item, image_url: imageUrl })}
          >
            <Image source={{ uri: imageUrl }} style={styles.imageThumb} />
            <View style={styles.imageInfo}>
              <View style={styles.imageDateRow}>
                <Calendar size={10} color="#001F3F" />
                <AppText style={styles.imageDate}>{item.date}</AppText>
              </View>
              {item.student_count !== undefined && (
                <AppText style={styles.imageCount}>{item.student_count} students</AppText>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
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
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: image.image_url }} style={styles.detailImage} />
          <View style={styles.detailInfo}>
            <View style={styles.detailHeader}>
              <AppText style={styles.detailTitle}>Attendance Details</AppText>
              <View style={styles.detailDateBadge}>
                <AppText style={styles.detailDateText}>{image.date}</AppText>
              </View>
            </View>

            <View style={styles.detailMetaGrid}>
              {image.teacher_name && (
                <View style={styles.detailMetaItem}>
                  <User size={16} color="#64748B" />
                  <AppText style={styles.detailMetaText}>{image.teacher_name}</AppText>
                </View>
              )}
              {image.class_grade && (
                <View style={styles.detailMetaItem}>
                  <ImageIcon size={16} color="#64748B" />
                  <AppText style={styles.detailMetaText}>Class {image.class_grade} - {image.section}</AppText>
                </View>
              )}
              {image.student_count !== undefined && (
                <View style={styles.detailMetaItem}>
                  <Users size={16} color="#64748B" />
                  <AppText style={styles.detailMetaText}>{image.student_count} Students Present</AppText>
                </View>
              )}
              <View style={styles.detailMetaItem}>
                <Camera size={16} color="#64748B" />
                <AppText style={styles.detailMetaText}>{image.timestamp || 'Verification Shot'}</AppText>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AttendanceGalleryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [teacherImages, setTeacherImages] = useState<GalleryImage[]>([]);
  const [studentImages, setStudentImages] = useState<GalleryImage[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState<boolean>(false);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(false);
  
  // Student filters
  const [assignedClasses, setAssignedClasses] = useState<{class_grade: string, section: string}[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showImageDetail, setShowImageDetail] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const tid = await getTeacherId();

        setSchoolCode(code);
        setBranchId(bid);
        setTeacherId(tid);

        if (code && bid && tid) {
          const assigned = await teacherService.getAssignedClasses(code, bid, tid);
          setAssignedClasses(assigned);
          if (assigned.length > 0) {
            setSelectedClass(assigned[0].class_grade);
            setSelectedSection(assigned[0].section);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Fetch teacher images
  const fetchTeacherImages = useCallback(async () => {
    if (!schoolCode || !branchId || !teacherId) return;
    setLoadingTeacher(true);
    try {
      const images = await teacherService.getTeacherGallery(schoolCode, branchId, teacherId);
      setTeacherImages(images);
    } catch (error) {
      console.error('Teacher images fetch error:', error);
      setTeacherImages([]);
    } finally {
      setLoadingTeacher(false);
    }
  }, [schoolCode, branchId, teacherId]);

  // Fetch student images
  const fetchStudentImages = useCallback(async () => {
    if (!schoolCode || !branchId || !selectedClass || !selectedSection) return;
    setLoadingStudent(true);
    try {
      const images = await teacherService.getStudentGallery(schoolCode, branchId, selectedClass, selectedSection);
      setStudentImages(images);
    } catch (error) {
      console.error('Student images fetch error:', error);
      setStudentImages([]);
    } finally {
      setLoadingStudent(false);
    }
  }, [schoolCode, branchId, selectedClass, selectedSection]);

  useEffect(() => {
    if (activeTab === 'teacher') fetchTeacherImages();
    else if (activeTab === 'student') fetchStudentImages();
  }, [activeTab, fetchTeacherImages, fetchStudentImages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'teacher') await fetchTeacherImages();
    else await fetchStudentImages();
    setRefreshing(false);
  }, [activeTab, fetchTeacherImages, fetchStudentImages]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;
    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const classOptions = [...new Set(assignedClasses.map(c => c.class_grade))];
  const sectionOptions = assignedClasses.filter(c => c.class_grade === selectedClass).map(c => c.section);

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Navy Hero Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.heroTitle}>Gallery</AppText>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <AppText weight="bold" style={styles.heroGreeting}>Media Logs</AppText>
          <AppText style={styles.heroSubtext}>Review verification photos and class images</AppText>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'teacher' && styles.activeTab]}
          onPress={() => setActiveTab('teacher')}
        >
          <AppText weight="bold" style={[styles.tabText, activeTab === 'teacher' && styles.activeTabText]}>
            Selfie Logs
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'student' && styles.activeTab]}
          onPress={() => setActiveTab('student')}
        >
          <AppText weight="bold" style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>
            Class Photos
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Context Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Info size={18} color="#001F3F" />
          </View>
          <View style={styles.infoTextBox}>
            <AppText style={styles.infoTitle}>
              {activeTab === 'teacher' ? 'Identity Verification' : 'Attendance Evidence'}
            </AppText>
            <AppText style={styles.infoDesc}>
              {activeTab === 'teacher'
                ? 'Review your attendance verification shots captured during check-ins.'
                : 'Group photos taken during student attendance marking for verification.'}
            </AppText>
          </View>
        </View>

        {/* Filters for Student Tab */}
        {activeTab === 'student' && (
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Filter size={16} color="#64748B" />
              <AppText style={styles.filterTitleText}>Select Class & Section</AppText>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {classOptions.map(cls => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.chip, selectedClass === cls && styles.chipActive]}
                  onPress={() => {
                    setSelectedClass(cls);
                    const first = assignedClasses.find(c => c.class_grade === cls)?.section;
                    if (first) setSelectedSection(first);
                  }}
                >
                  <AppText style={[styles.chipText, selectedClass === cls && styles.chipTextActive]}>
                    Class {cls}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sectionRow}>
              {sectionOptions.map(sec => (
                <TouchableOpacity
                  key={sec}
                  style={[styles.secChip, selectedSection === sec && styles.secChipActive]}
                  onPress={() => setSelectedSection(sec)}
                >
                  <AppText style={[styles.secChipText, selectedSection === sec && styles.secChipTextActive]}>
                    {sec}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Gallery Grid */}
        <View style={styles.galleryWrapper}>
          <View style={styles.listHeader}>
            <AppText style={styles.listHeaderText}>Recent Media</AppText>
            <AppText style={styles.listHeaderCount}>
              {(activeTab === 'teacher' ? teacherImages : studentImages).length} Items
            </AppText>
          </View>

          <ImageGallery
            images={activeTab === 'teacher' ? teacherImages : studentImages}
            loading={activeTab === 'teacher' ? loadingTeacher : loadingStudent}
            onRefresh={onRefresh}
            onImagePress={(img) => {
              setSelectedImage(img);
              setShowImageDetail(true);
            }}
          />
        </View>
      </ScrollView>

      {/* Detail Modal */}
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
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  heroContent: {
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  tabWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -30,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  activeTabText: {
    color: '#001F3F',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#001F3F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  chipRow: {
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  secChip: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secChipActive: {
    backgroundColor: '#001F3F',
  },
  secChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  secChipTextActive: {
    color: '#FFFFFF',
  },
  galleryWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  imageCard: {
    width: (SCREEN_WIDTH - 84) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
  },
  imageInfo: {
    padding: 8,
  },
  imageDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#001F3F',
  },
  imageCount: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  listLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  detailClose: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailImage: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
    backgroundColor: '#000',
  },
  detailInfo: {
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#001F3F',
    borderRadius: 8,
  },
  detailDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  detailMetaGrid: {
    gap: 12,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailMetaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
