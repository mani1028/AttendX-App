import React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import { profileStyles as styles } from './profileStyles';

interface ProfilePasswordRequirementProps {
  met: boolean;
  text: string;
}

export default function ProfilePasswordRequirement({ met, text }: ProfilePasswordRequirementProps) {
  return (
    <View style={styles.passwordReq}>
      {met ? (
        <Check size={14} color={Theme.colors.success} />
      ) : (
        <View style={styles.passwordReqDot} />
      )}
      <AppText style={[styles.passwordReqText, met && styles.passwordReqTextMet]}>
        {text}
      </AppText>
    </View>
  );
}
