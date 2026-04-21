import React, { useState } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import AppText from '../../components/common/AppText';
import API from '../../services/api';

const StudentRegistrationScreen = () => {
  const [form, setForm] = useState({
    student_full_name: "",
    class_grade: "",
    section: "",
    mobile: "",
  });

  const handleSubmit = async () => {
    try {
      await API.post("/student/register", form);
      Alert.alert("Success", "Student Registered");
    } catch {
      Alert.alert("Error", "Failed");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <AppText style={styles.title}>Student Registration</AppText>

      <TextInput placeholder="Full Name" style={styles.input} onChangeText={(v) => setForm({ ...form, student_full_name: v })} />
      <TextInput placeholder="Class" style={styles.input} onChangeText={(v) => setForm({ ...form, class_grade: v })} />
      <TextInput placeholder="Section" style={styles.input} onChangeText={(v) => setForm({ ...form, section: v })} />
      <TextInput placeholder="Mobile" style={styles.input} onChangeText={(v) => setForm({ ...form, mobile: v })} />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <AppText style={{ color: "#fff" }}>Register</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default StudentRegistrationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: "bold" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 },
  btn: { backgroundColor: "#16a34a", padding: 12, borderRadius: 8, alignItems: "center" },
});