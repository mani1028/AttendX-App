import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppCard from '../common/AppCard';
import AppText from '../common/AppText';
import AvatarBubble from '../common/AvatarBubble';
import { Theme } from '../../theme/tokens';
import { isOwnApiUrl } from './helpers';
import { profileStyles as styles } from './profileStyles';

interface ProfileHeaderProps {
  name: string;
  subtitle: string;
  profilePhotoUrl: string | null;
  profilePhotoError: boolean;
  userToken: string | null;
  onPhotoError: () => void;
  onOpenAccountSwitcher: () => void;
}

export default function ProfileHeader({
  name,
  subtitle,
  profilePhotoUrl,
  profilePhotoError,
  userToken,
  onPhotoError,
  onOpenAccountSwitcher,
}: ProfileHeaderProps) {
  return (
    <AppCard style={styles.profileCard}>
      <View style={styles.profileSummary}>
        {profilePhotoUrl && !profilePhotoError ? (
          <Image
            source={{
              uri: profilePhotoUrl,
              headers: (userToken && isOwnApiUrl(profilePhotoUrl))
                ? { Authorization: `Bearer ${userToken}` }
                : undefined,
            }}
            style={styles.profileAvatarImage}
            onError={onPhotoError}
          />
        ) : (
          <AvatarBubble
            displayName={name || 'User'}
            size={80}
            textSize={28}
            primaryColor={Theme.colors.blue}
          />
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.profileTextInfo}
          onPress={onOpenAccountSwitcher}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={styles.userName}>{name}</AppText>
            <ChevronDown size={20} color={Theme.colors.textSec} style={{ marginLeft: 6 }} />
          </View>
          <AppText style={styles.userRole}>{subtitle}</AppText>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}
