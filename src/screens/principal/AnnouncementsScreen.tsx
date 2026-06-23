import { useScrollTabBar } from '../../hooks/useScrollTabBar';
// AnnouncementsScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';

import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';




type Announcement = {
  id: number;
  title: string;
  description: string;
  type?: string;
  event_date?: string;
  created_at?: string;
};

const announcementTypes = [
  'event',
  'program',
  'festival',
  'holiday',
  'announcement',
  'urgent',
];

const DEFAULT_ANNOUNCEMENT_TYPE = 'announcement';

const getAnnouncementType = (type?: string) => {
  const normalizedType = type?.toLowerCase();
  return announcementTypes.includes(normalizedType || '')
    ? normalizedType!
    : DEFAULT_ANNOUNCEMENT_TYPE;
};

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notification_type: 'event',
    event_date: '',
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [resendingId, setResendingId] = useState<number | null>(null);

  useEffect(() => {
    loadStorageData();

    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  const loadStorageData = async () => {
    try {
      const code =
        (await AsyncStorage.getItem('school_code')) ||
        (await AsyncStorage.getItem('schoolCode')) ||
        '';

      const branch =
        (await AsyncStorage.getItem('branch_id')) ||
        (await AsyncStorage.getItem('branchId')) ||
        (await AsyncStorage.getItem('branch')) ||
        (await AsyncStorage.getItem('BranchID')) ||
        '01';

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
      const response = await API.get('/notifications/principal/list', {
        headers: {
          'X-School-Code': code,
          'X-Branch-Id': branch,
        },
      });

      const normalizedAnnouncements = (response.data.items || []).map((item: Announcement) => ({
        ...item,
        type: getAnnouncementType(item?.type),
      }));

      setAnnouncements(normalizedAnnouncements);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || 'Failed to load announcements'));
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
      Alert.alert('Validation', 'Please fill required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await API.post(
        '/notifications/principal/create',
        formData,
        {
          headers: {
            'X-School-Code': schoolCode,
            'X-Branch-Id': branchId,
          },
        }
      );

      if (response.data.ok) {
        Alert.alert(
          'Success',
          'Announcement posted to students and teachers!'
        );

        setFormData({
          title: '',
          description: '',
          notification_type: 'event',
          event_date: '',
        });

        fetchAnnouncements();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        formatErrorMessage(error?.response?.data?.detail || 'Failed to post announcement')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (announcement: Announcement) => {
    setResendingId(announcement.id);

    try {
      const response = await API.post(
        '/notifications/principal/create',
        {
          title: announcement.title,
          description: announcement.description,
          notification_type: getAnnouncementType(announcement.type),
          event_date: announcement.event_date || '',
        },
        {
          headers: {
            'X-School-Code': schoolCode,
            'X-Branch-Id': branchId,
          },
        }
      );

      if (response.data.ok) {
        Alert.alert(
          'Success',
          `Announcement "${announcement.title}" resent successfully`
        );

        fetchAnnouncements();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        formatErrorMessage(error?.response?.data?.detail || 'Failed to resend announcement')
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = (announcementId: number) => {
    Alert.alert(
      'Delete',
      'Are you sure you want to delete this announcement?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(
                `/notifications/principal/delete/${announcementId}`,
                {
                  headers: {
                    'X-School-Code': schoolCode,
                    'X-Branch-Id': branchId,
                  },
                }
              );

              Alert.alert(
                'Success',
                'Announcement deleted successfully'
              );

              setAnnouncements((prev) =>
                prev.filter((a) => a.id !== announcementId)
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                formatErrorMessage(error?.response?.data?.detail || 'Failed to delete announcement')
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {return '';}
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) {return '';}
    return '';
  };

  return (
    <View style={styles.container}>


      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Standardized Header */}
        <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Announcements</AppText>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.iconButton} onPress={() => fetchAnnouncements()}>
            <RefreshCw size={20} color={HEADER_CONSTANTS.TEXT_COLOR} />
          </TouchableOpacity>
        </View>

          <View style={styles.headerContent}>
            <AppText weight="bold" style={styles.headerGreeting}>School Bulletins</AppText>
            &nbsp;
          </View>
        </View>

        <View style={styles.contentOverlap}>
          <View style={styles.contentPadding}>
            {/* Form Section */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle} weight="bold">
                Post New Announcement
              </AppText>

              <AppText style={styles.label} weight="semibold">Announcement Title *</AppText>
              <TextInput
                style={styles.input}
                placeholder="Annual Sports Day 2025"
                placeholderTextColor={C.textMuted}
                value={formData.title}
                onChangeText={(text) =>
                  handleInputChange('title', text)
                }
              />

              <AppText style={styles.label} weight="semibold">Description *</AppText>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                placeholder="Enter announcement details..."
                placeholderTextColor={C.textMuted}
                value={formData.description}
                onChangeText={(text) =>
                  handleInputChange('description', text)
                }
              />

              <AppText style={styles.label} weight="semibold">Type</AppText>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={styles.typeRow}>
                  {announcementTypes.map((type) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.notification_type === type &&
                        styles.activeType,
                      ]}
                      onPress={() =>
                        handleInputChange('notification_type', type)
                      }
                    >
                      <AppText
                        style={[
                          styles.typeText,
                          formData.notification_type === type &&
                          styles.activeTypeText,
                        ]}
                        weight="semibold"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <AppText style={styles.label} weight="semibold">
                Event Date (Optional)
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                value={formData.event_date}
                onChangeText={(text) =>
                  handleInputChange('event_date', text)
                }
              />

              <TouchableOpacity accessibilityRole="button"
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Theme.colors.card} />
                ) : (
                  <AppText style={styles.submitText} weight="bold">
                    Post Announcement
                  </AppText>
                )}
              </TouchableOpacity>
            </View>

            {/* History Section */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle} weight="bold">
                  Announcement History
                </AppText>
              </View>

              {listLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={C.primary} />
                </View>
              ) : announcements.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No announcements posted yet</AppText>
                </View>
              ) : (
                announcements.map((announcement) => {
                  const safeType = getAnnouncementType(announcement.type);
                  const typeColor = getTypeColor(safeType);

                  return (
                    <View
                      key={announcement.id}
                      style={styles.announcementCard}
                    >
                      <View style={styles.cardTopRow}>
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
                          {safeType.toUpperCase()}
                        </AppText>
                        <AppText style={styles.postedDate} weight="medium">
                          {formatDate(announcement.created_at)}
                        </AppText>
                      </View>

                      <AppText style={styles.title} weight="bold">
                        {announcement.title}
                      </AppText>

                      <AppText style={styles.description}>
                        {announcement.description}
                      </AppText>

                      {announcement.event_date ? (
                        <View style={styles.metaRow}>
                          <Send size={12} color={C.textMuted} />
                          <AppText style={styles.meta}>
                            Event: {formatDate(announcement.event_date)}
                          </AppText>
                        </View>
                      ) : null}

                      <View style={styles.actionRow}>
                        <TouchableOpacity accessibilityRole="button"
                          style={styles.resendButton}
                          onPress={() =>
                            handleResend(announcement)
                          }
                          disabled={
                            resendingId === announcement.id
                          }
                        >
                          {resendingId === announcement.id ? (
                            <ActivityIndicator color={Theme.colors.card} size="small" />
                          ) : (
                            <>
                              <Send size={14} color={Theme.colors.card} style={{ marginRight: 6 }} />
                              <AppText style={styles.buttonText} weight="bold">
                                Resend
                              </AppText>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity accessibilityRole="button"
                          style={styles.deleteButton}
                          onPress={() =>
                            handleDelete(announcement.id)
                          }
                        >
                          <Trash2 size={14} color={Theme.colors.card} style={{ marginRight: 6 }} />
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
        </View>
      </ScrollView>

    </View >
  );
};

export default AnnouncementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    opacity: HEADER_CONSTANTS.SUBTITLE_OPACITY,
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentPadding: {
    padding: 20,
    paddingTop: Theme.spacing.lg,
  },

  card: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
  },

  sectionHeader: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    color: C.text,
  },

  label: {
    marginBottom: Theme.spacing.sm,
    marginTop: 10,
    color: C.text,
    fontSize: 13,
    opacity: 0.8,
  },

  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.bg,
    color: C.text,
    ...Theme.typography.bodyMd,
    marginBottom: Theme.spacing.sm,
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  typeRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.xs,
  },

  typeButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: C.bg,
    marginRight: 10,
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
    color: Theme.colors.card,
  },

  submitButton: {
    backgroundColor: C.primary,
    padding: Theme.spacing.md,
    borderRadius: 12,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  submitText: {
    color: Theme.colors.card,
    fontSize: 16,
  },

  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },

  announcementCard: {
    backgroundColor: C.bg,
    padding: Theme.spacing.md,
    borderRadius: 14,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  postedDate: {
    ...Theme.typography.label,
    color: C.textMuted,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
    fontSize: 10,
  },

  title: {
    fontSize: 17,
    color: C.text,
    marginBottom: 6,
  },

  description: {
    marginBottom: Theme.spacing.md,
    color: C.textMuted,
    ...Theme.typography.body,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Theme.spacing.xs,
  },

  meta: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  resendButton: {
    flex: 1,
    backgroundColor: C.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: C.errorSoft,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  buttonText: {
    color: Theme.colors.card,
    fontSize: 13,
  },

  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },

  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
    ...Theme.typography.bodyMd,
  },
});
