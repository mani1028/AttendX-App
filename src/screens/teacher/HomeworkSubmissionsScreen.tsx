import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  ExternalLink,
  Search,
} from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import AppCard from '../../components/common/AppCard';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

const { width } = Dimensions.get('window');

interface Submission {
  student_id: string;
  student_name: string;
  roll_number: string;
  status: 'submitted' | 'pending' | 'graded';
  submitted_at?: string;
  attachments?: {
    file_name: string;
    file_url: string;
  }[];
}

type HomeworkSubmissionsRouteProp = RouteProp<RootStackParamList, 'TeacherHomeworkSubmissions'>;

export default function HomeworkSubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<HomeworkSubmissionsRouteProp>();
  const { homeworkId, title } = route.params;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.post('/manage/teacher/homework/submissions', {
        homework_id: homeworkId,
      });
      setSubmissions(res.data?.students || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
      // Fallback for demo/dev if endpoint doesn't exist yet
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const handleOpenAttachment = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => Alert.alert('Error', 'Cannot open attachment'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#10B981';
      case 'graded': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <CheckCircle2 size={16} color="#10B981" />;
      case 'graded': return <CheckCircle2 size={16} color="#3B82F6" />;
      default: return <Clock size={16} color="#F59E0B" />;
    }
  };

  return (
    <View style={styles.container}>


      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={Theme.colors.card} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText weight="bold" style={styles.headerTitle}>Submissions</AppText>
          <AppText style={styles.headerSubtitle} numberOfLines={1}>{title}</AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <Loader size="lg" color={Theme.colors.primary} />
          </View>
        ) : submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={48} color={Theme.colors.textMuted} />
            <AppText style={styles.emptyStateText}>No submissions found yet.</AppText>
          </View>
        ) : (
          submissions.map((item, idx) => (
            <AppCard key={item.student_id || `sub-${idx}`} style={styles.studentCard}>
              <View style={styles.cardInfo}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentAvatar}>
                    <User size={20} color={Theme.colors.textSec} />
                  </View>
                  <View style={styles.studentDetails}>
                    <AppText weight="bold" style={styles.studentName}>{item.student_name}</AppText>
                    <AppText style={styles.rollNumber}>Roll: {item.roll_number}</AppText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    {getStatusIcon(item.status)}
                    <AppText weight="semibold" style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.toUpperCase()}
                    </AppText>
                  </View>
                </View>

                {item.submitted_at && (
                  <View style={styles.metaRow}>
                    <Clock size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.metaText}>Submitted: {new Date(item.submitted_at).toLocaleString()}</AppText>
                  </View>
                )}

                {item.attachments && item.attachments.length > 0 && (
                  <View style={styles.attachmentsSection}>
                    <AppText weight="semibold" style={styles.attachmentsTitle}>Attachments:</AppText>
                    {item.attachments.map((file, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.attachmentLink}
                        onPress={() => handleOpenAttachment(file.file_url)}
                      >
                        <Paperclip size={14} color="#2563EB" />
                        <AppText style={styles.attachmentText} numberOfLines={1}>{file.file_name}</AppText>
                        <ExternalLink size={14} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    color: Theme.colors.card,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loaderContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.textSec,
    fontSize: 16,
  },
  studentCard: {
    padding: Theme.spacing.md,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  cardInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  rollNumber: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  attachmentsSection: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 12,
  },
  attachmentsTitle: {
    fontSize: 13,
    color: '#334155',
    marginBottom: Theme.spacing.sm,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.sm,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  attachmentText: {
    flex: 1,
    ...Theme.typography.caption,
    color: '#2563EB',
  },
});
