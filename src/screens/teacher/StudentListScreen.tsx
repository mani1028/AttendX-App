import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Image,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { teacherService } from '../../services/teacherService';

// Types
interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  gender: string;
  student_status: 'ACTIVE' | 'INACTIVE';
  student_photograph?: string;
  date_of_birth?: string;
  blood_group?: string;
  father_guardian_name?: string;
  father_guardian_mobile?: string;
  mother_guardian_name?: string;
  mother_guardian_mobile?: string;
  admission_number?: string;
}

interface AssignedClass {
  class_grade: string;
  section: string;
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

const getEmployeeId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('employee_id');
  return id || (await AsyncStorage.getItem('employeeId')) || '';
};

const fmt = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const initials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </Text>
    </View>
  );
};

// Student Card Component
const StudentCard: React.FC<{
  student: Student;
  onView: (student: Student) => void;
}> = ({ student, onView }) => (
  <AppCard style={styles.studentCard}>
    <View style={styles.cardHeader}>
      {student.student_photograph ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${student.student_photograph}` }}
          style={styles.studentAvatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{initials(student.student_full_name)}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.studentName}>{student.student_full_name || '-'}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.rollBadge}>Roll: {student.roll_number || '-'}</Text>
          <StatusBadge status={student.student_status} />
        </View>
      </View>
    </View>
    <View style={styles.cardDetails}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Class:</Text>
        <Text style={styles.detailValue}>{student.class_grade || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Section:</Text>
        <Text style={styles.detailValue}>{student.section || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Gender:</Text>
        <Text style={styles.detailValue}>{student.gender || '-'}</Text>
      </View>
      {student.father_guardian_name && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Father:</Text>
          <Text style={styles.detailValue}>{student.father_guardian_name}</Text>
        </View>
      )}
    </View>
    <TouchableOpacity style={styles.viewBtn} onPress={() => onView(student)}>
      <Text style={styles.viewBtnText}>👁️ View Details</Text>
    </TouchableOpacity>
  </AppCard>
);

// Detail Groups for Modal
const DETAIL_GROUPS = [
  { label: 'Personal Info', icon: '👤', keys: ['student_full_name', 'gender', 'date_of_birth', 'blood_group'] },
  { label: 'Academic', icon: '📚', keys: ['class_grade', 'section', 'roll_number', 'admission_number'] },
  { label: 'Father / Guardian', icon: '👨', keys: ['father_guardian_name', 'father_guardian_mobile', 'father_guardian_occupation'] },
  { label: 'Mother / Guardian', icon: '👩', keys: ['mother_guardian_name', 'mother_guardian_mobile', 'mother_guardian_occupation'] },
];

export default function StudentListScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [records, setRecords] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rollSearch, setRollSearch] = useState<string>('');
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 10;

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      setSchoolCode(code);
      setBranchId(bid);
      setEmployeeId(eid);
    };
    load();
  }, []);

  // Load assigned classes for teacher
  const loadAssignedClasses = async () => {
    if (!schoolCode || !branchId || !employeeId) return;
    
    try {
      const assigned = await teacherService.getAssignedClasses(schoolCode, branchId, employeeId);
      setAssignedClasses(assigned);
      
      // Auto-select first class if available
      if (assigned.length > 0 && !selectedClass) {
        setSelectedClass(assigned[0].class_grade);
        setSelectedSection(assigned[0].section);
      }
    } catch (error) {
      console.error('Failed to load assigned classes:', error);
      setAssignedClasses([]);
    }
  };

  // Load students for selected class/section
  const fetchStudents = async () => {
    if (!schoolCode || !branchId) return;
    if (!selectedClass || !selectedSection) return;
    
    setLoading(true);
    try {
      const students = await teacherService.getStudentsByClass(
        schoolCode,
        branchId,
        selectedClass,
        selectedSection,
      );
      setRecords(students);
      setCurrentPage(1);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch students');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    if (schoolCode && branchId && employeeId) {
      loadAssignedClasses();
    }
  }, [schoolCode, branchId, employeeId]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection, schoolCode, branchId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAssignedClasses(), fetchStudents()]);
    setRefreshing(false);
  }, [selectedClass, selectedSection]);

  // Filter by roll number
  const filtered = useMemo(() => {
    const q = rollSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => String(r.roll_number || '').toLowerCase().includes(q));
  }, [records, rollSearch]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Get unique class options from assigned classes
  const classOptions = useMemo(() => {
    const uniqueClasses = new Map();
    assignedClasses.forEach(item => {
      if (!uniqueClasses.has(item.class_grade)) {
        uniqueClasses.set(item.class_grade, item.class_grade);
      }
    });
    return Array.from(uniqueClasses.keys());
  }, [assignedClasses]);

  // Get section options for selected class
  const sectionOptions = useMemo(() => {
    return assignedClasses
      .filter(item => item.class_grade === selectedClass)
      .map(item => item.section);
  }, [assignedClasses, selectedClass]);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👨‍🏫 My Students</Text>
          <Text style={styles.subtitle}>{filtered.length} students in your class</Text>
        </View>

        {/* Class/Section Selection */}
        <AppCard style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Select Class & Section</Text>
          
          {/* Class Selection */}
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {classOptions.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.filterChip, selectedClass === cls && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedClass(cls);
                      // Auto-select first section for this class
                      const firstSection = assignedClasses.find(item => item.class_grade === cls)?.section;
                      if (firstSection) setSelectedSection(firstSection);
                    }}
                  >
                    <Text style={[styles.filterChipText, selectedClass === cls && styles.filterChipTextActive]}>
                      Class {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Section Selection */}
          {selectedClass && sectionOptions.length > 0 && (
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {sectionOptions.map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.filterChip, selectedSection === sec && styles.filterChipActive]}
                      onPress={() => setSelectedSection(sec)}
                    >
                      <Text style={[styles.filterChipText, selectedSection === sec && styles.filterChipTextActive]}>
                        Section {sec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </AppCard>

        {/* Search */}
        {selectedClass && selectedSection && (
          <AppCard style={styles.searchCard}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Roll Number..."
                placeholderTextColor="#94a3b8"
                value={rollSearch}
                onChangeText={setRollSearch}
              />
              {rollSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRollSearch('')} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        )}

        {/* Student List */}
        {!selectedClass || !selectedSection ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No class selected</Text>
            <Text style={styles.emptyText}>Please select a class and section above</Text>
          </View>
        ) : loading ? (
          <Loader />
        ) : paginated.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👨‍🎓</Text>
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>No students assigned to this class-section</Text>
          </View>
        ) : (
          <>
            {paginated.map((student) => (
              <StudentCard
                key={student.student_id}
                student={student}
                onView={setViewStudent}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.pageBtnText}>◀</Text>
                </TouchableOpacity>

                {renderPageNumbers().map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                    onPress={() => setCurrentPage(p)}
                  >
                    <Text style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={styles.pageBtnText}>▶</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer Info */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </Text>
            </View>
          </>
        )}

        {/* School Info Footer */}
        <View style={styles.schoolFooter}>
          <Text style={styles.schoolFooterText}>🏫 School: {schoolCode || '—'}</Text>
          <Text style={styles.schoolFooterText}>👑 Role: Teacher</Text>
        </View>
      </ScrollView>

      {/* View Detail Modal */}
      <Modal visible={!!viewStudent} transparent animationType="slide" onRequestClose={() => setViewStudent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                {viewStudent?.student_photograph ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${viewStudent.student_photograph}` }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarText}>{initials(viewStudent?.student_full_name || '')}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.modalTitle}>{viewStudent?.student_full_name || 'Student Details'}</Text>
                  <View style={styles.modalMeta}>
                    <Text style={styles.modalRoll}>Roll: {viewStudent?.roll_number || '—'}</Text>
                    <StatusBadge status={viewStudent?.student_status || ''} />
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setViewStudent(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {DETAIL_GROUPS.map((group) => {
                const entries: Array<[string, unknown]> = group.keys
                  .filter(k => viewStudent?.[k as keyof Student] !== undefined && viewStudent?.[k as keyof Student] !== '')
                  .map(k => [k, viewStudent?.[k as keyof Student]] as [string, unknown]);
                if (entries.length === 0) return null;
                return (
                  <View key={group.label} style={styles.detailGroup}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupIcon}>{group.icon}</Text>
                      <Text style={styles.groupTitle}>{group.label}</Text>
                    </View>
                    <View style={styles.groupGrid}>
                      {entries.map(([k, v], i) => (
                        <View key={k} style={[styles.gridCell, i % 2 === 0 && styles.gridCellLeft]}>
                          <Text style={styles.gridLabel}>{fmt(k)}</Text>
                          <Text style={styles.gridValue}>{String(v ?? '—')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setViewStudent(null)} type="secondary" />
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 12,
  },
  filterCard: {
    padding: 16,
    marginBottom: 16,
  },
  searchCard: {
    padding: 16,
    marginBottom: 16,
  },
  filterField: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4a5568',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0d1b2a',
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#8898aa',
  },
  studentCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rollBadge: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: '#2563eb',
    fontWeight: '600',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 60,
    fontSize: 13,
    color: '#4a5568',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0d1b2a',
    fontWeight: '500',
  },
  viewBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#dc2626',
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    color: '#4a5568',
  },
  pageBtnTextActive: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#8898aa',
  },
  schoolFooter: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  schoolFooterText: {
    fontSize: 12,
    color: '#4a5568',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  modalAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalRoll: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: '#2563eb',
    fontWeight: '600',
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
  detailGroup: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  groupIcon: {
    fontSize: 14,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#2563eb',
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '50%',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  gridCellLeft: {
    borderRightWidth: 1,
    borderRightColor: '#e4e9f2',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#8898aa',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
});