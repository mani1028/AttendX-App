import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { authService } from '../../api/authService';
import { Theme } from '../../theme/theme';

export default function VerifyOtpScreen({ route, navigation }: any) {
  const { schoolId, identifier } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!otp) {
      Alert.alert('Required', 'Please enter OTP');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.verifyOtp(schoolId, identifier, otp);

      const resetToken =
        res?.data?.reset_token ||
        res?.data?.resetToken ||
        res?.data?.data?.reset_token ||
        res?.data?.data?.resetToken ||
        '';

      if (!resetToken) {
        Alert.alert('Error', 'Unable to verify OTP. Please try again.');
        return;
      }

      navigation.navigate('ResetPassword', {
        schoolId,
        identifier,
        resetToken,
      });
    } catch {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <ShieldCheck size={28} color={Theme.colors.text} />
          </View>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Enter the OTP sent to your registered contact</Text>

          <Text style={styles.label}>OTP</Text>
          <TextInput
            style={styles.input}
            placeholder="XXXXXX"
            placeholderTextColor={Theme.colors.textMuted}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
          />

          <TouchableOpacity style={styles.button} onPress={verify} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'VERIFY OTP'}</Text>
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
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 18,
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