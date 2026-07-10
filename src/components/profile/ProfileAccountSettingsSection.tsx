import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Sliders, Key, ChevronRight, Users } from 'lucide-react-native';
import AppCard from '../common/AppCard';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import { profileStyles as styles } from './profileStyles';

interface ProfileAccountSettingsSectionProps {
  systemSettingsRoute: string | null;
  onOpenSettings: () => void;
  onOpenPasswordChange: () => void;
  onOpenAccountSwitcher: () => void;
  onNavigateSettings: (route: string) => void;
}

export default function ProfileAccountSettingsSection({
  systemSettingsRoute,
  onOpenSettings,
  onOpenPasswordChange,
  onOpenAccountSwitcher,
  onNavigateSettings,
}: ProfileAccountSettingsSectionProps) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>Account Settings</AppText>
      <AppCard style={styles.infoCard}>
        {systemSettingsRoute ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.menuItem}
              onPress={() => onNavigateSettings(systemSettingsRoute)}
            >
              <View style={styles.menuIconContainer}>
                <Sliders size={18} color={Theme.colors.text} />
              </View>
              <AppText style={styles.menuText}>Settings</AppText>
              <ChevronRight size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.menuItem}
              onPress={onOpenSettings}
            >
              <View style={styles.menuIconContainer}>
                <Sliders size={18} color={Theme.colors.text} />
              </View>
              <AppText style={styles.menuText}>App Settings</AppText>
              <ChevronRight size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.menuItem}
          onPress={onOpenAccountSwitcher}
        >
          <View style={styles.menuIconContainer}>
            <Users size={18} color={Theme.colors.text} />
          </View>
          <AppText style={styles.menuText}>Switch Account</AppText>
          <ChevronRight size={20} color={Theme.colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.menuItem}
          onPress={onOpenPasswordChange}
        >
          <View style={styles.menuIconContainer}>
            <Key size={18} color={Theme.colors.text} />
          </View>
          <AppText style={styles.menuText}>Change Password</AppText>
          <ChevronRight size={20} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </AppCard>
    </View>
  );
}
