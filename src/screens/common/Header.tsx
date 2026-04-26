import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppText from '../../components/common/AppText';

/* ================= TYPES ================= */

type Teacher = {
  name: string;
  employee_id: string;
};

/* ================= COMPONENT ================= */

const Header: React.FC = () => {
  const [teacher, setTeacher] = useState<Teacher>({
    name: "",
    employee_id: "",
  });

  useEffect(() => {
    const loadData = async () => {
      const name =
        (await AsyncStorage.getItem("teacher_name")) ||
        (await AsyncStorage.getItem("teacherName")) ||
        "Teacher";

      const id =
        (await AsyncStorage.getItem("employee_id")) ||
        (await AsyncStorage.getItem("employeeId")) ||
        "—";

      setTeacher({ name, employee_id: id });
    };

    loadData();
  }, []);

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Teacher Dashboard</AppText>

      <View style={styles.profile}>
        <AppText style={styles.icon}>👤</AppText>

        <View>
          <AppText style={styles.name}>{teacher.name}</AppText>
          <AppText style={styles.id}>ID: {teacher.employee_id}</AppText>
          <AppText style={styles.role}>Teacher</AppText>
        </View>
      </View>
    </View>
  );
};

export default Header;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 16,
  },

  title: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "600",
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 10,
  },

  icon: {
    fontSize: 22,
    marginRight: 10,
  },

  name: {
    color: "#f1f5f9",
    fontWeight: "600",
  },

  id: {
    color: "#cbd5e1",
    fontSize: 12,
  },

  role: {
    marginTop: 2,
    backgroundColor: "#22c55e",
    color: "#fff",
    fontSize: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
});