import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AppText from "@/components/common/AppText";
import API from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  navigation: any;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [schoolId, setSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOGIN ================= */

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Enter username & password");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        school_id: schoolId.trim(),
        username: username.trim(),
        password,
      };

      const res = await API.post("/auth/login", payload);

      if (res.data?.status !== "success") {
        Alert.alert("Login Failed", "Invalid credentials");
        return;
      }

      const { role, token, user, school_code } = res.data;

      /* ================= STORE DATA ================= */

      await AsyncStorage.multiSet([
        ["token", token || ""],
        ["role", role || ""],
        ["userRole", role || ""],
        ["school_code", school_code || ""],
        ["user_name", user?.name || ""],
        ["user_id", String(user?.id || "")],
      ]);

      /* ================= ROLE BASED NAV ================= */

      if (role === "admin") {
        navigation.replace("AdminStack");
      } else if (role === "teacher") {
        navigation.replace("TeacherStack");
      } else if (role === "student") {
        navigation.replace("StudentStack");
      } else if (role === "hm") {
        navigation.replace("HMStack");
      } else if (role === "principal") {
        navigation.replace("PrincipalStack");
      } else {
        Alert.alert("Error", "Unknown role");
      }

    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <AppText style={styles.title}>AttendX Login</AppText>

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
          <AppText style={styles.btnText}>
            {loading ? "Logging in..." : "Login"}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <AppText style={styles.link}>Forgot Password?</AppText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

/* ================= STYLES ================= */

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