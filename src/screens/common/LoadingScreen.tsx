import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import AppText from '../../components/common/AppText';

/* ================= TYPES ================= */

type Props = {
  text?: string;
};

/* ================= COMPONENT ================= */

const Loader: React.FC<Props> = ({ text = "Loading..." }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <AppText style={styles.text}>{text}</AppText>
    </View>
  );
};

export default Loader;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  text: {
    marginTop: 10,
    color: "#888",
    fontSize: 14,
  },
});