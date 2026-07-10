import React from 'react';
import { View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { publicRegistrationStyles as styles } from './publicRegistrationStyles';

export default function InvalidInviteView() {
  const navigation = useNavigation();

  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={48} color={Theme.colors.error} />
      <AppText weight="bold" style={styles.errorTitle}>Invalid Invite Link</AppText>
      <AppText style={styles.errorText}>
        The link you used is invalid. Please ensure you have correct school code and branch ID.
      </AppText>
      <AppButton
        title="Go Back"
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('RegisterSchool');
          }
        }}
      />
    </View>
  );
}
