import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppButton from '../../common/AppButton';
import { teacherRegistrationStyles as styles } from './teacherRegistrationStyles';

export default function InvalidInviteView() {
  const navigation = useNavigation();

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Invalid Registration Link</Text>
      <Text style={styles.errorText}>
        Please use the link shared by your school.
      </Text>
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
