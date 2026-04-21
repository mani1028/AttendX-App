// AccountantDashboardScreen.tsx
// React Native Conversion (Android + iOS)
// Exact same logic preserved

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import SummaryCards from "./SummaryCards";
import FeeManagement from "./FeeManagement";
import PaymentEntry from "./PaymentEntry";
import ExpenseManagement from "./ExpenseManagement";
import Reports from "./Reports";
import PendingStudents from "./PendingStudents";

const AccountantDashboardScreen = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("summary");
  const [schoolCode, setSchoolCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check authentication and role
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");

      const code =
        (await AsyncStorage.getItem("school_code")) ||
        (await AsyncStorage.getItem("schoolCode"));

      if (!token || role !== "accountant") {
        navigation.navigate("LoginScreen" as never);
        return;
      }

      if (code) {
        setSchoolCode(code);
      }

      setLoading(false);
    } catch (error) {
      console.log("Auth Error:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.header}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!schoolCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>
          Error: School code not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>
        💰 Accountant Dashboard
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContainer}
      >
        <TabButton
          title="Summary"
          active={activeTab === "summary"}
          onPress={() =>
            setActiveTab("summary")
          }
        />

        <TabButton
          title="Fee Management"
          active={activeTab === "fees"}
          onPress={() =>
            setActiveTab("fees")
          }
        />

        <TabButton
          title="Payments"
          active={activeTab === "payments"}
          onPress={() =>
            setActiveTab("payments")
          }
        />

        <TabButton
          title="Expenses"
          active={activeTab === "expenses"}
          onPress={() =>
            setActiveTab("expenses")
          }
        />

        <TabButton
          title="Reports"
          active={activeTab === "reports"}
          onPress={() =>
            setActiveTab("reports")
          }
        />

        <TabButton
          title="Pending"
          active={activeTab === "pending"}
          onPress={() =>
            setActiveTab("pending")
          }
        />
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "summary" && (
          <SummaryCards
            schoolCode={schoolCode}
          />
        )}

        {activeTab === "fees" && (
          <FeeManagement
            schoolCode={schoolCode}
          />
        )}

        {activeTab === "payments" && (
          <PaymentEntry
            schoolCode={schoolCode}
          />
        )}

        {activeTab === "expenses" && (
          <ExpenseManagement
            schoolCode={schoolCode}
          />
        )}

        {activeTab === "reports" && (
          <Reports
            schoolCode={schoolCode}
          />
        )}

        {activeTab === "pending" && (
          <PendingStudents
            schoolCode={schoolCode}
          />
        )}
      </View>
    </ScrollView>
  );
};

const TabButton = ({
  title,
  active,
  onPress,
}: any) => {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        active &&
          styles.activeTabButton,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabText,
          active &&
            styles.activeTabText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default AccountantDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f7",
    padding: 20,
  },

  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0d1b2a",
    marginBottom: 24,
  },

  tabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    paddingBottom: 10,
  },

  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  activeTabButton: {
    backgroundColor: "#2563eb",
  },

  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0d1b2a",
  },

  activeTabText: {
    color: "#ffffff",
  },

  content: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
});