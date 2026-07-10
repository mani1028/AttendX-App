import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

import AppButton from '../common/AppButton';
import AppCard from '../common/AppCard';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';



const getSchoolCode = async () => {
  return (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};
const getBranchId = async () => {
  return (await storage.getString(StorageKeys.BRANCH_ID)) || '';
};

export default function NotificationManager({ onNotificationCreated }: { onNotificationCreated?: (notification: any) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notificationType, setNotificationType] = useState('event');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill title and description');
      return;
    }
    setLoading(true);
    try {
      const schoolCode = await getSchoolCode();
      const branchId = await getBranchId();
      const res = await API.post('/notifications/director/create', {
        title,
        description,
        notification_type: notificationType,
        event_date: eventDate || null,
      }, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        },
      });
      if (res.data?.ok) {
        Alert.alert('Success', 'Notification posted to students and teachers!');
        setTitle('');
        setDescription('');
        setNotificationType('event');
        setEventDate('');
        if (onNotificationCreated) {onNotificationCreated(res.data.notification);}
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = ['event', 'program', 'festival', 'holiday', 'announcement', 'urgent'];

  return (
    <AppCard style={styles.container}>
      <Text style={styles.title}>📢 Post School Announcement</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Announcement Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Annual Sports Day 2025"
          value={title}
          onChangeText={setTitle}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          placeholder="Enter details..."
          value={description}
          onChangeText={setDescription}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Type of Announcement</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {typeOptions.map(opt => (
                <TouchableOpacity accessibilityRole="button"
                  key={opt}
                  style={[styles.chip, notificationType === opt && styles.chipActive]}
                  onPress={() => setNotificationType(opt)}
                >
                  <Text style={[styles.chipText, notificationType === opt && styles.chipTextActive]}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Event Date (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={eventDate}
            onChangeText={setEventDate}
          />
        </View>
      </View>
      <AppButton
        title={loading ? 'Posting...' : 'Post to Students & Teachers'}
        onPress={handleSubmit}
        disabled={loading}
        style={styles.button}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: Theme.spacing.md, marginBottom: Theme.spacing.md },
  title: { fontSize: Theme.typography.h4.fontSize, fontWeight: '700', color: Theme.colors.text, marginBottom: Theme.spacing.md },
  field: { marginBottom: Theme.spacing.md },
  label: { fontSize: Theme.typography.caption.fontSize, fontWeight: '600', color: Theme.colors.cardAlt, marginBottom: Theme.spacing.xs },
  input: { borderWidth: 1, borderColor: Theme.colors.textSec, borderRadius: Theme.radius.sm, padding: 10, fontSize: Theme.typography.caption.fontSize, backgroundColor: Theme.colors.background },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Theme.spacing.md, marginBottom: Theme.spacing.md },
  halfField: { flex: 1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginTop: Theme.spacing.xs },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Theme.radius.xl, backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: '#0c4a6e', borderColor: '#0c4a6e' },
  chipText: { ...Theme.typography.caption, color: Theme.colors.cardAlt },
  chipTextActive: { color: Theme.colors.card },
  button: { marginTop: Theme.spacing.sm },
});
