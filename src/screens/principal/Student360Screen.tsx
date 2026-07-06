import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  User,
  Calendar,
  BookOpen,
  DollarSign,
  Award,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import AvatarBubble from '../../components/common/AvatarBubble';
import AppText from '../../components/common/AppText';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles, SCROLL_PAGE_GUTTER } from '../../components/layout/innerPageLayoutStyles';
import { getProfile } from '../../services/studentService';
import {
  getStudentPromotionHistory,
  searchPrincipalStudents,
  type PrincipalStudentSearchResult,
} from '../../services/principalService';

type TabKey = 'overview' | 'academics' | 'contact';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <User size={14} /> },
  { key: 'academics', label: 'Academics', icon: <BookOpen size={14} /> },
  { key: 'contact', label: 'Contact', icon: <Phone size={14} /> },
];

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '—';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue} weight="semibold">{value}</AppText>
    </View>
  );
}

export default function Student360Screen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Student360'>>();
  const insets = useSafeAreaInsets();

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PrincipalStudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<PrincipalStudentSearchResult | null>(null);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const headers = useMemo(
    () => ({
      'X-School-Code': schoolCode,
      'x-school-code': schoolCode,
      'X-Branch-Id': branchId,
      'x-branch-id': branchId,
    }),
    [schoolCode, branchId],
  );

  useEffect(() => {
    (async () => {
      const code =
        (await AsyncStorage.getItem('school_code')) ||
        (await AsyncStorage.getItem('schoolCode')) ||
        '';
      const branch =
        (await AsyncStorage.getItem('branch_id')) ||
        (await AsyncStorage.getItem('branchId')) ||
        '';
      setSchoolCode(code);
      setBranchId(branch);
    })();
  }, []);

  useEffect(() => {
    const initialId = route.params?.studentId;
    const initialName = route.params?.studentName;
    if (initialId) {
      setQuery(initialId);
      setSelectedStudent({
        roll_no: initialId,
        student_full_name: initialName,
        name: initialName,
      });
    }
  }, [route.params?.studentId, route.params?.studentName]);

  const loadStudentProfile = useCallback(async (student: PrincipalStudentSearchResult) => {
    const rollNo = pickText(student.roll_no, student.roll_number, student.student_id);
    if (!rollNo || rollNo === '—') {
      setProfileError('Student ID is missing for this record.');
      return;
    }

    setLoadingProfile(true);
    setProfileError('');
    try {
      const [profileData, historyRows] = await Promise.all([
        getProfile(rollNo, schoolCode),
        getStudentPromotionHistory(rollNo, headers),
      ]);
      setProfile(profileData || null);
      setHistory(Array.isArray(historyRows) ? historyRows : []);
      if (!profileData) {
        setProfileError('Student profile not found.');
      }
    } catch (error: any) {
      setProfile(null);
      setHistory([]);
      setProfileError(error?.response?.data?.detail || error?.message || 'Failed to load student profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, [headers, schoolCode]);

  useEffect(() => {
    if (selectedStudent && schoolCode) {
      loadStudentProfile(selectedStudent);
    }
  }, [selectedStudent, schoolCode, loadStudentProfile]);

  useEffect(() => {
    if (!schoolCode) { return undefined; }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const rows = await searchPrincipalStudents(trimmed, headers);
        setSearchResults(rows);
      } catch (error: any) {
        setSearchResults([]);
        setSearchError(error?.response?.data?.detail || error?.message || 'Search failed.');
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, schoolCode, headers]);

  const displayName = pickText(
    profile?.student_full_name,
    profile?.name,
    selectedStudent?.student_full_name,
    selectedStudent?.name,
  );

  const displayClass = profile
    ? `Class ${pickText(profile.class_grade, profile.class)} - ${pickText(profile.section, '—')}`
    : selectedStudent
      ? `Class ${pickText(selectedStudent.class_grade)} - ${pickText(selectedStudent.section)}`
      : '';

  const rollNo = pickText(
    profile?.roll_number,
    profile?.roll_no,
    selectedStudent?.roll_number,
    selectedStudent?.roll_no,
  );

  const handleSelectStudent = (student: PrincipalStudentSearchResult) => {
    setSelectedStudent(student);
    setActiveTab('overview');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedStudent(null);
    setProfile(null);
    setHistory([]);
    setProfileError('');
    setQuery('');
    setSearchResults([]);
  };

  const handleCall = (phone: string) => {
    const normalized = phone.replace(/\s/g, '');
    if (!normalized || normalized === '—') {
      Alert.alert('Unavailable', 'No phone number on file.');
      return;
    }
    Linking.openURL(`tel:${normalized}`).catch(() => {
      Alert.alert('Error', 'Could not open the dialer.');
    });
  };

  const handleEmail = (email: string) => {
    if (!email || email === '—') {
      Alert.alert('Unavailable', 'No email on file.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Could not open the mail app.');
    });
  };

  const renderSearch = () => (
    <View style={styles.searchCard}>
      <AppText style={styles.searchTitle} weight="bold">Find a Student</AppText>
      <AppText style={styles.searchSub}>
        Search by student name, roll number, or student ID.
      </AppText>

      <View style={styles.searchInputWrap}>
        <Search size={18} color={Theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Name or student ID..."
          placeholderTextColor={Theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setQuery('')}>
            <X size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <View style={styles.searchLoading}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
          <AppText style={styles.searchLoadingText}>Searching...</AppText>
        </View>
      ) : null}

      {searchError ? (
        <AppText style={styles.searchError}>{searchError}</AppText>
      ) : null}

      {!searching && query.trim().length >= 2 && searchResults.length === 0 && !searchError ? (
        <AppText style={styles.emptySearchText}>No students matched your search.</AppText>
      ) : null}

      {searchResults.map((student) => {
        const name = pickText(student.student_full_name, student.name, 'Unknown');
        const id = pickText(student.roll_number, student.roll_no, student.student_id);
        const classLabel = `Class ${pickText(student.class_grade)} - ${pickText(student.section)}`;
        return (
          <TouchableOpacity
            key={`${id}-${name}`}
            accessibilityRole="button"
            style={styles.resultRow}
            onPress={() => handleSelectStudent(student)}
          >
            <AvatarBubble displayName={name} size={42} textSize={16} primaryColor={Theme.colors.primary} />
            <View style={styles.resultCopy}>
              <AppText style={styles.resultName} weight="bold">{name}</AppText>
              <AppText style={styles.resultMeta}>ID: {id} • {classLabel}</AppText>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderOverview = () => (
    <View>
      <InfoRow label="Student Name" value={displayName} />
      <InfoRow label="Roll Number" value={rollNo} />
      <InfoRow label="Admission No." value={pickText(profile?.admission_number)} />
      <InfoRow label="Class & Section" value={displayClass} />
      <InfoRow label="Academic Year" value={pickText(profile?.academic_year)} />
      <InfoRow label="Status" value={pickText(profile?.student_status, profile?.status, 'ACTIVE')} />
      <InfoRow label="Gender" value={pickText(profile?.gender, profile?.student_gender)} />
      <InfoRow label="Date of Birth" value={pickText(profile?.date_of_birth, profile?.dob)} />
      <InfoRow label="Father / Guardian" value={pickText(profile?.father_guardian_name, profile?.parent_guardian_name)} />
    </View>
  );

  const renderAcademics = () => (
    <View>
      {history.length === 0 ? (
        <View style={styles.emptyPanel}>
          <BookOpen size={36} color={Theme.colors.textMuted} />
          <AppText style={styles.emptyPanelTitle} weight="bold">No academic history yet</AppText>
          <AppText style={styles.emptyPanelText}>Promotion and exam history will appear here.</AppText>
        </View>
      ) : (
        history.map((item, index) => (
          <View key={`${item?.id || index}`} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={{ flex: 1 }}>
              <AppText style={styles.historyTitle} weight="semibold">
                {pickText(item?.to_class_name, item?.class_grade, item?.title, 'Record')}
              </AppText>
              <AppText style={styles.historySub}>
                {pickText(item?.academic_year, item?.year, item?.created_at?.slice?.(0, 10))}
              </AppText>
              {item?.remarks ? (
                <AppText style={styles.historyRemarks}>{String(item.remarks)}</AppText>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderContact = () => (
    <View>
      <InfoRow label="Parent Mobile" value={pickText(profile?.parent_guardian_mobile, profile?.father_mobile, profile?.mobile_number)} />
      <InfoRow label="Parent Email" value={pickText(profile?.parent_guardian_email, profile?.email_id)} />
      <InfoRow label="Address" value={pickText(profile?.address, profile?.permanent_address, profile?.current_address)} />

      <View style={styles.contactActions}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]}
          onPress={() => handleCall(pickText(profile?.parent_guardian_mobile, profile?.father_mobile, profile?.mobile_number))}
        >
          <Phone size={16} color="#fff" />
          <AppText style={styles.actionBtnText} weight="semibold">Call Parent</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionBtn, { backgroundColor: Theme.colors.info }]}
          onPress={() => handleEmail(pickText(profile?.parent_guardian_email, profile?.email_id))}
        >
          <Mail size={16} color="#fff" />
          <AppText style={styles.actionBtnText} weight="semibold">Email Parent</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (loadingProfile) {
      return (
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <AppText style={styles.loadingText}>Loading student profile...</AppText>
        </View>
      );
    }

    if (profileError) {
      return (
        <View style={styles.emptyPanel}>
          <FileText size={36} color={Theme.colors.error} />
          <AppText style={styles.emptyPanelTitle} weight="bold">{profileError}</AppText>
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'academics':
        return renderAcademics();
      case 'contact':
        return renderContact();
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <StandardPageHeader
        title="Student 360"
        subtitle={selectedStudent ? displayName : 'Search by name or student ID'}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[styles.scrollContent, innerPageLayoutStyles.scrollContent, { paddingBottom: insets.bottom + Theme.spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageBody}>
          {!selectedStudent ? (
            renderSearch()
          ) : (
            <>
              <View style={styles.profileCard}>
                <AvatarBubble
                  displayName={displayName}
                  size={64}
                  textSize={24}
                  primaryColor={Theme.colors.primary}
                />
                <View style={styles.profileInfo}>
                  <AppText style={styles.profileName} weight="bold">{displayName}</AppText>
                  <AppText style={styles.profileMeta}>{displayClass} • Roll {rollNo}</AppText>
                  <AppText style={styles.profileMeta}>Admission: {pickText(profile?.admission_number)}</AppText>
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.changeBtn} onPress={handleClearSelection}>
                  <Search size={16} color={Theme.colors.primary} />
                  <AppText style={styles.changeBtnText} weight="semibold">Search</AppText>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    accessibilityRole="button"
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
                  >
                    {tab.icon}
                    <AppText style={[styles.tabPillText, activeTab === tab.key && styles.tabPillTextActive]} weight="semibold">
                      {tab.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.contentCard}>
                {renderTabContent()}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { flexGrow: 1 },
  pageBody: {
    paddingTop: 14,
  },
  searchCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  searchTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  searchSub: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    marginTop: 4,
    marginBottom: Theme.spacing.md,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    paddingVertical: 0,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Theme.spacing.md,
  },
  searchLoadingText: {
    color: Theme.colors.textMuted,
  },
  searchError: {
    color: Theme.colors.error,
    marginTop: Theme.spacing.sm,
  },
  emptySearchText: {
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginTop: 4,
  },
  resultCopy: { flex: 1 },
  resultName: {
    color: Theme.colors.text,
    fontSize: 15,
  },
  resultMeta: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    marginRight: Theme.spacing.sm,
  },
  profileName: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  profileMeta: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  changeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  changeBtnText: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    marginTop: 2,
  },
  tabsContainer: {
    gap: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    marginRight: Theme.spacing.sm,
  },
  tabPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  tabPillText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginLeft: 4,
  },
  tabPillTextActive: {
    color: '#fff',
  },
  contentCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  infoLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    flex: 1,
  },
  infoValue: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  historyTitle: {
    color: Theme.colors.text,
  },
  historySub: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  historyRemarks: {
    ...Theme.typography.caption,
    color: Theme.colors.text,
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  loadingPanel: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    color: Theme.colors.textMuted,
  },
  emptyPanel: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyPanelTitle: {
    color: Theme.colors.text,
    fontSize: 16,
  },
  emptyPanelText: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
});
