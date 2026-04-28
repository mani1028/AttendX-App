// AnnouncementsScreen.tsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import {
  ChevronLeft,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import API from "../../services/api";
import { colors } from "../../constants/theme";
import AppText from "../../components/common/AppText";
import { useAuth } from "../../context/AuthContext";

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  primarySoft: colors.primary + '20',
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  info: colors.info || '#0ea5e9',
  infoSoft: (colors.info || '#0ea5e9') + '20',
};

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
  const typeMap: any = {
    event: { bg: C.primarySoft, color: C.primary },
    program: { bg: C.successSoft, color: C.success },
    festival: { bg: C.warningSoft, color: C.warning },
    holiday: { bg: '#f3e8ff20', color: '#a855f7' },
    announcement: { bg: C.infoSoft, color: C.info },
    urgent: { bg: C.errorSoft, color: C.error },
  };

  return typeMap[type?.toLowerCase()] || typeMap.event;
};

const AnnouncementsScreen = () => {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
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

    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Header */}
      <View style={styles.headerStandard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Announcements</AppText>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={() => fetchAnnouncements()}>
          <RefreshCw size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.contentPadding}>
          {/* Form Section */}

      <View style={styles.card}>
        <AppText style={styles.sectionTitle} weight="bold">
          Post New Announcement
        </AppText>

        <AppText style={styles.label} weight="semiBold">Announcement Title *</AppText>
        <TextInput
          style={styles.input}
          placeholder="Annual Sports Day 2025"
          placeholderTextColor={C.textMuted}
          value={formData.title}
          onChangeText={(text) =>
            handleInputChange("title", text)
          }
        />

        <AppText style={styles.label} weight="semiBold">Description *</AppText>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Enter announcement details..."
          placeholderTextColor={C.textMuted}
          value={formData.description}
          onChangeText={(text) =>
            handleInputChange("description", text)
          }
        />

        <AppText style={styles.label} weight="semiBold">Type</AppText>

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
                <AppText
                  style={[
                    styles.typeText,
                    formData.notification_type === type &&
                      styles.activeTypeText,
                  ]}
                  weight="semiBold"
                >
                  {type}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <AppText style={styles.label} weight="semiBold">
          Event Date (Optional)
        </AppText>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.textMuted}
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
            <AppText style={styles.submitText} weight="bold">
              Post Announcement
            </AppText>
          )}
        </TouchableOpacity>
      </View>

      {/* History Section */}

      <View style={styles.card}>
        <AppText style={styles.sectionTitle} weight="bold">
          Announcement History
        </AppText>

        {listLoading ? (
          <ActivityIndicator size="large" color={C.primary} />
        ) : announcements.length === 0 ? (
          <AppText style={styles.emptyText}>No announcements posted yet</AppText>
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
                <AppText
                  style={[
                    styles.badge,
                    {
                      backgroundColor: typeColor.bg,
                      color: typeColor.color,
                    },
                  ]}
                  weight="bold"
                >
                  {announcement.type.toUpperCase()}
                </AppText>

                <AppText style={styles.title} weight="bold">
                  {announcement.title}
                </AppText>

                <AppText style={styles.description}>
                  {announcement.description}
                </AppText>

                {announcement.event_date ? (
                  <AppText style={styles.meta}>
                    📅 Event Date:{" "}
                    {formatDate(announcement.event_date)}
                  </AppText>
                ) : null}

                <AppText style={styles.meta}>
                  🕐 Posted:{" "}
                  {formatDate(announcement.created_at)}{" "}
                  {formatTime(announcement.created_at)}
                </AppText>

                <View style={styles.actionRow}>
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
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Send size={14} color="#fff" style={{marginRight: 6}} />
                        <AppText style={styles.buttonText} weight="bold">
                          Resend
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() =>
                      handleDelete(announcement.id)
                    }
                  >
                    <Trash2 size={14} color="#fff" style={{marginRight: 6}} />
                    <AppText style={styles.buttonText} weight="bold">
                      Delete
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
    </ScrollView>
  </View>
  );
};

export default AnnouncementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },

  card: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },

  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: C.text,
  },

  label: {
    marginBottom: 8,
    marginTop: 10,
    color: C.text,
    fontSize: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: C.bg,
    color: C.text,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.bg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },

  activeType: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  typeText: {
    color: C.textMuted,
    fontSize: 13,
  },

  activeTypeText: {
    color: "#fff",
  },

  submitButton: {
    backgroundColor: C.primary,
    padding: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
  },

  announcementCard: {
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    marginBottom: 10,
  },

  title: {
    fontSize: 17,
    color: C.text,
  },

  description: {
    marginTop: 8,
    marginBottom: 12,
    color: C.textMuted,
    lineHeight: 20,
  },

  meta: {
    fontSize: 12,
    marginBottom: 4,
    color: C.textMuted,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  resendButton: {
    flex: 1,
    backgroundColor: C.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: C.error,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
  },

  buttonText: {
    color: "#fff",
    fontSize: 13,
  },

  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  }
});