import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  Platform,
  Switch,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface TeacherData {
  employee_id: string;
  teacher_full_name: string;
  branch_id: string;
}

interface AssignedClass {
  class_grade: string;
  section: string;
}

interface Student {
  student_id: string;
  name: string;
  roll: string;
}

interface AttendanceResult {
  summary: {
    total_students: number;
    present_count: number;
    absent_count: number;
    duplicate_count: number;
    images_processed: number;
    total_faces_detected: number;
    unknown_faces_count: number;
  };
  present: Student[];
  absent: Student[];
  duplicates: Student[];
  per_image_results?: any[];
  date?: string;
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

const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem('token');
  return token || '';
};

// Status Badge Component
const StatusBadge: React.FC<{ status: 'present' | 'absent' | 'changed' }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'present': return styles.badgePresent;
      case 'absent': return styles.badgeAbsent;
      case 'changed': return styles.badgeChanged;
    }
  };
  const getText = () => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'changed': return 'Edited';
    }
  };
  return (
    <View style={[styles.badge, getStyle()]}>
      <Text style={styles.badgeText}>{getText()}</Text>
    </View>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

export default function TeacherAttendanceScreen() {
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Camera
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const cameraRef = useRef<Camera>(null);
  
  // Form
  const [form, setForm] = useState({
    class_grade: '',
    section: '',
    attendance_date: new Date().toISOString().split('T')[0],
    attendance_session: '1',
  });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dailySessions, setDailySessions] = useState<number>(1);
  
  // Teacher verification
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  
  // Student attendance
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [manualStatus, setManualStatus] = useState<Record<string, string>>({});
  const [manualFilter, setManualFilter] = useState<string>('review');
  const [manualSaving, setManualSaving] = useState<boolean>(false);
  
  // Class options
  const assignedClassOptions = useMemo(() => {
    return assignedClasses.map(item => ({
      key: `${item.class_grade}__${item.section}`,
      class_grade: item.class_grade,
      section: item.section,
      label: `Class ${item.class_grade} - Section ${item.section}`,
    }));
  }, [assignedClasses]);

  // Manual rows
  const manualRows = useMemo(() => {
    const presentRows = (result?.present || []).map(s => ({ ...s, _defaultStatus: 'PRESENT' }));
    const absentRows = (result?.absent || []).map(s => ({ ...s, _defaultStatus: 'ABSENT' }));
    return [...presentRows, ...absentRows];
  }, [result]);

  const manualRowsWithState = useMemo(() => {
    return manualRows.map(row => {
      const sid = row.student_id;
      const current = manualStatus[sid] || row._defaultStatus;
      return {
        ...row,
        _currentStatus: current,
        _changed: current !== row._defaultStatus,
      };
    });
  }, [manualRows, manualStatus]);

  const manualCounts = useMemo(() => {
    const total = manualRowsWithState.length;
    const present = manualRowsWithState.filter(r => r._currentStatus === 'PRESENT').length;
    const absent = manualRowsWithState.filter(r => r._currentStatus === 'ABSENT').length;
    const changed = manualRowsWithState.filter(r => r._changed).length;
    const review = manualRowsWithState.filter(r => r._changed || r._currentStatus === 'ABSENT').length;
    return { total, present, absent, changed, review };
  }, [manualRowsWithState]);

  const filteredManualRows = useMemo(() => {
    switch (manualFilter) {
      case 'review': return manualRowsWithState.filter(r => r._changed || r._currentStatus === 'ABSENT');
      case 'present': return manualRowsWithState.filter(r => r._currentStatus === 'PRESENT');
      case 'absent': return manualRowsWithState.filter(r => r._currentStatus === 'ABSENT');
      case 'changed': return manualRowsWithState.filter(r => r._changed);
      default: return manualRowsWithState;
    }
  }, [manualFilter, manualRowsWithState]);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      setSchoolCode(code);
      setBranchId(bid);
      setEmployeeId(eid);
      
      // Load attendance settings
      if (code && bid) {
        try {
          const res = await API.get('/hm/attendance/settings', {
            headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
          });
          const sessions = res.data?.daily_sessions === 2 ? 2 : 1;
          setDailySessions(sessions);
        } catch { setDailySessions(1); }
      }
    };
    load();
    
    // Request camera permission
    Camera.requestCameraPermission().then(permission => {
      setHasPermission(permission === 'authorized');
    });
  }, []);

  // Capture image from camera
  const captureImage = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
      });
      return `file://${photo.path}`;
    } catch (err) {
      console.error('Capture failed:', err);
      return null;
    }
  };

  const handleTeacherCapture = async () => {
    const img = await captureImage();
    if (img) {
      setTeacherImage(img);
      Alert.alert('Success', 'Teacher image captured');
    } else {
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleTeacherUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0].uri) {
        setTeacherImage(response.assets[0].uri);
      }
    });
  };

  const handleStudentCapture = async () => {
    const img = await captureImage();
    if (img) {
      setPreviewImage(img);
      setShowPreview(true);
    }
  };

  const handleStudentUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 0 }, (response) => {
      if (response.assets) {
        const uris = response.assets.map(a => a.uri!).filter(Boolean);
        if (uris.length > 0) {
          setPreviewImage(uris[0]);
          setShowPreview(true);
        }
      }
    });
  };

  const confirmStudentImage = async () => {
    if (previewImage) {
      setStudentImages(prev => [...prev, previewImage]);
      setPreviewImage(null);
      setShowPreview(false);
      Alert.alert('Success', 'Image added');
    }
  };

  const retakeImage = () => {
    setPreviewImage(null);
    setShowPreview(false);
  };

  const removeStudentImage = (index: number) => {
    setStudentImages(prev => prev.filter((_, i) => i !== index));
  };

  const verifyTeacher = async () => {
    if (!teacherImage) {
      Alert.alert('Error', 'Please capture or upload teacher image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('school_code', schoolCode);
      formData.append('employee_id', employeeId);
      formData.append('branch_id', branchId);
      formData.append('image', {
        uri: teacherImage,
        type: 'image/jpeg',
        name: 'teacher.jpg',
      } as any);

      const res = await API.post('/manage/verify-teacher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      const assigned = data.assigned_classes || [];
      setTeacherData(data);
      setAssignedClasses(assigned);

      if (assigned.length === 1) {
        const first = assigned[0];
        setSelectedClassKey(`${first.class_grade}__${first.section}`);
        setForm(prev => ({
          ...prev,
          class_grade: first.class_grade,
          section: first.section,
        }));
      }

      setStep(2);
      Alert.alert('Success', `Welcome, ${data.teacher_full_name}`);
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const processAttendance = async () => {
    if (studentImages.length === 0) {
      Alert.alert('Error', 'Please capture or upload at least one student image');
      return;
    }

    if (!form.class_grade || !form.section) {
      Alert.alert('Error', 'Please select class and section');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('school_code', schoolCode);
      formData.append('branch_id', branchId);
      formData.append('employee_id', employeeId);
      formData.append('class_grade', form.class_grade);
      formData.append('section', form.section);
      formData.append('attendance_date', form.attendance_date);
      if (dailySessions === 1) formData.append('attendance_session', '1');
      formData.append('preview_only', 'true');

      studentImages.forEach((img, index) => {
        formData.append('images', {
          uri: img,
          type: 'image/jpeg',
          name: `student_${index}.jpg`,
        } as any);
      });

      const res = await API.post('/manage/attendance/student/view', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(res.data);
      setStep(4);
      Alert.alert('Success', 'Attendance scanned successfully');
    } catch (err: any) {
      Alert.alert('Processing Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const saveAttendance = async () => {
    setManualSaving(true);
    try {
      const formData = new FormData();
      formData.append('school_code', schoolCode);
      formData.append('branch_id', branchId);
      formData.append('employee_id', employeeId);
      formData.append('class_grade', form.class_grade);
      formData.append('section', form.section);
      formData.append('attendance_date', form.attendance_date);
      if (dailySessions === 1) formData.append('attendance_session', '1');
      formData.append('preview_only', 'false');

      // Add manual statuses
      const manualAttendance = manualRows.map(row => ({
        student_id: row.student_id,
        status: manualStatus[row.student_id] || row._defaultStatus,
      }));
      formData.append('manual_attendance', JSON.stringify(manualAttendance));

      studentImages.forEach((img, index) => {
        formData.append('images', {
          uri: img,
          type: 'image/jpeg',
          name: `student_${index}.jpg`,
        } as any);
      });

      await API.post('/manage/attendance/student/view', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Attendance saved successfully');
      resetFlow();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setManualSaving(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setTeacherImage(null);
    setTeacherData(null);
    setAssignedClasses([]);
    setStudentImages([]);
    setResult(null);
    setManualMode(false);
    setManualStatus({});
    setForm({
      class_grade: '',
      section: '',
      attendance_date: new Date().toISOString().split('T')[0],
      attendance_session: '1',
    });
  };

  const getAttendanceRate = () => {
    if (!result?.summary?.total_students) return 0;
    return Math.round((result.summary.present_count / result.summary.total_students) * 100);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
      >
        {/* Camera View */}
        {cameraActive && hasPermission && (
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={useCameraDevices().back}
              isActive={cameraActive}
              photo={true}
            />
            <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setCameraActive(false)}>
              <Text style={styles.closeCameraText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Teacher Verification */}
        {step === 1 && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👨‍🏫 Teacher Face Verification</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput
                  style={styles.input}
                  value={employeeId}
                  editable={false}
                  placeholder="Employee ID"
                />
              </View>

              {!cameraActive && (
                <View style={styles.buttonRow}>
                  <AppButton title="📷 Start Camera" onPress={() => setCameraActive(true)} />
                  <AppButton title="📁 Upload Photo" onPress={handleTeacherUpload} type="secondary" />
                </View>
              )}

              {cameraActive && (
                <View style={styles.buttonRow}>
                  <AppButton title="📸 Capture" onPress={handleTeacherCapture} />
                  <AppButton title="❌ Close Camera" onPress={() => setCameraActive(false)} type="secondary" />
                </View>
              )}

              {teacherImage && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: teacherImage }} style={styles.previewImage} />
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>✓ Ready</Text>
                  </View>
                </View>
              )}

              <AppButton
                title={loading ? 'Verifying...' : 'Verify Teacher'}
                onPress={verifyTeacher}
                disabled={loading || !teacherImage}
              />
            </View>
          </AppCard>
        )}

        {/* Step 2: Class Selection */}
        {step === 2 && teacherData && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>✅ Verified Teacher</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.teacherInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{teacherData.teacher_full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Employee ID:</Text>
                  <Text style={styles.infoValue}>{teacherData.employee_id}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned Classes:</Text>
                  <Text style={styles.infoValue}>{assignedClasses.length}</Text>
                </View>
              </View>

              {assignedClasses.length > 0 && (
                <>
                  <Text style={styles.label}>Select Class for Attendance</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {assignedClassOptions.map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.chip, selectedClassKey === opt.key && styles.chipActive]}
                          onPress={() => {
                            setSelectedClassKey(opt.key);
                            setForm(prev => ({ ...prev, class_grade: opt.class_grade, section: opt.section }));
                          }}
                        >
                          <Text style={[styles.chipText, selectedClassKey === opt.key && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={styles.buttonRow}>
                <AppButton title="Continue →" onPress={() => setStep(3)} />
                <AppButton title="Start Over" onPress={resetFlow} type="secondary" />
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 3: Student Attendance */}
        {step === 3 && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👥 Student Attendance</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Class</Text>
                <TextInput style={styles.input} value={form.class_grade} editable={false} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Section</Text>
                <TextInput style={styles.input} value={form.section} editable={false} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text>{form.attendance_date}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(form.attendance_date)}
                    mode="date"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setForm(prev => ({ ...prev, attendance_date: date.toISOString().split('T')[0] }));
                    }}
                  />
                )}
              </View>

              <View style={styles.buttonRow}>
                <AppButton title="📷 Capture" onPress={handleStudentCapture} />
                <AppButton title="📁 Upload" onPress={handleStudentUpload} type="secondary" />
              </View>

              {studentImages.length > 0 && (
                <View>
                  <Text style={styles.label}>Captured Images ({studentImages.length})</Text>
                  <ScrollView horizontal>
                    <View style={styles.imageGrid}>
                      {studentImages.map((img, idx) => (
                        <View key={idx} style={styles.imageThumb}>
                          <Image source={{ uri: img }} style={styles.thumbImage} />
                          <TouchableOpacity style={styles.removeBtn} onPress={() => removeStudentImage(idx)}>
                            <Text style={styles.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <AppButton
                title={loading ? 'Processing...' : 'Scan Attendance'}
                onPress={processAttendance}
                disabled={loading || studentImages.length === 0}
              />

              <AppButton title="Back" onPress={() => setStep(2)} type="secondary" />
            </View>
          </AppCard>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <SummaryCard label="Total Students" value={result.summary.total_students} />
              <SummaryCard label="Present" value={result.summary.present_count} />
              <SummaryCard label="Absent" value={result.summary.absent_count} />
              <SummaryCard label="Rate" value={`${getAttendanceRate()}%`} />
            </View>

            {/* Manual Edit Section */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Manual Review</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.manualStrip}>
                  <Text style={styles.manualText}>
                    {manualCounts.changed} change(s) made
                  </Text>
                  <View style={styles.manualStats}>
                    <StatusBadge status="present" />
                    <Text>{manualCounts.present}</Text>
                    <StatusBadge status="absent" />
                    <Text>{manualCounts.absent}</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterBar}>
                    {['review', 'all', 'present', 'absent', 'changed'].map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterPill, manualFilter === filter && styles.filterPillActive]}
                        onPress={() => setManualFilter(filter)}
                      >
                        <Text style={[styles.filterText, manualFilter === filter && styles.filterTextActive]}>
                          {filter} ({manualCounts[filter as keyof typeof manualCounts]})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.buttonRow}>
                  <AppButton title="Toggle Manual Edit" onPress={() => setManualMode(!manualMode)} type="secondary" />
                </View>

                {manualMode && (
                  <ScrollView horizontal>
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colRoll]}>Roll</Text>
                        <Text style={[styles.tableHeaderText, styles.colName]}>Name</Text>
                        <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                      </View>
                      {filteredManualRows.map(item => (
                        <View key={item.student_id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, styles.colRoll]}>{item.roll || '-'}</Text>
                          <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
                          <View style={[styles.tableCell, styles.colStatus]}>
                            <View style={styles.statusSelector}>
                              <TouchableOpacity
                                style={[styles.statusOption, item._currentStatus === 'PRESENT' && styles.statusOptionActive]}
                                onPress={() => setManualStatus(prev => ({ ...prev, [item.student_id]: 'PRESENT' }))}
                              >
                                <Text>P</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.statusOption, item._currentStatus === 'ABSENT' && styles.statusOptionActive]}
                                onPress={() => setManualStatus(prev => ({ ...prev, [item.student_id]: 'ABSENT' }))}
                              >
                                <Text>A</Text>
                              </TouchableOpacity>
                            </View>
                            {item._changed && <StatusBadge status="changed" />}
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}

                <View style={styles.buttonRow}>
                  <AppButton title="Save Attendance" onPress={saveAttendance} disabled={manualSaving} />
                  <AppButton title="Process Again" onPress={() => setStep(3)} type="secondary" />
                  <AppButton title="New Session" onPress={resetFlow} type="secondary" />
                </View>
              </View>
            </AppCard>
          </>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={showPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Image</Text>
            {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} />}
            <View style={styles.modalButtons}>
              <AppButton title="Retake" onPress={retakeImage} type="secondary" />
              <AppButton title="Confirm" onPress={confirmStudentImage} />
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
    backgroundColor: '#f8fbff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCameraText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
    backgroundColor: '#f7f9fc',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardBody: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  previewBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  teacherInfo: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontWeight: '700',
    color: '#64748b',
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 13,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  dateButton: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  imageThumb: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 16,
    padding: 16,
    minWidth: '30%',
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
  },
  manualStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fbff',
    borderRadius: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  manualText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  manualStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterTextActive: {
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableCell: {
    fontSize: 14,
    color: '#0f172a',
  },
  colRoll: { width: 60 },
  colName: { width: 120 },
  colStatus: { width: 100 },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statusOptionActive: {
    backgroundColor: '#2563eb',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeChanged: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});