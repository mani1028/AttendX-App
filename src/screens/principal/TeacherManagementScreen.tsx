import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { launchImageLibrary } from 'react-native-image-picker';
import { RefreshCw } from 'lucide-react-native';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { useAuth } from '../../context/AuthContext';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import {
  TeacherDirectoryTab,
  TeacherEnrollmentForm,
  TeacherProfileSheet,
  TeacherEditModal,
  TeacherTabHeader,
  INITIAL_FORM,
  getSchoolCode,
  getBranchId,
  validateStep,
  isValidEmail,
  calculateAge,
  teacherToEditForm,
  sanitizeTeacherFieldChange,
  getValidationErrorStep,
  filterTeachers,
  type Teacher,
  type TeacherFormData,
} from '../../components/principal/teacherManagement';

const ITEMS_PER_PAGE = 10;

export default function TeacherPage() {
  const navigation = useNavigation();
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const editScrollRef = useRef<ScrollView>(null);
  const tabBarScrollPadding = useTabBarScrollPadding();
  const isCompactScreen = width < 520;
  const { setTabBarVisible } = useAuth();

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'enroll'>('list');
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<TeacherFormData>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [items, setItems] = useState<Teacher[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string> | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'date_of_birth' | 'date_of_joining'>('date_of_birth');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleScroll = useScrollTabBar();
  const getHeaders = () => ({ 'X-School-Code': schoolCode, 'X-Branch-Id': branchId });

  useEffect(() => {
    (async () => {
      const code = await getSchoolCode();
      const branch = await getBranchId();
      setSchoolCode(code);
      setBranchId(branch);
      setFormData((prev) => ({ ...prev, branch_id: branch }));
    })();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (!schoolCode || !branchId) { return; }
    if (activeTab === 'list') { loadTeachers(); }
    else { fetchNextEmployeeId(); }
  }, [schoolCode, branchId, activeTab]);

  const fetchNextEmployeeId = async () => {
    try {
      const res = await API.get('/principal/next-employee-id', { headers: getHeaders() });
      const nextEmployeeId = String(res?.data?.employee_id || '').trim();
      if (nextEmployeeId) { setFormData((prev) => ({ ...prev, employee_id: nextEmployeeId })); }
    } catch (err) {
      console.error('Failed to fetch next employee ID:', err);
    }
  };

  const loadTeachers = async () => {
    setListLoading(true);
    setListErr('');
    try {
      setItems(await principalService.getPrincipalTeachers(getHeaders()));
    } catch (err: any) {
      setItems([]);
      setListErr(err?.response?.data?.detail || 'Unable to fetch teachers.');
    } finally {
      setListLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setFieldErrors({});
    setOtp('');
    setOtpSent(false);
    setEmailVerified(false);
    setFormData({ ...INITIAL_FORM, branch_id: branchId });
  };

  const startEnroll = async () => {
    setActiveTab('enroll');
    resetForm();
    setServerError('');
    setServerSuccess('');
    await fetchNextEmployeeId();
  };

  const handleSendOtp = async () => {
    setServerError('');
    setServerSuccess('');
    const email = String(formData.email_id || '').trim().toLowerCase();
    if (!email) {
      setFieldErrors((prev) => ({ ...prev, email_id: 'Email is required' }));
      setServerError('Please enter teacher email first.');
      return;
    }
    if (!isValidEmail(email)) {
      setFieldErrors((prev) => ({ ...prev, email_id: 'Enter a valid email' }));
      setServerError('Please enter a valid email address.');
      return;
    }
    if (items.some((t) => String(t.email_id || '').trim().toLowerCase() === email)) {
      setOtpSent(false);
      setEmailVerified(false);
      setFieldErrors((prev) => ({ ...prev, email_id: 'Email already exists' }));
      setServerError('Email already exists');
      Alert.alert('Error', 'Email already exists');
      return;
    }
    setOtpSending(true);
    try {
      const res = await API.post('/teacher/register/send-otp', { email_id: email }, { headers: getHeaders() });
      setFormData((prev) => ({ ...prev, email_id: email }));
      setFieldErrors((prev) => { const next = { ...prev }; delete next.email_id; return next; });
      setOtpSent(true);
      setEmailVerified(false);
      const otpNote = res?.data?.otp ? ` Debug OTP: ${res.data.otp}` : '';
      setServerSuccess(`${res?.data?.message || 'OTP sent successfully.'}${otpNote}`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP.';
      setOtpSent(false);
      setEmailVerified(false);
      if (err?.response?.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email_id: msg }));
        Alert.alert('Error', formatErrorMessage(msg));
      }
      setServerError(formatErrorMessage(msg));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setServerError('');
    setServerSuccess('');
    const email = String(formData.email_id || '').trim().toLowerCase();
    const enteredOtp = String(otp || '').trim();
    if (!email) { setServerError('Please enter teacher email.'); return; }
    if (!enteredOtp) { setServerError('Please enter OTP.'); return; }
    setOtpVerifying(true);
    try {
      await API.post('/teacher/register/verify-otp', { email_id: email, otp: enteredOtp }, { headers: getHeaders() });
      setOtpSent(true);
      setEmailVerified(true);
      setServerSuccess('Teacher email verified successfully.');
    } catch (err: any) {
      setEmailVerified(false);
      setServerError(err?.response?.data?.detail || 'OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setServerError('');
    setServerSuccess('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
    if (name === 'date_of_birth') {
      setFormData((prev) => ({ ...prev, date_of_birth: value, age: calculateAge(value) }));
      return;
    }
    if (name === 'email_id') {
      setFormData((prev) => ({ ...prev, email_id: value }));
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      return;
    }
    const sanitized = sanitizeTeacherFieldChange(name, value);
    if (name === 'designation' && sanitized === 'Accountant') {
      setFormData((prev) => ({ ...prev, designation: sanitized, department_subject: 'Others' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
  };

  const nextStep = () => {
    if (step === 4) { return; }
    const errs = validateStep(step, formData);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    if (step === 0 && !emailVerified) {
      setServerError('Please verify your email with OTP before proceeding.');
      return;
    }
    setFieldErrors({});
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setServerError('');
    setServerSuccess('');
    setFieldErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const submitTeacher = async () => {
    setServerError('');
    setServerSuccess('');
    if (!schoolCode || !branchId) { setServerError('Missing school/branch.'); return; }
    const allErrors = { ...validateStep(0, formData), ...validateStep(1, formData), ...validateStep(2, formData), ...validateStep(3, formData) };
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      setStep(getValidationErrorStep(allErrors));
      setServerError('Please fix the highlighted fields before registering.');
      return;
    }
    if (!emailVerified) {
      setStep(0);
      setServerError('Please verify teacher email with OTP before submitting.');
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'teacher_photograph' && v && (v as any).uri) {
          data.append('teacher_photograph', { uri: (v as any).uri, type: (v as any).type || 'image/jpeg', name: (v as any).fileName || 'teacher.jpg' } as any);
        } else if (v !== null && v !== '') {
          data.append(k, v as string);
        }
      });
      const res = await API.post('/teacher/register', data, { headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' } });
      const createdTeacherId = String(res?.data?.teacher_id || '').trim();
      const createdEmployeeId = String(res?.data?.employee_id || formData.employee_id || '').trim();
      setServerSuccess(createdTeacherId ? `Teacher Registered Successfully! Teacher ID: ${createdTeacherId}${createdEmployeeId ? ` | Employee ID: ${createdEmployeeId}` : ''}` : 'Teacher Registered Successfully!');
      resetForm();
      setActiveTab('list');
      loadTeachers();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'object') {
        setServerError(String(Object.values(detail)[0] || 'Validation failed.'));
        setFieldErrors((prev) => ({ ...prev, ...detail }));
      } else {
        setServerError(detail || 'Submission failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditTeacher = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setEditForm(teacherToEditForm(teacher));
  };

  const saveEditTeacher = async () => {
    if (!editTeacher || !editForm) { return; }
    if (!editForm.teacher_full_name.trim()) { setListErr('Teacher name is required.'); return; }
    if (!editForm.mobile_number.trim()) { setListErr('Mobile number is required.'); return; }
    if (!editForm.employee_id.trim()) { setListErr('Employee ID is required.'); return; }
    if (!editForm.designation.trim()) { setListErr('Designation is required.'); return; }
    if (editForm.email_id && !isValidEmail(editForm.email_id)) { setListErr('Enter a valid email.'); return; }
    setSavingEdit(true);
    setListErr('');
    try {
      await API.put(`/principal/teachers/${editTeacher.teacher_id}`, editForm, { headers: getHeaders() });
      setServerSuccess('Teacher updated successfully.');
      setEditTeacher(null);
      setEditForm(null);
      loadTeachers();
    } catch (err: any) {
      setListErr(err?.response?.data?.detail || 'Failed to update teacher.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await API.get('/principal/teachers/download', { headers: getHeaders(), params: { file_format: 'csv' } });
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const filename = `teachers_${schoolCode}_${branchId}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;
      await RNFS.writeFile(filePath, content, 'utf8');
      await Share.open({ url: `file://${filePath}`, type: 'text/csv', filename, title: 'Export Teachers' });
    } catch (err: any) {
      if (err.message !== 'User did not share') { Alert.alert('Error', err?.message || 'Download failed'); }
    }
  };

  const handleCopyLink = () => {
    const sc = String(schoolCode || '').trim();
    const bid = String(branchId || '').trim();
    if (!sc || !bid) { setListErr('School code or branch id missing.'); return; }
    const url = `https://attendx.edu/teacher-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}`;
    Alert.alert('Invite Link', url, [
      { text: 'Copy', onPress: () => { setCopied(true); setTimeout(() => setCopied(false), 2000); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImagePick = () => {
    const setPhoto = (asset: { uri?: string }) => {
      if (asset?.uri) { setFormData((prev) => ({ ...prev, teacher_photograph: asset as any })); }
    };
    Alert.alert('Select Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (r) => setPhoto(r.assets?.[0] || {})) },
      { text: 'Choose from Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (r) => setPhoto(r.assets?.[0] || {})) },
    ]);
  };

  const departments = useMemo(() => ['all', ...new Set(items.map((i) => i.department_subject).filter(Boolean))], [items]);
  const filtered = useMemo(() => filterTeachers(items, q, statusFilter, deptFilter), [items, q, statusFilter, deptFilter]);
  const summaryStats = useMemo(() => ({
    total: items.length,
    active: items.filter((t) => String(t.teacher_status || '').toUpperCase() === 'ACTIVE').length,
    inactive: items.filter((t) => String(t.teacher_status || '').toUpperCase() === 'INACTIVE').length,
    visible: filtered.length,
  }), [items, filtered.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const visibleStart = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          innerPageLayoutStyles.scrollPageContent,
          { paddingBottom: tabBarScrollPadding },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={activeTab === 'list' ? <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadTeachers(); setRefreshing(false); }} tintColor={C.primary} /> : undefined}
      >
        <StandardPageHeader
          scrollWithContent
          title="Staff Management"
          subtitle="Staff directory and registration"
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={<TouchableOpacity accessibilityRole="button" style={heroHeaderStyles.iconBtn} onPress={loadTeachers}><RefreshCw size={20} color={Theme.colors.card} /></TouchableOpacity>}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <TeacherTabHeader
            activeTab={activeTab}
            copied={copied}
            onSelectList={() => setActiveTab('list')}
            onStartEnroll={startEnroll}
            onCopyLink={handleCopyLink}
            onBackToList={() => setActiveTab('list')}
          />

          {activeTab === 'list' ? (
            <TeacherDirectoryTab
              isCompactScreen={isCompactScreen}
              summaryStats={summaryStats}
              query={q}
              statusFilter={statusFilter}
              deptFilter={deptFilter}
              departments={departments}
              listLoading={listLoading}
              listErr={listErr}
              paginated={paginated}
              filteredCount={filtered.length}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              currentPage={currentPage}
              totalPages={totalPages}
              onQueryChange={setQ}
              onStatusFilterChange={setStatusFilter}
              onDeptFilterChange={setDeptFilter}
              onRefresh={loadTeachers}
              onExport={handleExport}
              onViewProfile={setViewTeacher}
              onEdit={openEditTeacher}
              onPageChange={setCurrentPage}
            />
          ) : (
            <TeacherEnrollmentForm
              step={step}
              formData={formData}
              fieldErrors={fieldErrors}
              loading={loading}
              serverError={serverError}
              serverSuccess={serverSuccess}
              otp={otp}
              otpSent={otpSent}
              emailVerified={emailVerified}
              otpSending={otpSending}
              otpVerifying={otpVerifying}
              showDatePicker={showDatePicker}
              datePickerField={datePickerField}
              onFieldChange={handleChange}
              onOtpChange={setOtp}
              onSendOtp={handleSendOtp}
              onVerifyOtp={handleVerifyOtp}
              onShowDatePickerChange={setShowDatePicker}
              onDatePickerFieldChange={setDatePickerField}
              onFormDataChange={setFormData}
              onImagePick={handleImagePick}
              onPrevStep={prevStep}
              onNextStep={nextStep}
              onSubmit={submitTeacher}
              onCancel={() => setActiveTab('list')}
            />
          )}
        </View>
      </ScrollView>

      <TeacherProfileSheet
        teacher={viewTeacher}
        isCompactScreen={isCompactScreen}
        windowHeight={windowHeight}
        bottomInset={insets.bottom}
        onClose={() => setViewTeacher(null)}
        onEdit={(teacher) => { setViewTeacher(null); openEditTeacher(teacher); }}
      />

      <TeacherEditModal
        visible={!!editTeacher}
        editForm={editForm}
        saving={savingEdit}
        windowHeight={windowHeight}
        windowHeight={windowHeight}
        editScrollMaxHeight={0}
        bottomInset={insets.bottom}
        editScrollRef={editScrollRef}
        onClose={() => { setEditTeacher(null); setEditForm(null); }}
        onSave={saveEditTeacher}
        onFormChange={(updater) => setEditForm((prev) => (prev ? updater(prev) : prev))}
        onFieldFocus={() => requestAnimationFrame(() => editScrollRef.current?.scrollToEnd({ animated: true }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
});
