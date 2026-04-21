import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import AppText from "@/components/common/AppText";

const VisitSuccessScreen: React.FC<any> = ({ route, navigation }) => {
  const visitorNo = route.params?.visitor_no || "N/A";

  return (
    <View style={styles.container}>
      <AppText style={styles.icon}>✅</AppText>

      <AppText style={styles.title}>Registration Submitted!</AppText>

      <AppText style={styles.text}>
        Please wait for approval at the office.
      </AppText>

      <View style={styles.box}>
        <AppText>Visitor No</AppText>
        <AppText style={styles.number}>{visitorNo}</AppText>
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Home")}
      >
        <AppText style={{ color: "#fff" }}>Go Home</AppText>
      </TouchableOpacity>
    </View>
  );
};

export default VisitSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  icon: { fontSize: 60 },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 10,
  },

  text: { color: "#555", marginBottom: 20 },

  box: {
    backgroundColor: "#d1fae5",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },

  number: { fontSize: 20, fontWeight: "bold" },

  btn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
  },
});