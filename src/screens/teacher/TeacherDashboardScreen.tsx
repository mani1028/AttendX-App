import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboardScreen() {
  const { signOut } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.heading}>Teacher Dashboard</Text>
        <Text style={styles.text}>Marks entry, attendance marking, and class reports go here.</Text>
        <Text style={styles.link} onPress={() => void signOut()}>
          Sign out
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  heading: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
  },
  text: {
    color: colors.textMuted,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
  },
});