import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { BranchTab } from './types';

const TAB_LABELS: Record<BranchTab, string> = {
  teachers: 'Teachers',
  students: 'Students',
  attendance: 'Attendance',
  leaves: 'Leaves',
  marks: 'Marks',
};

interface BranchTabBarProps {
  activeTab: BranchTab;
  onTabChange: (tab: BranchTab) => void;
}

const BranchTabBar: React.FC<BranchTabBarProps> = ({ activeTab, onTabChange }) => (
  <View style={styles.tabBar}>
    {(Object.keys(TAB_LABELS) as BranchTab[]).map(tab => (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, activeTab === tab && styles.tabActive]}
        onPress={() => onTabChange(tab)}
      >
        <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]} weight="regular">
          {TAB_LABELS[tab]}
        </AppText>
      </TouchableOpacity>
    ))}
  </View>
);

export default BranchTabBar;
