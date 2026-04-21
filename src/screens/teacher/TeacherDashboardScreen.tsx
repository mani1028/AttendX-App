import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '../../components/common/AppText';

type Props = {
  navigation: any;
};

export default function TeacherDashboardScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Teacher Dashboard</AppText>
      <AppText style={styles.subtitle}>Choose an action to continue.</AppText>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Attendance')}>
        <AppText style={styles.cardTitle}>Take Attendance</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StudentList')}>
        <AppText style={styles.cardTitle}>View Students</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TeacherRegistration')}>
        <AppText style={styles.cardTitle}>Teacher Registration</AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f172a',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
});
