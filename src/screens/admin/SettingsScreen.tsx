import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>Admin Settings</AppText>
        <AppText style={styles.subtitle}>Configure global application settings and preferences.</AppText>

        <View style={styles.placeholder}>
          <AppText style={styles.placeholderText}>Admin settings will be available in the next update.</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 24,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
