import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { authService } from '../../api/authService';
import { useAuth } from '../../context/AuthContext';

type Props = {
  navigation: any;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!schoolId || !username || !password) {
      Alert.alert('Required', 'Please enter school code, username and password');
      return;
    }

    setLoading(true);

    try {
      const schoolCode = schoolId.trim();
      const normalized = await authService.login(schoolCode, username.trim(), password);
      const name = normalized.user?.name || username.trim();

      const toStore: [string, string][] = [
        ['token', normalized.token || ''],
        ['role', normalized.role],
        ['userRole', normalized.role],
        ['school_code', normalized.schoolCode || schoolCode],
        ['schoolCode', normalized.schoolCode || schoolCode],
        ['user_name', name],
      ];

      if (normalized.user?.branchId) {
        toStore.push(['branch_id', normalized.user.branchId]);
        toStore.push(['branchId', normalized.user.branchId]);
      }

      if (normalized.user?.studentId) {
        toStore.push(['student_id', normalized.user.studentId]);
        toStore.push(['studentId', normalized.user.studentId]);
      }

      if (normalized.user?.employeeId) {
        toStore.push(['employee_id', normalized.user.employeeId]);
        toStore.push(['employeeId', normalized.user.employeeId]);
      }

      if (normalized.user?.userId) {
        toStore.push(['user_id', normalized.user.userId]);
        toStore.push(['userId', normalized.user.userId]);
      }

      await AsyncStorage.multiSet(toStore);
      await signIn(normalized.role, name, normalized.token);
      navigation.replace('MainTabs');

    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AttendX Login</Text>

        <TextInput
          placeholder="School ID"
          style={styles.input}
          value={schoolId}
          onChangeText={setSchoolId}
        />

        <TextInput
          placeholder="Username"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0f172a",
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 12,
  },

  title: {
    fontSize: 22,
    marginBottom: 20,
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  link: {
    color: "#60a5fa",
    marginTop: 15,
    textAlign: "center",
  },
});