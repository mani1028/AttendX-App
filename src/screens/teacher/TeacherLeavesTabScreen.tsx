import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, Users } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { getTeacherCapability, getTeacherProfile } from '../../services/teacherService';
import TeacherLeaveRequestScreen from './LeaveRequestScreen';
import TeacherLeaveApprovalScreen from './LeaveApprovalScreen';

type LeaveTab = 'request' | 'approval';

function LeavesTabBar({
  activeTab,
  onChange,
}: {
  activeTab: LeaveTab;
  onChange: (tab: LeaveTab) => void;
}) {
  return (
    <View style={styles.tabBarInScroll}>
      <View style={innerPageLayoutStyles.segmentedControl}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            innerPageLayoutStyles.segmentedTab,
            activeTab === 'request' && innerPageLayoutStyles.segmentedTabActive,
          ]}
          onPress={() => onChange('request')}
        >
          <Calendar size={16} color={segmentedControlIconColor(activeTab === 'request')} />
          <AppText
            weight="semibold"
            style={[
              innerPageLayoutStyles.segmentedTabText,
              activeTab === 'request' && innerPageLayoutStyles.segmentedTabTextActive,
            ]}
          >
            My Leave
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            innerPageLayoutStyles.segmentedTab,
            activeTab === 'approval' && innerPageLayoutStyles.segmentedTabActive,
          ]}
          onPress={() => onChange('approval')}
        >
          <Users size={16} color={segmentedControlIconColor(activeTab === 'approval')} />
          <AppText
            weight="semibold"
            style={[
              innerPageLayoutStyles.segmentedTabText,
              activeTab === 'approval' && innerPageLayoutStyles.segmentedTabTextActive,
            ]}
          >
            Student Approvals
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TeacherLeavesTabScreen() {
  const { isClassTeacher: authIsClassTeacher } = useAuth();
  const [effectiveIsClassTeacher, setEffectiveIsClassTeacher] = useState(authIsClassTeacher);
  const [activeTab, setActiveTab] = useState<LeaveTab>('request');

  const resolveClassTeacher = useCallback(async () => {
    try {
      if (authIsClassTeacher) {
        setEffectiveIsClassTeacher(true);
        return;
      }

      const profile = await getTeacherProfile();
      if (profile?.is_class_teacher === true) {
        setEffectiveIsClassTeacher(true);
        return;
      }

      const schoolCode =
        profile?.school_code ||
        (await AsyncStorage.getItem('school_code')) ||
        '';
      const employeeId =
        profile?.employee_id ||
        (await AsyncStorage.getItem('employee_id')) ||
        '';

      if (schoolCode && employeeId) {
        const cap = await getTeacherCapability(schoolCode, employeeId);
        if (cap?.user?.is_class_teacher === true) {
          setEffectiveIsClassTeacher(true);
          return;
        }
      }

      const flag = await AsyncStorage.getItem('is_class_teacher');
      setEffectiveIsClassTeacher(flag === 'true' || flag === '1');
    } catch {
      setEffectiveIsClassTeacher(authIsClassTeacher);
    }
  }, [authIsClassTeacher]);

  useEffect(() => {
    resolveClassTeacher();
  }, [resolveClassTeacher]);

  // Regular teacher — own leave only (full screen with header)
  if (!effectiveIsClassTeacher) {
    return <TeacherLeaveRequestScreen />;
  }

  const headerTitle = activeTab === 'request' ? 'Leave Request' : 'Student Leaves';
  const headerSubtitle =
    activeTab === 'request'
      ? 'Apply for leave and track your requests'
      : 'Review and manage student leave applications';

  const scrollHeader = (
    <>
      <StandardPageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        showBack={false}
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
      />
      <LeavesTabBar activeTab={activeTab} onChange={setActiveTab} />
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {activeTab === 'request' ? (
          <TeacherLeaveRequestScreen embedded scrollHeader={scrollHeader} />
        ) : (
          <TeacherLeaveApprovalScreen embedded scrollHeader={scrollHeader} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  tabBarInScroll: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.sm,
  },
  panel: { flex: 1 },
});
