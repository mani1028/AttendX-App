import React, { useState } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import AppText from "@/components/common/AppText";
import API from "@/services/api";

const HMRegistrationScreen = () => {
  const [form, setForm] = useState({
    branch_name: "",
    hm_name: "",
    hm_email: "",
    password: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      const res = await API.post("/principal/register-hm", form);
      Alert.alert("Success", "HM Registered");
    } catch {
      Alert.alert("Error", "Failed");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <AppText style={styles.title}>HM Registration</AppText>

      <TextInput placeholder="Branch Name" style={styles.input} onChangeText={(v) => handleChange("branch_name", v)} />
      <TextInput placeholder="Name" style={styles.input} onChangeText={(v) => handleChange("hm_name", v)} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={(v) => handleChange("hm_email", v)} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={(v) => handleChange("password", v)} />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <AppText style={{ color: "#fff" }}>Register</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default HMRegistrationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: "bold" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 },
  btn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
});