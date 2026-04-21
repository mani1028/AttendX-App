import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Building2, User } from 'lucide-react-native';

import { authService } from '../../api/authService';
import { Theme } from '../../theme/theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [schoolId, setSchoolId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!schoolId || !identifier) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      await authService.requestOtp(schoolId.trim(), identifier.trim());
      navigation.navigate('VerifyOtp', { schoolId: schoolId.trim(), identifier: identifier.trim() });
    } catch {
      Alert.alert('Error', 'User not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Recover password by school code and registered email/ID
          </Text>

          <Text style={styles.label}>SCHOOL CODE</Text>
          <View style={styles.inputContainer}>
            <Building2 size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="XXXXXXXX"
              placeholderTextColor={Theme.colors.textMuted}
              value={schoolId}
              onChangeText={setSchoolId}
            />
          </View>

          <Text style={styles.label}>EMAIL / EMPLOYEE ID / STUDENT ID / ROLL NO.</Text>
          <View style={styles.inputContainer}>
            <User size={18} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="XXXXXXXX"
              placeholderTextColor={Theme.colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={next} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Sending OTP...' : 'SEND OTP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Back to Login</Text>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  input: {
    flex: 1,
    color: Theme.colors.text,
    height: 48,
    marginLeft: 10,
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
  link: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});