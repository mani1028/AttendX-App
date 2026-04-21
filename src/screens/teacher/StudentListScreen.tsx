import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItem,
} from "react-native";

/* ================= TYPES ================= */

type Student = {
  id: number;
  name: string;
  class: string;
  rollNo: string;
  attendance: number;
  parent: string;
};

/* ================= COMPONENT ================= */

const StudentListScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("all");

  const students: Student[] = [
    { id: 1, name: "Alice Johnson", class: "Class 10", rollNo: "101", attendance: 95, parent: "Mr. Johnson" },
    { id: 2, name: "Bob Smith", class: "Class 10", rollNo: "102", attendance: 88, parent: "Mrs. Smith" },
    { id: 3, name: "Charlie Brown", class: "Class 9", rollNo: "201", attendance: 92, parent: "Mr. Brown" },
    { id: 4, name: "Diana Prince", class: "Class 9", rollNo: "202", attendance: 97, parent: "Ms. Prince" },
    { id: 5, name: "Ethan Hunt", class: "Class 8", rollNo: "301", attendance: 85, parent: "Mr. Hunt" },
    { id: 6, name: "Fiona Apple", class: "Class 8", rollNo: "302", attendance: 91, parent: "Mrs. Apple" },
    { id: 7, name: "George Lucas", class: "Class 7", rollNo: "401", attendance: 89, parent: "Mr. Lucas" },
    { id: 8, name: "Hannah Montana", class: "Class 7", rollNo: "402", attendance: 94, parent: "Ms. Montana" },
  ];

  /* ================= FILTER ================= */

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.includes(searchTerm);

    const matchesClass =
      classFilter === "all" || student.class === classFilter;

    return matchesSearch && matchesClass;
  });

  /* ================= RENDER ITEM ================= */

  const renderItem: ListRenderItem<Student> = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>🎓</Text>
      </View>

      <Text style={styles.name}>{item.name}</Text>

      <Text style={styles.info}>Class: {item.class}</Text>
      <Text style={styles.info}>Roll No: {item.rollNo}</Text>
      <Text style={styles.info}>Parent: {item.parent}</Text>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.value}>{item.attendance}%</Text>
          <Text style={styles.label}>Attendance</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.value}>
            {Math.floor(Math.random() * 10 + 15)}
          </Text>
          <Text style={styles.label}>Present</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.value}>
            {Math.floor(Math.random() * 5)}
          </Text>
          <Text style={styles.label}>Absent</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student List</Text>

      <TextInput
        placeholder="Search students..."
        style={styles.search}
        value={searchTerm}
        onChangeText={(text: string) => setSearchTerm(text)}
      />

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
      />
    </View>
  );
};

export default StudentListScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },

  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: "48%",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  avatarText: {
    fontSize: 20,
    color: "white",
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },

  info: {
    fontSize: 12,
    color: "#555",
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 8,
  },

  statItem: {
    alignItems: "center",
  },

  value: {
    color: "#16a34a",
    fontWeight: "bold",
  },

  label: {
    fontSize: 10,
    color: "#777",
  },
});