import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Home, Users, GraduationCap, Settings } from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceHubStyles as styles } from './attendanceHubStyles';

export interface AttendanceFooterTabsProps {
  bottomInset: number;
}

export default function AttendanceFooterTabs({ bottomInset }: AttendanceFooterTabsProps) {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View style={[styles.footerTabs, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('PrincipalDashboard' as never)}>
        <View style={[styles.footerIconWrap, route.name === 'PrincipalDashboard' && styles.footerIconWrapActive]}>
          <Home size={22} color={route.name === 'PrincipalDashboard' ? Theme.colors.violet : '#8a96a6'} />
        </View>
        <AppText style={[styles.footerTabText, route.name === 'PrincipalDashboard' && styles.footerTabTextActive]} weight="semibold">Home</AppText>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('TeacherManagement' as never)}>
        <View style={[styles.footerIconWrap, route.name === 'TeacherManagement' && styles.footerIconWrapActive]}>
          <Users size={22} color={route.name === 'TeacherManagement' ? Theme.colors.violet : '#8a96a6'} />
        </View>
        <AppText style={[styles.footerTabText, route.name === 'TeacherManagement' && styles.footerTabTextActive]} weight="semibold">Staff</AppText>
      </TouchableOpacity>

      <View style={styles.footerCenterSlot}>
        <TouchableOpacity accessibilityRole="button" style={styles.footerFab} onPress={() => navigation.navigate('TeacherAssignment' as never)} activeOpacity={0.85}>
          <View style={styles.footerFabInner}>
            <GraduationCap size={20} color={Theme.colors.card} />
          </View>
        </TouchableOpacity>
        <AppText style={styles.footerCenterLabel} weight="semibold">Teacher{'\n'}Assignment</AppText>
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('StudentManagement' as never)}>
        <View style={[styles.footerIconWrap, route.name === 'StudentManagement' && styles.footerIconWrapActive]}>
          <GraduationCap size={22} color={route.name === 'StudentManagement' ? Theme.colors.violet : '#8a96a6'} />
        </View>
        <AppText style={[styles.footerTabText, route.name === 'StudentManagement' && styles.footerTabTextActive]} weight="semibold">Students</AppText>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('Settings' as never)}>
        <View style={[styles.footerIconWrap, route.name === 'Settings' && styles.footerIconWrapActive]}>
          <Settings size={22} color={route.name === 'Settings' ? Theme.colors.violet : '#8a96a6'} />
        </View>
        <AppText style={[styles.footerTabText, route.name === 'Settings' && styles.footerTabTextActive]} weight="semibold">Settings</AppText>
      </TouchableOpacity>
    </View>
  );
}
