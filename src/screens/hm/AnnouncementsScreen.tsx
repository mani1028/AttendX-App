// AnnouncementsScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

type Announcement = {
  id: number;
  title: string;
  description: string;
  type: string;
  event_date?: string;
  created_at?: string;
};

const announcementTypes = [
  "event",
  "program",
  "festival",
  "holiday",
  "announcement",
  "urgent",
];

const getTypeColor = (type: string) => {
  const colors: any = {
    event: { bg: "#dbeafe", color: "#1e40af" },
    program: { bg: "#dcfce7", color: "#15803d" },
    festival: { bg: "#fef3c7", color: "#92400e" },
    holiday: { bg: "#f3e8ff", color: "#6b21a8" },
    announcement: { bg: "#fecdd3", color: "#9f1239" },
    urgent: { bg: "#fecaca", color: "#991b1b" },
  };

  return colors[type?.toLowerCase()] || colors.event;
};

const AnnouncementsScreen = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    notification_type: "event",
    event_date: "",
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [schoolCode, setSchoolCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const code =
        (await AsyncStorage.getItem("school_code")) ||
        (await AsyncStorage.getItem("schoolCode")) ||
        "";

      const branch =
        (await AsyncStorage.getItem("branch_id")) ||
        (await AsyncStorage.getItem("branchId")) ||
        (await AsyncStorage.getItem("branch")) ||
        (await AsyncStorage.getItem("BranchID")) ||
        "01";

      setSchoolCode(code);
      setBranchId(branch);

      fetchAnnouncements(code, branch);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAnnouncements = async (
    code = schoolCode,
    branch = branchId
  ) => {
    setListLoading(true);

    try {
      const response = await API.get("/notifications/hm/list", {
        headers: {
          "X-School-Code": code,
          "X-Branch-Id": branch,
        },
      });

      setAnnouncements(response.data.items || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load announcements");
    } finally {
      setListLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert("Validation", "Please fill required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post(
        "/notifications/hm/create",
        formData,
        {
          headers: {
            "X-School-Code": schoolCode,
            "X-Branch-Id": branchId,
          },
        }
      );

      if (response.data.ok) {
        Alert.alert(
          "Success",
          "Announcement posted to students and teachers!"
        );

        setFormData({
          title: "",
          description: "",
          notification_type: "event",
          event_date: "",
        });

        fetchAnnouncements();
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          "Failed to post announcement"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (announcement: Announcement) => {
    setResendingId(announcement.id);

    try {
      const response = await API.post(
        "/notifications/hm/create",
        {
          title: announcement.title,
          description: announcement.description,
          notification_type: announcement.type,
          event_date: announcement.event_date || "",
        },
        {
          headers: {
            "X-School-Code": schoolCode,
            "X-Branch-Id": branchId,
          },
        }
      );

      if (response.data.ok) {
        Alert.alert(
          "Success",
          `Announcement "${announcement.title}" resent successfully`
        );

        fetchAnnouncements();
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          "Failed to resend announcement"
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = (announcementId: number) => {
    Alert.alert(
      "Delete",
      "Are you sure you want to delete this announcement?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(
                `/notifications/hm/delete/${announcementId}`,
                {
                  headers: {
                    "X-School-Code": schoolCode,
                    "X-Branch-Id": branchId,
                  },
                }
              );

              Alert.alert(
                "Success",
                "Announcement deleted successfully"
              );

              setAnnouncements((prev) =>
                prev.filter((a) => a.id !== announcementId)
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.detail ||
                  "Failed to delete announcement"
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        📢 School Announcements Manager
      </Text>

      {/* Form Section */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Post New Announcement
        </Text>

        <Text style={styles.label}>Announcement Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Annual Sports Day 2025"
          value={formData.title}
          onChangeText={(text) =>
            handleInputChange("title", text)
          }
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Enter announcement details..."
          value={formData.description}
          onChangeText={(text) =>
            handleInputChange("description", text)
          }
        />

        <Text style={styles.label}>Type</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.typeRow}>
            {announcementTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  formData.notification_type === type &&
                    styles.activeType,
                ]}
                onPress={() =>
                  handleInputChange("notification_type", type)
                }
              >
                <Text
                  style={[
                    styles.typeText,
                    formData.notification_type === type &&
                      styles.activeTypeText,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>
          Event Date (Optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={formData.event_date}
          onChangeText={(text) =>
            handleInputChange("event_date", text)
          }
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              Post Announcement
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* History Section */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Announcement History
        </Text>

        {listLoading ? (
          <ActivityIndicator size="large" />
        ) : announcements.length === 0 ? (
          <Text>No announcements posted yet</Text>
        ) : (
          announcements.map((announcement) => {
            const typeColor = getTypeColor(
              announcement.type
            );

            return (
              <View
                key={announcement.id}
                style={styles.announcementCard}
              >
                <Text
                  style={[
                    styles.badge,
                    {
                      backgroundColor: typeColor.bg,
                      color: typeColor.color,
                    },
                  ]}
                >
                  {announcement.type}
                </Text>

                <Text style={styles.title}>
                  {announcement.title}
                </Text>

                <Text style={styles.description}>
                  {announcement.description}
                </Text>

                {announcement.event_date ? (
                  <Text style={styles.meta}>
                    📅 Event Date:{" "}
                    {formatDate(announcement.event_date)}
                  </Text>
                ) : null}

                <Text style={styles.meta}>
                  🕐 Posted:{" "}
                  {formatDate(announcement.created_at)}{" "}
                  {formatTime(announcement.created_at)}
                </Text>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() =>
                    handleResend(announcement)
                  }
                  disabled={
                    resendingId === announcement.id
                  }
                >
                  {resendingId === announcement.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Resend to All
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    handleDelete(announcement.id)
                  }
                >
                  <Text style={styles.buttonText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default AnnouncementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f7",
    padding: 16,
  },

  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#0d1b2a",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  label: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },

  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  typeRow: {
    flexDirection: "row",
    gap: 10,
  },

  typeButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginRight: 8,
  },

  activeType: {
    backgroundColor: "#2563eb",
  },

  typeText: {
    color: "#000",
  },

  activeTypeText: {
    color: "#fff",
  },

  submitButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "700",
  },

  announcementCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: "700",
    marginBottom: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  description: {
    marginTop: 10,
    marginBottom: 10,
    color: "#444",
  },

  meta: {
    fontSize: 13,
    marginBottom: 6,
    color: "#666",
  },

  resendButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },

  deleteButton: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});