import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { User, BookOpen, Phone } from 'lucide-react-native';
import AppText from '../../common/AppText';
import type { Student360TabKey } from './types';
import { student360Styles as styles } from './student360Styles';

const TABS: { key: Student360TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <User size={14} /> },
  { key: 'academics', label: 'Academics', icon: <BookOpen size={14} /> },
  { key: 'contact', label: 'Contact', icon: <Phone size={14} /> },
];

export interface Student360TabBarProps {
  activeTab: Student360TabKey;
  onTabChange: (tab: Student360TabKey) => void;
}

export default function Student360TabBar({ activeTab, onTabChange }: Student360TabBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          accessibilityRole="button"
          onPress={() => onTabChange(tab.key)}
          style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
        >
          {tab.icon}
          <AppText style={[styles.tabPillText, activeTab === tab.key && styles.tabPillTextActive]} weight="semibold">
            {tab.label}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
