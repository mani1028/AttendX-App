import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  getPrincipalStudentProfile,
  getStudentPromotionHistory,
  searchPrincipalStudents,
  type PrincipalStudentSearchResult,
} from '../../services/principalService';
import {
  student360Styles as styles,
  pickText,
  Student360SearchPanel,
  Student360ProfileHeader,
  Student360TabBar,
  Student360TabContent,
  type Student360TabKey,
} from '../../components/principal/student360';

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
  const [activeTab, setActiveTab] = useState<Student360TabKey>('overview');

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
      const code = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
      const branch = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '';
      setSchoolCode(code);
      setBranchId(branch);
    })();
  }, []);

  useEffect(() => {
    const initialId = route.params?.studentId;
    const initialName = route.params?.studentName;
    if (!initialId) { return; }

    setQuery(initialId);
    setSelectedStudent({
      roll_no: initialId,
      roll_number: initialId,
      student_full_name: initialName,
      name: initialName,
    });
  }, [route.params?.studentId, route.params?.studentName]);

  useEffect(() => {
    const initialId = route.params?.studentId?.trim();
    if (!initialId || !schoolCode) { return; }

    let mounted = true;
    (async () => {
      try {
        const rows = await searchPrincipalStudents(initialId, headers);
        const match = rows.find((row) =>
          [row.roll_no, row.roll_number, row.student_id, row.admission_number]
            .some((value) => String(value || '').trim().toUpperCase() === initialId.toUpperCase()),
        ) || rows[0];
        if (mounted && match) {
          setSelectedStudent(match);
        }
      } catch {
        // keep route-based fallback student
      }
    })();

    return () => {
      mounted = false;
    };
  }, [route.params?.studentId, schoolCode, headers]);

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
        getPrincipalStudentProfile(rollNo, headers),
        getStudentPromotionHistory(rollNo, headers),
      ]);
      setProfile(profileData || null);
      setHistory(Array.isArray(historyRows) ? historyRows : []);
      if (!profileData) { setProfileError('Student profile not found.'); }
    } catch (error: any) {
      setProfile(null);
      setHistory([]);
      setProfileError(error?.response?.data?.detail || error?.message || 'Failed to load student profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, [headers, schoolCode]);

  useEffect(() => {
    if (selectedStudent && schoolCode) { loadStudentProfile(selectedStudent); }
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

  const displayName = pickText(profile?.student_full_name, profile?.name, selectedStudent?.student_full_name, selectedStudent?.name);
  const displayClass = profile
    ? `Class ${pickText(profile.class_grade, profile.class)} - ${pickText(profile.section, '—')}`
    : selectedStudent
      ? `Class ${pickText(selectedStudent.class_grade)} - ${pickText(selectedStudent.section)}`
      : '';
  const rollNo = pickText(profile?.roll_number, profile?.roll_no, selectedStudent?.roll_number, selectedStudent?.roll_no);

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
    Linking.openURL(`tel:${normalized}`).catch(() => Alert.alert('Error', 'Could not open the dialer.'));
  };

  const handleEmail = (email: string) => {
    if (!email || email === '—') {
      Alert.alert('Unavailable', 'No email on file.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Could not open the mail app.'));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[styles.scrollContent, innerPageLayoutStyles.scrollContent, { paddingBottom: insets.bottom + Theme.spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Student 360"
        subtitle={selectedStudent ? displayName : 'Search by name or student ID'}
        onBackPress={() => navigation.goBack()}
      />

        <View style={styles.pageBody}>
          {!selectedStudent ? (
            <Student360SearchPanel
              query={query}
              onQueryChange={setQuery}
              searching={searching}
              searchError={searchError}
              searchResults={searchResults}
              onSelectStudent={handleSelectStudent}
            />
          ) : (
            <>
              <Student360ProfileHeader
                displayName={displayName}
                displayClass={displayClass}
                rollNo={rollNo}
                profile={profile}
                onClearSelection={handleClearSelection}
              />
              <Student360TabBar activeTab={activeTab} onTabChange={setActiveTab} />
              <View style={styles.contentCard}>
                <Student360TabContent
                  activeTab={activeTab}
                  loadingProfile={loadingProfile}
                  profileError={profileError}
                  profile={profile}
                  history={history}
                  displayName={displayName}
                  rollNo={rollNo}
                  displayClass={displayClass}
                  onCall={handleCall}
                  onEmail={handleEmail}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
