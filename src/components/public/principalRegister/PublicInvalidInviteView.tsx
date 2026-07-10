import React from 'react';
import { View, Text } from 'react-native';
import AppButton from '../../common/AppButton';
import { publicPrincipalRegistrationStyles as styles } from './publicPrincipalRegistrationStyles';

interface PublicInvalidInviteViewProps {
  onGoBack: () => void;
}

export default function PublicInvalidInviteView({ onGoBack }: PublicInvalidInviteViewProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Invalid Invite Link</Text>
      <Text style={styles.errorDescription}>School code or branch ID missing.</Text>
      <AppButton title="Go Back" onPress={onGoBack} />
    </View>
  );
}
