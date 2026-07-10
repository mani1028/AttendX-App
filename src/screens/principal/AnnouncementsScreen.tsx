import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
// AnnouncementsScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { announcementsStyles as styles } from '../../components/principal/announcements/announcementsStyles';

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
       style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Announcements"
        subtitle="School Bulletins"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={() => fetchAnnouncements()}
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

        <View style={styles.pageBody}>
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
                  <ScreenSkeleton variant="list" />
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
