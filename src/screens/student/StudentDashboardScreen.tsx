import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import RoleCard from '../../components/RoleCard';
import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { StudentStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StudentStackParamList, 'StudentDashboard'>;

export default function StudentDashboardScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Student Dashboard</Text>
        <Text style={styles.subtitle}>Hello, {session?.name ?? 'Student'}</Text>
      </View>

      <RoleCard
        title="Attendance"
        subtitle="View daily and monthly attendance summaries"
        onPress={() => navigation.navigate('StudentAttendance')}
      />
      <RoleCard
        title="Marks"
        subtitle="Track subject-wise marks and performance"
        onPress={() => navigation.navigate('StudentMarks')}
      />
      <RoleCard
        title="Fee"
        subtitle="Review paid/pending fee and due dates"
        onPress={() => navigation.navigate('StudentFee')}
      />
      <RoleCard title="Logout" subtitle="Sign out and switch role" onPress={() => void signOut()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    color: colors.textMuted,
  },
});