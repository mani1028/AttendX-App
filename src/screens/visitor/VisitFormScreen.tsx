import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';

const VisitFormScreen: React.FC<any> = ({ route, navigation }) => {
  const { token } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    student_name: "",
    purpose: "",
  });

  useEffect(() => {
    // simulate API validation
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.full_name || !form.phone) {
      Alert.alert("Error", "Fill required fields");
      return;
    }

    navigation.navigate("VisitSuccess", {
      visitor_no: "VIS12345",
    });
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={styles.container}>
      <AppText style={styles.title}>Visitor Registration</AppText>

      <TextInput
        placeholder="Full Name"
        style={styles.input}
        onChangeText={(v) => handleChange("full_name", v)}
      />

      <TextInput
        placeholder="Phone"
        style={styles.input}
        keyboardType="numeric"
        onChangeText={(v) => handleChange("phone", v)}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={(v) => handleChange("email", v)}
      />

      <TextInput
        placeholder="Student Name"
        style={styles.input}
        onChangeText={(v) => handleChange("student_name", v)}
      />

      <TextInput
        placeholder="Purpose"
        style={styles.input}
        onChangeText={(v) => handleChange("purpose", v)}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <AppText style={{ color: "#fff" }}>Submit</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default VisitFormScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: "bold" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },

  btn: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});