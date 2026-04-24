import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import Header from '../../components/common/Header';

export default function NotificationManagerScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>Notification Manager</AppText>
        <AppText style={styles.subtitle}>Manage system-wide notifications and announcements.</AppText>

        <View style={styles.placeholder}>
          <AppText style={styles.placeholderText}>Notification management features coming soon.</AppText>
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
