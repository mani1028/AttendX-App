import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronLeft, Plus, Link, Users } from 'lucide-react-native';
import AppText from '../../common/AppText';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../layout/innerPageLayoutStyles';
import { Theme, C } from '../../../theme/tokens';
import { teacherManagementStyles as styles } from './styles';

export interface TeacherTabHeaderProps {
  activeTab: 'list' | 'enroll';
  copied: boolean;
  onSelectList: () => void;
  onStartEnroll: () => void;
  onCopyLink: () => void;
  onBackToList: () => void;
}

export default function TeacherTabHeader({
  activeTab,
  copied,
  onSelectList,
  onStartEnroll,
  onCopyLink,
  onBackToList,
}: TeacherTabHeaderProps) {
  return (
    <>
      <View style={styles.headerContentContainer}>
        <View style={[innerPageLayoutStyles.segmentedControl, styles.headerToggle]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'list' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={onSelectList}
          >
            <Users size={16} color={segmentedControlIconColor(activeTab === 'list')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'list' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">Staff Directory</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={onStartEnroll}
          >
            <Plus size={16} color={segmentedControlIconColor(activeTab === 'enroll')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">Staff Register</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.headerActions}>
          {activeTab === 'list' ? (
            <>
              <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onCopyLink}>
                <Link size={14} color={C.text} />
                <AppText style={styles.secondaryBtnText} weight="semibold">{copied ? 'Copied!' : 'Invite'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={onStartEnroll}>
                <Plus size={14} color={Theme.colors.card} />
                <AppText style={styles.primaryBtnText} weight="semibold">Add Teacher</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onBackToList}>
              <ChevronLeft size={14} color={C.text} />
              <AppText style={styles.secondaryBtnText} weight="semibold">Back</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}
