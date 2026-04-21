import React, { useState } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import AppText from '../../components/common/AppText';
import API from '../../services/api';

const TeacherRegistrationScreen = () => {
  const [form, setForm] = useState({
    teacher_full_name: "",
    email_id: "",
    mobile_number: "",
    password: "",
  });

  const handleSubmit = async () => {
    try {
      await API.post("/teacher/register", form);
      Alert.alert("Success", "Teacher Registered");
    } catch {
      Alert.alert("Error", "Failed");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <AppText style={styles.title}>Teacher Registration</AppText>

      <TextInput placeholder="Name" style={styles.input} onChangeText={(v) => setForm({ ...form, teacher_full_name: v })} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={(v) => setForm({ ...form, email_id: v })} />
      <TextInput placeholder="Mobile" style={styles.input} onChangeText={(v) => setForm({ ...form, mobile_number: v })} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={(v) => setForm({ ...form, password: v })} />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <AppText style={{ color: "#fff" }}>Register</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default TeacherRegistrationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: "bold" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 },
  btn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
});