import React, { useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AppText from "@/components/common/AppText";

const VisitorDashboardScreen: React.FC = () => {
  const [visitors, setVisitors] = useState([
    { id: 1, name: "Ravi", purpose: "Meeting", status: "pending" },
    { id: 2, name: "Sneha", purpose: "Pickup", status: "checked_in" },
  ]);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <AppText style={styles.name}>{item.name}</AppText>
      <AppText>{item.purpose}</AppText>
      <AppText>Status: {item.status}</AppText>

      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.approve}>
            <AppText>Approve</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reject}>
            <AppText>Reject</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Visitor Dashboard</AppText>

      <FlatList
        data={visitors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

export default VisitorDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  name: { fontWeight: "bold" },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  approve: {
    backgroundColor: "#bbf7d0",
    padding: 8,
    borderRadius: 6,
  },

  reject: {
    backgroundColor: "#fecaca",
    padding: 8,
    borderRadius: 6,
  },
});