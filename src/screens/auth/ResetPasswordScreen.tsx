import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';

import { authService } from '../../api/authService';
import { Theme } from '../../theme/theme';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { schoolId, identifier, resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(schoolId, identifier, resetToken, password);
      Alert.alert('Success', 'Password reset successfully');
      navigation.replace('Login');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Reset failed';
      Alert.alert('Error', errorMsg);
      console.log('Reset Password Error:', error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <LockKeyhole size={28} color={Theme.colors.text} />
          </View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Choose a strong new password for your account</Text>

          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="XXXXXXXX"
            placeholderTextColor={Theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="XXXXXXXX"
            placeholderTextColor={Theme.colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={reset} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'RESET PASSWORD'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: Theme.colors.primary,
    marginBottom: 16,
  },
  title: {
    color: Theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 5,
    lineHeight: 20,
  },
  label: {
    color: Theme.colors.text,
    fontSize: 11,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Theme.colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    height: 48,
  },
  button: {
    backgroundColor: Theme.colors.primary,
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
});