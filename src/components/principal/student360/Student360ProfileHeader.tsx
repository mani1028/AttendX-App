import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import AvatarBubble from '../../common/AvatarBubble';
import AppText from '../../common/AppText';
import { pickText } from './helpers';
import { student360Styles as styles } from './student360Styles';

export interface Student360ProfileHeaderProps {
  displayName: string;
  displayClass: string;
  rollNo: string;
  profile: Record<string, any> | null;
  onClearSelection: () => void;
}

export default function Student360ProfileHeader({
  displayName,
  displayClass,
  rollNo,
  profile,
  onClearSelection,
}: Student360ProfileHeaderProps) {
  return (
    <View style={styles.profileCard}>
      <AvatarBubble displayName={displayName} size={64} textSize={24} primaryColor={Theme.colors.primary} />
      <View style={styles.profileInfo}>
        <AppText style={styles.profileName} weight="bold">{displayName}</AppText>
        <AppText style={styles.profileMeta}>{displayClass} • Roll {rollNo}</AppText>
        <AppText style={styles.profileMeta}>Admission: {pickText(profile?.admission_number)}</AppText>
      </View>
      <TouchableOpacity accessibilityRole="button" style={styles.changeBtn} onPress={onClearSelection}>
        <Search size={16} color={Theme.colors.primary} />
        <AppText style={styles.changeBtnText} weight="semibold">Search</AppText>
      </TouchableOpacity>
    </View>
  );
}
