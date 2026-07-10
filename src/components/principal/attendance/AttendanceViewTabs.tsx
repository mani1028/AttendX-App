import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Users, Users2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { innerPageLayoutStyles, segmentedControlIconColor } from '../../layout/innerPageLayoutStyles';
import { attendanceStyles as styles } from './styles';
import type { AttendanceView } from './types';

export interface AttendanceViewTabsProps {
  view: AttendanceView;
  onViewChange: (view: AttendanceView) => void;
}

export default function AttendanceViewTabs({ view, onViewChange }: AttendanceViewTabsProps) {
  return (
    <View style={[innerPageLayoutStyles.segmentedControl, styles.segmentedTabContainer]}>
      <TouchableOpacity
        accessibilityRole="button"
        style={[innerPageLayoutStyles.segmentedTab, view === 'teachers' && innerPageLayoutStyles.segmentedTabActive]}
        onPress={() => onViewChange('teachers')}
        activeOpacity={0.8}
      >
        <Users size={16} color={segmentedControlIconColor(view === 'teachers')} />
        <AppText
          style={[innerPageLayoutStyles.segmentedTabText, view === 'teachers' && innerPageLayoutStyles.segmentedTabTextActive]}
          weight="bold"
        >
          Teachers
        </AppText>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={[innerPageLayoutStyles.segmentedTab, view === 'students' && innerPageLayoutStyles.segmentedTabActive]}
        onPress={() => onViewChange('students')}
        activeOpacity={0.8}
      >
        <Users2 size={16} color={segmentedControlIconColor(view === 'students')} />
        <AppText
          style={[innerPageLayoutStyles.segmentedTabText, view === 'students' && innerPageLayoutStyles.segmentedTabTextActive]}
          weight="bold"
        >
          Students
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
