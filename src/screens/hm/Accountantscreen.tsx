// AccountantDashboardScreen.tsx
// React Native Conversion (Android + iOS)
// Exact same logic preserved

import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../constants/theme";
import AppText from "../../components/common/AppText";

import SummaryCards from "./SummaryCards";
import FeeManagement from "./FeeManagement";
import PaymentEntry from "./PaymentEntry";
import ExpenseManagement from "./ExpenseManagement";
import Reports from "./Reports";
import PendingStudents from "./PendingStudents";

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  primarySoft: colors.primary + '20',
};

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
        <ActivityIndicator size="large" color={C.primary} />
        <AppText style={styles.header}>
          Loading...
        </AppText>
      </View>
    );
  }

  if (!schoolCode) {
    return (
      <View style={styles.container}>
        <AppText style={styles.header}>
          Error: School code not found
        </AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <AppText style={styles.header}>
        💰 Accountant Dashboard
      </AppText>

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
      <AppText
        style={[
          styles.tabText,
          active &&
            styles.activeTabText,
        ]}
      >
        {title}
      </AppText>
    </TouchableOpacity>
  );
};

export default AccountantDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },

  header: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
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
    backgroundColor: C.card,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  activeTabButton: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: C.text,
  },

  activeTabText: {
    color: "#ffffff",
  },

  content: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 30,
  },
});