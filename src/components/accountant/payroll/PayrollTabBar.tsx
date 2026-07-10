import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { Users, User, Clock } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import { payrollStyles as styles } from './payrollStyles';

const TABS = [
  { key: 'bulk', label: 'Bulk', icon: Users },
  { key: 'individual', label: 'Individual', icon: User },
  { key: 'hours', label: 'Hours', icon: Clock },
] as const;

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function PayrollTabBar({ activeTab, onTabChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContainer}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.key)}
          >
            <Icon size={16} color={isActive ? Theme.colors.primary : Theme.colors.textSec} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
