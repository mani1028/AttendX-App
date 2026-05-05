import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  FlatList,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, useFocusEffect } from '@react-navigation/native';
import {
  RefreshCw,
  Calendar,
  Users,
  GraduationCap,
  School,
  FileText,
  Mail,
  User,
  LayoutDashboard,
  Layers,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Trash2,
  Eye,
  Save,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/AppNavigator';

// Types
interface Branch {
  branch_id: string;
  branch_name: string;
  branch_status: string;
  hm_employee_id: string;
  hm_name: string;
  hm_email: string;
  creation_date: string;
  teachers_count: number;
  students_count: number;
  classes_count: number;
  sections_count: number;
  teacher_attendance_today: number;
  student_attendance_today: number;
  pending_leave_requests: number;
  health_status: string;
}

interface Stats {
  branches: number;
  teachers: number;
  students: number;
  activeBranches: number;
  inactiveBranches: number;
  hms: number;
  classes: number;
  sections: number;
  pendingLeaves: number;
  teacherAttendanceToday: number;
  studentAttendanceToday: number;
}

interface MarksSummary {
  label: string;
  passed: number;
  failed: number;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

const getHealthMeta = (status: string) => {
  const key = String(status || '').toUpperCase();
  if (key === 'HEALTHY') return { label: 'Healthy', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
  if (key === 'INACTIVE') return { label: 'Inactive', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
  if (key === 'HM_MISSING') return { label: 'HM Missing', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  if (key === 'NO_CLASSES') return { label: 'No Classes', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  if (key === 'NO_TEACHERS') return { label: 'No Teachers', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  if (key === 'NO_STUDENTS') return { label: 'No Students', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  return { label: 'Needs Review', bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' };
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <AppText style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </AppText>
    </View>
  );
};

// Health Badge Component
const HealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = getHealthMeta(status);
  return (
    <View style={[styles.healthBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <AppText style={[styles.healthText, { color: meta.color }]}>{meta.label}</AppText>
    </View>
  );
};

// KPI Card Component with animations
const KpiCard: React.FC<{
  title: string;
  value: number;
  sub: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeUp: boolean;
  cardStyle?: any;
  onPress?: () => void;
}> = ({ title, value, sub, icon: Icon, iconBg, iconColor, badge, badgeUp, cardStyle, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handlePressIn = useRef(new Animated.Value(0)).current;
  
  const onPressIn = () => {
    Animated.spring(handlePressIn, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };
  
  const onPressOut = () => {
    Animated.spring(handlePressIn, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.kpiCard,
        cardStyle,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            {
              scale: handlePressIn.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.95],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
        style={{ flex: 1 }}
      >
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
            <Icon size={20} color={iconColor} />
          </View>
          <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
            <AppText style={styles.kpiBadgeText}>{badgeUp ? '▲' : '▼'} {badge}</AppText>
          </View>
        </View>
        <AppText style={styles.kpiTitle}>{title}</AppText>
        <AppText style={styles.kpiValue}>{value}</AppText>
        <AppText style={styles.kpiSub}>{sub}</AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Branch Card Component with animations
const BranchCard: React.FC<{ branch: Branch; onPress: () => void }> = ({ branch, onPress }) => {
  const health = getHealthMeta(branch.health_status);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.branchCard} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.branchCardHeader}>
          <View>
            <AppText style={styles.branchName}>{branch.branch_name}</AppText>
            <AppText style={styles.branchId}>ID: {branch.branch_id}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusBadge status={branch.branch_status} />
            <HealthBadge status={branch.health_status} />
          </View>
        </View>

        <View style={styles.branchInfoRow}>
          <User size={14} color={colors.textMuted} />
          <AppText style={styles.branchHm}>HM: {branch.hm_name || 'No HM'}</AppText>
        </View>
        <View style={styles.branchInfoRow}>
          <Mail size={14} color={colors.textMuted} />
          <AppText style={styles.branchEmail}>{branch.hm_email || 'No email'}</AppText>
        </View>

        <View style={styles.branchStats}>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.teachers_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Teachers</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.students_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Students</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.classes_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Classes</AppText>
          </View>
          <View style={styles.branchStat}>
            <AppText style={styles.branchStatValue}>{branch.sections_count || 0}</AppText>
            <AppText style={styles.branchStatLabel}>Sections</AppText>
          </View>
        </View>

        <View style={styles.branchFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FileText size={14} color={colors.textMuted} />
            <AppText style={styles.branchPendingLeaves}>Leaves: {branch.pending_leave_requests || 0}</AppText>
          </View>
          <AppText style={styles.branchViewBtn}>View Details →</AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Branch Row Component for Table View
const BranchRow: React.FC<{
  branch: Branch;
  isEditing: boolean;
  editData: Partial<Branch>;
  onEditChange: (field: keyof Branch, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}> = ({ branch, isEditing, editData, onEditChange, onSave, onCancel, onEdit, onDelete, onView }) => {
  if (isEditing) {
    return (
      <View style={styles.branchRow}>
        <AppText style={styles.branchRowId}>{branch.branch_id}</AppText>
        <TextInput
          style={styles.editInput}
          value={editData.branch_name}
          onChangeText={(text) => onEditChange('branch_name', text)}
        />
        <TextInput
          style={styles.editInput}
          value={editData.hm_employee_id}
          onChangeText={(text) => onEditChange('hm_employee_id', text)}
        />
        <TextInput
          style={styles.editInput}
          value={editData.hm_name}
          onChangeText={(text) => onEditChange('hm_name', text)}
        />
        <TextInput
          style={styles.editInput}
          value={editData.hm_email}
          onChangeText={(text) => onEditChange('hm_email', text)}
        />
        <View style={styles.editStatusContainer}>
          {['ACTIVE', 'INACTIVE'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.editStatusBtn, editData.branch_status === opt && styles.editStatusBtnActive]}
              onPress={() => onEditChange('branch_status', opt)}
            >
              <AppText style={[styles.editStatusText, editData.branch_status === opt && styles.editStatusTextActive]}>
                {opt}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.branchRowActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Save size={14} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <X size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.branchRow}>
      <AppText style={styles.branchRowId}>{branch.branch_id}</AppText>
      <AppText style={styles.branchRowCell}>{branch.branch_name}</AppText>
      <AppText style={styles.branchRowCell}>{branch.hm_employee_id || '-'}</AppText>
      <AppText style={styles.branchRowCell}>{branch.hm_name || '-'}</AppText>
      <AppText style={styles.branchRowCell}>{branch.hm_email || '-'}</AppText>
      <StatusBadge status={branch.branch_status} />
      <AppText style={styles.branchRowDate}>{formatDate(branch.creation_date)}</AppText>
      <View style={styles.branchRowActions}>
        <TouchableOpacity style={styles.deleteRowBtn} onPress={onDelete}>
          <Trash2 size={12} color={colors.error} />
          <AppText style={styles.deleteRowBtnText}>Del</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewRowBtn} onPress={onView}>
          <Eye size={12} color={colors.success} />
          <AppText style={styles.viewRowBtnText}>View</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Pass/Fail Bar Chart Component with animations
const PassFailChart: React.FC<{ data: MarksSummary[]; isAllBranches: boolean }> = ({ data, isAllBranches }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <AppText style={styles.chartEmptyText}>No marks data available. Exam results will appear here once marks are entered.</AppText>
      </View>
    );
  }

  const maxTotal = Math.max(...data.map(d => (d.passed || 0) + (d.failed || 0)), 1);
  const maxHeight = 160;

  const AnimatedChartBar: React.FC<{ percentage: number; color: string; delay: number }> = ({ percentage, color, delay }) => {
    const heightAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(heightAnim, {
        toValue: Math.max(percentage * maxHeight, 2),
        duration: 800,
        delay: delay * 100,
        useNativeDriver: false,
      }).start();
    }, [delay, heightAnim]);

    return (
      <Animated.View
        style={[
          styles.chartBarPassed,
          { height: heightAnim, backgroundColor: color },
        ]}
      />
    );
  };

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <AppText style={styles.legendText}>Passed</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <AppText style={styles.legendText}>Failed</AppText>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          {data.map((item, idx) => {
            const passedHeight = ((item.passed || 0) / maxTotal);
            const failedHeight = ((item.failed || 0) / maxTotal);
            const total = (item.passed || 0) + (item.failed || 0);
            const passRate = total > 0 ? Math.round((item.passed / total) * 100) : 0;

            return (
              <View key={idx} style={styles.chartBarGroup}>
                <View style={styles.chartBars}>
                  <AnimatedChartBar percentage={passedHeight} color="#10b981" delay={idx * 1.5} />
                  <AnimatedChartBar percentage={failedHeight} color="#ef4444" delay={idx * 1.5 + 0.8} />
                </View>
                <AppText style={styles.chartLabel}>
                  {isAllBranches 
                    ? (item.label.length > 10 ? item.label.slice(0, 8) + '…' : item.label)
                    : item.label}
                </AppText>
                <AppText style={styles.chartPassRate}>{passRate}% pass</AppText>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.chartStatsList}>
        {data.map((item, idx) => {
          const total = (item.passed || 0) + (item.failed || 0);
          const passRate = total > 0 ? Math.round((item.passed / total) * 100) : 0;
          return (
            <View key={idx} style={styles.chartStatItem}>
              <AppText style={styles.chartStatLabel}>{item.label}:</AppText>
              <AppText style={styles.chartStatValue}>{item.passed} ✓ / {item.failed} ✗ ({passRate}%)</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// HM Registration Modal Component (simplified)
const HMRegistrationModal: React.FC<{
  visible: boolean;
  schoolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, schoolCode, onClose, onSuccess }) => {
  // This is a simplified version - the full HMRegistration component would be imported
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Register New HM</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <AppText style={styles.modalPlaceholder}>HM Registration Form would go here</AppText>
            <AppText style={styles.modalNote}>This is a placeholder. The full HM registration form would be implemented here.</AppText>
          </View>
          <View style={styles.modalFooter}>
            <AppButton title="Close" onPress={onClose} type="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PrincipalDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, setTabBarVisible } = useAuth();
  const route = useRoute();
  const overviewRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);

  // Animation refs
  const welcomeOpacityAnim = useRef(new Animated.Value(0)).current;
  const welcomeTranslateAnim = useRef(new Animated.Value(20)).current;
  const topBarOpacityAnim = useRef(new Animated.Value(0)).current;
  const topBarTranslateAnim = useRef(new Animated.Value(20)).current;

  const [schoolCode, setSchoolCode] = useState<string>('');
  const [stats, setStats] = useState<Stats>({
    branches: 0,
    teachers: 0,
    students: 0,
    activeBranches: 0,
    inactiveBranches: 0,
    hms: 0,
    classes: 0,
    sections: 0,
    pendingLeaves: 0,
    teacherAttendanceToday: 0,
    studentAttendanceToday: 0,
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [view, setView] = useState<'dashboard' | 'branches' | 'addhm'>('dashboard');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Animate welcome section
    Animated.parallel([
      Animated.timing(welcomeOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(welcomeTranslateAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
    ]).start();

    // Animate top bar with delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(topBarOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(topBarTranslateAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
      ]).start();
    }, 100);

    return () => {
      isMounted.current = false;
    };
  }, []);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>('');
  const [branchCardsPage, setBranchCardsPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [marksSummary, setMarksSummary] = useState<MarksSummary[]>([]);
  const [marksSummaryLoading, setMarksSummaryLoading] = useState<boolean>(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  const responsiveKpiCardStyle = useMemo(() => {
    if (width < 380) return { minWidth: '46%' };
    if (width < 460) return { minWidth: '31%' };
    return { minWidth: '30%' };
  }, [width]);
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Branch>>({});
  
  // Search for branches view
  const [branchViewSearchTerm, setBranchViewSearchTerm] = useState<string>('');
  const [branchViewPage, setBranchViewPage] = useState<number>(1);

  // Principal details for profile card
  const [principalEmail, setPrincipalEmail] = useState<string>('');
  const [principalPhone, setPrincipalPhone] = useState<string>('');

  const ROWS_PER_PAGE = 7;
  const BRANCH_CARDS_PER_PAGE = 6;

  // Load school code and principal details
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      if (isMounted.current) {
        setSchoolCode(code);
      }
      try {
        const email = await AsyncStorage.getItem('email') || '';
        const phone = await AsyncStorage.getItem('phone') || '';
        if (isMounted.current) {
          setPrincipalEmail(email);
          setPrincipalPhone(phone);
        }
      } catch (err) {
        console.log('Error loading principal details:', err);
      }
    };
    load();

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

  // Fetch stats and branches
  const fetchStatsAndBranches = useCallback(async () => {
    if (!schoolCode) return;
    setLoading(true);
    try {
      const res = await API.get('/principal/dashboard/overview', {
        headers: { 'x-school-code': schoolCode },
      });
      const data = res.data || {};
      if (data.ok) {
        const summary = data.summary || {};
        const statsData = {
          branches: Number(summary.total_branches || 0),
          teachers: Number(summary.total_teachers || 0),
          students: Number(summary.total_students || 0),
          activeBranches: Number(summary.active_branches || 0),
          inactiveBranches: Number(summary.inactive_branches || 0),
          hms: Number(summary.total_hms || 0),
          classes: Number(summary.total_classes || 0),
          sections: Number(summary.total_sections || 0),
          pendingLeaves: Number(summary.pending_leave_requests || 0),
          teacherAttendanceToday: Number(summary.teacher_attendance_marked_today || 0),
          studentAttendanceToday: Number(summary.student_attendance_marked_today || 0),
        };
        const branchData = data.items || [];

        if (isMounted.current) {
          setStats(statsData);
          setBranches(branchData);
        }

        // Cache data
        await Promise.all([
          AsyncStorage.setItem(`principal_stats_${schoolCode}`, JSON.stringify(statsData)),
          AsyncStorage.setItem(`principal_branches_${schoolCode}`, JSON.stringify(branchData))
        ]);
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err?.response?.status === 401) return;
      console.error('Failed to fetch dashboard data:', err);
      // Only alert if we don't have cached data
      if (branches.length === 0) {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [schoolCode, branches.length]);

  // Fetch marks summary
  const fetchMarksSummary = useCallback(async () => {
    if (!schoolCode) return;
    setMarksSummaryLoading(true);
    try {
      const params = selectedBranchId !== 'ALL' ? `?branch_id=${encodeURIComponent(selectedBranchId)}` : '';
      const res = await API.get(`/principal/dashboard/marks-summary${params}`, {
        headers: { 'x-school-code': schoolCode },
      });
      const marksData = Array.isArray(res.data?.items) ? res.data.items : [];
      if (isMounted.current) {
        setMarksSummary(marksData);
      }

      // Cache marks summary
      await AsyncStorage.setItem(`principal_marks_summary_${schoolCode}_${selectedBranchId}`, JSON.stringify(marksData));
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err?.response?.status === 401) return;
      console.error('Failed to fetch marks summary:', err);
      // No clear state here, keep cached if it failed
    } finally {
      if (isMounted.current) {
        setMarksSummaryLoading(false);
      }
    }
  }, [schoolCode, selectedBranchId]);

  // Initial fetch and cache loading
  useEffect(() => {
    if (schoolCode) {
      loadCachedData();
      fetchStatsAndBranches();
    }
  }, [schoolCode]);

  const loadCachedData = async () => {
    try {
      const statsKey = `principal_stats_${schoolCode}`;
      const branchesKey = `principal_branches_${schoolCode}`;
      const marksKey = `principal_marks_summary_${schoolCode}_ALL`;

      const [cachedStats, cachedBranches, cachedMarks] = await Promise.all([
        AsyncStorage.getItem(statsKey),
        AsyncStorage.getItem(branchesKey),
        AsyncStorage.getItem(marksKey)
      ]);

      if (!isMounted.current) return;

      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
      if (cachedBranches) {
        setBranches(JSON.parse(cachedBranches));
      }
      if (cachedMarks) {
        setMarksSummary(JSON.parse(cachedMarks));
      }

      if (cachedStats || cachedBranches) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
  };

  // Fetch marks summary when view changes
  useEffect(() => {
    if (view === 'dashboard') {
      loadCachedMarks();
      fetchMarksSummary();
    }
  }, [selectedBranchId, view, fetchMarksSummary]);

  const loadCachedMarks = async () => {
    if (selectedBranchId === 'ALL') return; // Handled by initial loadCachedData
    try {
      const marksKey = `principal_marks_summary_${schoolCode}_${selectedBranchId}`;
      const cachedMarks = await AsyncStorage.getItem(marksKey);
      if (isMounted.current && cachedMarks) {
        setMarksSummary(JSON.parse(cachedMarks));
      }
    } catch (err) {
      console.error('Error loading cached marks:', err);
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatsAndBranches();
    if (view === 'dashboard') await fetchMarksSummary();
    setRefreshing(false);
  }, [fetchStatsAndBranches, fetchMarksSummary, view]);

  // Filter branches
  const filteredBranches = useMemo(() => {
    let filtered = branches;
    if (selectedBranchId !== 'ALL') {
      filtered = filtered.filter(b => String(b.branch_id) === String(selectedBranchId));
    }
    if (branchSearchTerm) {
      const term = branchSearchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_id?.toLowerCase().includes(term) ||
        b.hm_name?.toLowerCase().includes(term)
      );
    }
    if (branchViewSearchTerm && view === 'branches') {
      const term = branchViewSearchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.branch_name?.toLowerCase().includes(term) ||
        b.branch_id?.toLowerCase().includes(term) ||
        b.hm_name?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [branches, selectedBranchId, branchSearchTerm, branchViewSearchTerm, view]);

  // Pagination for branches view
  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / ROWS_PER_PAGE));
  const paginatedBranches = filteredBranches.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Branch cards pagination
  const branchCardsTotalPages = Math.max(1, Math.ceil(filteredBranches.length / BRANCH_CARDS_PER_PAGE));
  const branchCards = useMemo(() => {
    if (!showAllBranches) return filteredBranches.slice(0, BRANCH_CARDS_PER_PAGE);
    const start = (branchCardsPage - 1) * BRANCH_CARDS_PER_PAGE;
    return filteredBranches.slice(start, start + BRANCH_CARDS_PER_PAGE);
  }, [filteredBranches, showAllBranches, branchCardsPage]);

  // Selected branch object
  const selectedBranch = useMemo(() => {
    if (selectedBranchId === 'ALL') return null;
    return branches.find(b => String(b.branch_id) === String(selectedBranchId));
  }, [branches, selectedBranchId]);

  // Displayed stats
  const displayedStats = useMemo(() => {
    if (selectedBranchId === 'ALL') return stats;
    if (selectedBranch) {
      return {
        ...stats,
        branches: 1,
        teachers: selectedBranch.teachers_count || 0,
        students: selectedBranch.students_count || 0,
        activeBranches: selectedBranch.branch_status === 'ACTIVE' ? 1 : 0,
        inactiveBranches: selectedBranch.branch_status === 'INACTIVE' ? 1 : 0,
        classes: selectedBranch.classes_count || 0,
        sections: selectedBranch.sections_count || 0,
        pendingLeaves: selectedBranch.pending_leave_requests || 0,
        teacherAttendanceToday: selectedBranch.teacher_attendance_today || 0,
        studentAttendanceToday: selectedBranch.student_attendance_today || 0,
      };
    }
    return stats;
  }, [selectedBranchId, selectedBranch, stats]);

  // Status summary
  const statusSummary = useMemo(() => {
    return branches.reduce(
      (acc, row) => {
        const status = String(row.health_status || '').toUpperCase();
        if (status === 'HEALTHY') acc.healthy += 1;
        else if (status === 'INACTIVE') acc.inactive += 1;
        else acc.needsAttention += 1;
        return acc;
      },
      { healthy: 0, inactive: 0, needsAttention: 0 }
    );
  }, [branches]);

  // Bars for distribution
  const bars = [
    { label: 'Branches', value: displayedStats.branches, color: '#3b82f6' },
    { label: 'Teachers', value: displayedStats.teachers, color: '#10b981' },
    { label: 'Students', value: displayedStats.students, color: '#f97316' },
    { label: 'Classes', value: displayedStats.classes, color: '#8b5cf6' },
    { label: 'Sections', value: displayedStats.sections, color: '#ec4899' },
  ];
  const maxVal = Math.max(...bars.map(b => b.value), 1);

  const handleKpiClick = () => {
    if (selectedBranchId === 'ALL') {
      overviewRef.current?.scrollToEnd();
    } else {
      navigation.navigate('PrincipalBranchDetails', {
        branchId: selectedBranch?.branch_id || '',
        branchName: selectedBranch?.branch_name || '',
        hmName: selectedBranch?.hm_name || '',
        hmEmail: selectedBranch?.hm_email || '',
        branchStatus: selectedBranch?.branch_status || '',
      });
    }
  };

  const handleViewBranch = (branch: Branch) => {
    navigation.navigate('PrincipalBranchDetails', {
      branchId: branch.branch_id,
      branchName: branch.branch_name,
      hmName: branch.hm_name,
      hmEmail: branch.hm_email,
      branchStatus: branch.branch_status,
    });
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.branch_id);
    setEditData({
      branch_name: branch.branch_name,
      hm_employee_id: branch.hm_employee_id,
      hm_name: branch.hm_name,
      hm_email: branch.hm_email,
      branch_status: branch.branch_status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await API.put('/principal/branch/update', {
        branch_id: editingId,
        branch_name: editData.branch_name,
        hm_employee_id: editData.hm_employee_id,
        hm_name: editData.hm_name,
        hm_email: editData.hm_email,
        status: editData.branch_status,
        password: null,
      });
      if (!isMounted.current) return;
      Alert.alert('Success', 'Branch updated successfully');
      cancelEdit();
      fetchStatsAndBranches();
    } catch (err: any) {
      if (!isMounted.current) return;
      if (err?.response?.status === 401) return;
      Alert.alert('Error', 'Failed to update branch');
    }
  };

  const deleteBranch = (branchId: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete branch ${branchId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete('/principal/branch/delete', { data: { branch_id: branchId } });
              Alert.alert('Success', 'Branch deleted successfully');
              if (selectedBranchId === branchId) setSelectedBranchId('ALL');
              fetchStatsAndBranches();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete branch');
            }
          },
        },
      ]
    );
  };

  const handleEditChange = (field: keyof Branch, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (!schoolCode) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorTitle}>School Code missing</AppText>
        <AppText style={styles.errorText}>Please login again.</AppText>
      </View>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      <View style={[styles.headerStandard, { paddingTop: insets.top + 12, paddingBottom: 20 }]}>
        <View style={styles.heroHeaderRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <AvatarBubble
              displayName={userName || 'Principal'}
              size={66}
              textSize={23}
              primaryColor="#2f80ed"
              primaryGlowColor="rgba(47,128,237,0.35)"
            />
          </TouchableOpacity>
          <View style={styles.heroHeaderSpacer} />
        </View>
        <AppText style={styles.heroTitle}>Hello Principal 👋</AppText>
        <AppText style={styles.heroSub}>Here&apos;s what&apos;s happening today.</AppText>
      </View>

      <ScrollView
        ref={overviewRef}
        contentContainerStyle={[styles.contentContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >

        {/* Quick Access */}
        <Animated.View
          style={[
            {
              opacity: topBarOpacityAnim,
              transform: [{ translateY: topBarTranslateAnim }],
            },
          ]}
        >
          <View style={styles.quickAccessPanel}>
            <View style={styles.quickAccessHeaderRow}>
              <View style={styles.quickAccessTitleRow}>
                <View style={styles.topBarIcon}>
                  {view === 'dashboard' ? (
                    <LayoutDashboard size={18} color={colors.accent} />
                  ) : view === 'branches' ? (
                    <Layers size={18} color={colors.accent} />
                  ) : (
                    <PlusCircle size={18} color={colors.accent} />
                  )}
                </View>
                <View style={styles.quickAccessTitleTextWrap}>
                  <AppText style={styles.title}>Quick Access</AppText>
                  <AppText style={styles.subtitle}>Jump straight to branch and HM actions</AppText>
                </View>
              </View>
              <TouchableOpacity style={styles.viewAllTextBtn} onPress={() => setView('branches')}>
                <AppText style={styles.viewAllText}>View All</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.branchSelector}>
              <AppText style={styles.branchSelectorLabel}>View Branch</AppText>
              <TouchableOpacity
                style={styles.branchSelectorField}
                onPress={() => setSelectedBranchId('ALL')}
                activeOpacity={0.85}
              >
                <AppText style={styles.branchSelectorValue} numberOfLines={1}>
                  {selectedBranchId === 'ALL' ? 'All Branches' : selectedBranchId}
                </AppText>
                <ChevronRight size={16} color={colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            <View style={styles.viewButtons}>
              {(['dashboard', 'branches', 'addhm'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.viewBtn, view === key && styles.viewBtnActive]}
                  onPress={() => setView(key)}
                >
                  <AppText style={[styles.viewBtnText, view === key && styles.viewBtnTextActive]}>
                    {key === 'dashboard' ? 'Dashboard' : key === 'branches' ? 'Branches' : 'Add Branch'}
                  </AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <RefreshCw size={14} color={colors.textMuted} />
                <AppText style={styles.refreshBtnText}>Refresh</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewAllTextBtn}
                onPress={() => navigation.navigate('TeacherLeaveApproval' as any)}
              >
                <FileText size={16} color={colors.textMuted} />
                <AppText style={[styles.viewAllText, { marginLeft: 8 }]}>Teacher Leaves</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <>
            <AppCard style={styles.profileSectionCard}>
              <View style={styles.profileSectionHeader}>
                <AvatarBubble
                  displayName={userName || 'Principal'}
                  size={48}
                  textSize={18}
                  primaryColor="#2f80ed"
                  primaryGlowColor="rgba(47,128,237,0.2)"
                />
                <View style={styles.profileSectionContent}>
                  <View style={styles.profileDetailRow}>
                    <AppText style={styles.profileDetailLabel}>Name</AppText>
                    <AppText style={styles.profileDetailValue}>{userName || 'Principal'}</AppText>
                  </View>
                  {principalPhone && (
                    <View style={styles.profileDetailRow}>
                      <AppText style={styles.profileDetailLabel}>Mobile</AppText>
                      <AppText style={styles.profileDetailValue}>{principalPhone}</AppText>
                    </View>
                  )}
                  {principalEmail && (
                    <View style={styles.profileDetailRow}>
                      <AppText style={styles.profileDetailLabel}>Email</AppText>
                      <AppText style={styles.profileDetailValue}>{principalEmail}</AppText>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.profileSectionBtn}
                  onPress={() => navigation.navigate('Profile')}
                  activeOpacity={0.85}
                >
                  <AppText style={styles.profileSectionBtnText}>View</AppText>
                </TouchableOpacity>
              </View>
            </AppCard>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <KpiCard
                title={selectedBranchId === 'ALL' ? 'Total Branches' : 'Selected Branch'}
                value={displayedStats.branches}
                sub={selectedBranchId === 'ALL' ? 'All sub-branches' : `${selectedBranch?.branch_name || 'Branch'} snapshot`}
                icon={School}
                iconBg="rgba(59, 130, 246, 0.1)"
                iconColor="#3b82f6"
                badge="Live"
                badgeUp={true}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Total Teachers"
                value={displayedStats.teachers}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Teachers in ${selectedBranchId}`}
                icon={Users}
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor="#10b981"
                badge="Live"
                badgeUp={true}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Total Students"
                value={displayedStats.students}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Students in ${selectedBranchId}`}
                icon={GraduationCap}
                iconBg="rgba(249, 115, 22, 0.1)"
                iconColor="#f97316"
                badge="Live"
                badgeUp={true}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Active Branches"
                value={selectedBranchId === 'ALL' ? stats.activeBranches : (selectedBranch?.branch_status === 'ACTIVE' ? 1 : 0)}
                sub={selectedBranchId === 'ALL' ? 'Operational branches' : 'Branch active status'}
                icon={CheckCircle2}
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor="#10b981"
                badge="Status"
                badgeUp={true}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Inactive Branches"
                value={selectedBranchId === 'ALL' ? stats.inactiveBranches : (selectedBranch?.branch_status === 'ACTIVE' ? 0 : 1)}
                sub={selectedBranchId === 'ALL' ? 'Need attention' : 'Branch inactive status'}
                icon={AlertTriangle}
                iconBg="rgba(239, 68, 68, 0.1)"
                iconColor="#dc2626"
                badge="Watch"
                badgeUp={false}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Pending Leaves"
                value={displayedStats.pendingLeaves}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Pending in ${selectedBranchId}`}
                icon={FileText}
                iconBg="rgba(234, 88, 12, 0.1)"
                iconColor="#ea580c"
                badge="Pending"
                badgeUp={false}
                cardStyle={responsiveKpiCardStyle}
                onPress={handleKpiClick}
              />
            </View>

            {/* Distribution & Snapshot */}
            <View style={styles.twoColumnGrid}>
              <AppCard style={styles.distributionCard}>
                <AppText style={styles.cardTitle}>Distribution</AppText>
                {bars.map(bar => (
                  <View key={bar.label} style={styles.barItem}>
                    <View style={styles.barHeader}>
                      <AppText style={styles.barLabel}>{bar.label}</AppText>
                      <AppText style={[styles.barValue, { color: bar.color }]}>{bar.value}</AppText>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round((bar.value / maxVal) * 100)}%`, backgroundColor: bar.color }]} />
                    </View>
                  </View>
                ))}
              </AppCard>

              <AppCard style={styles.snapshotCard}>
                <AppText style={styles.cardTitle}>
                  {selectedBranchId === 'ALL' ? 'School Snapshot' : 'Branch Snapshot'}
                </AppText>
                {selectedBranchId === 'ALL' ? (
                  <>
                    <View style={styles.donutContainer}>
                      <View style={styles.donut}>
                        <AppText style={styles.donutTotal}>{stats.branches + stats.teachers + stats.students}</AppText>
                        <AppText style={styles.donutLabel}>Total</AppText>
                      </View>
                    </View>
                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                        <AppText style={styles.legendText}>Branches</AppText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                        <AppText style={styles.legendText}>Teachers</AppText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                        <AppText style={styles.legendText}>Students</AppText>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.branchSnapshot}>
                    <View style={styles.snapshotItem}>
                      <AppText style={styles.snapshotLabel}>Branch ID</AppText>
                      <AppText style={styles.snapshotValue}>{selectedBranch?.branch_id || '-'}</AppText>
                    </View>
                    <View style={styles.snapshotItem}>
                      <AppText style={styles.snapshotLabel}>Branch Name</AppText>
                      <AppText style={styles.snapshotValue}>{selectedBranch?.branch_name || '-'}</AppText>
                    </View>
                    <View style={styles.snapshotItem}>
                      <AppText style={styles.snapshotLabel}>HM Name</AppText>
                      <AppText style={styles.snapshotValue}>{selectedBranch?.hm_name || '-'}</AppText>
                    </View>
                    <View style={styles.snapshotItem}>
                      <AppText style={styles.snapshotLabel}>HM Email</AppText>
                      <AppText style={styles.snapshotValue}>{selectedBranch?.hm_email || '-'}</AppText>
                    </View>
                    <View style={styles.snapshotItemRow}>
                      <StatusBadge status={selectedBranch?.branch_status || '-'} />
                      <AppText style={styles.snapshotDate}>Created: {formatDate(selectedBranch?.creation_date || '')}</AppText>
                    </View>
                  </View>
                )}
              </AppCard>
            </View>

            {/* Pass/Fail Chart */}
            <AppCard style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText style={styles.cardTitle}>
                  {selectedBranchId === 'ALL'
                    ? 'Student Pass / Fail Overview — All Branches'
                    : `Student Pass / Fail — ${selectedBranch?.branch_name || selectedBranchId} (by Class)`}
                </AppText>
                {marksSummaryLoading && <ActivityIndicator size="small" color={colors.accent} />}
              </View>
              <PassFailChart data={marksSummary} isAllBranches={selectedBranchId === 'ALL'} />
            </AppCard>

            {/* Main Principal Overview */}
            <AppCard style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View>
                  <AppText style={styles.cardTitle}>Main Principal Overview</AppText>
                  <AppText style={styles.overviewSubtitle}>Complete school-wide branch health and operational status</AppText>
                </View>
                <View style={styles.statusChips}>
                  <View style={[styles.statusChip, styles.statusChipHealthy]}>
                    <AppText style={styles.statusChipText}>Healthy: {statusSummary.healthy}</AppText>
                  </View>
                  <View style={[styles.statusChip, styles.statusChipAttention]}>
                    <AppText style={styles.statusChipText}>Needs Attention: {statusSummary.needsAttention}</AppText>
                  </View>
                  <View style={[styles.statusChip, styles.statusChipInactive]}>
                    <AppText style={styles.statusChipText}>Inactive: {statusSummary.inactive}</AppText>
                  </View>
                </View>
              </View>

              {/* Branch Table Header */}
              <View style={styles.tableHeader}>
                <AppText style={[styles.tableHeaderText, styles.colBranch]}>Branch</AppText>
                <AppText style={[styles.tableHeaderText, styles.colHm]}>HM</AppText>
                <AppText style={[styles.tableHeaderText, styles.colStatus]}>Status</AppText>
                <AppText style={[styles.tableHeaderText, styles.colTeachers]}>Teachers</AppText>
                <AppText style={[styles.tableHeaderText, styles.colStudents]}>Students</AppText>
                <AppText style={[styles.tableHeaderText, styles.colClasses]}>Classes</AppText>
                <AppText style={[styles.tableHeaderText, styles.colSections]}>Sections</AppText>
                <AppText style={[styles.tableHeaderText, styles.colAction]}>Action</AppText>
              </View>

              {paginatedBranches.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No branches found</AppText>
                </View>
              ) : (
                paginatedBranches.map(branch => (
                  <View key={branch.branch_id} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.colBranch]}>
                      <AppText style={styles.branchNameCell}>{branch.branch_name || '—'}</AppText>
                      <AppText style={styles.branchIdCell}>ID: {branch.branch_id}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colHm]}>
                      <AppText style={styles.hmNameCell}>{branch.hm_name || '—'}</AppText>
                      <AppText style={styles.hmIdCell}>{branch.hm_employee_id || '—'}</AppText>
                      <AppText style={styles.hmEmailCell}>{branch.hm_email || '—'}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colStatus]}>
                      <StatusBadge status={branch.branch_status} />
                      <HealthBadge status={branch.health_status} />
                    </View>
                    <View style={[styles.tableCell, styles.colTeachers]}>
                      <AppText style={styles.numberCell}>{branch.teachers_count || 0}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colStudents]}>
                      <AppText style={styles.numberCell}>{branch.students_count || 0}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colClasses]}>
                      <AppText style={styles.numberCell}>{branch.classes_count || 0}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colSections]}>
                      <AppText style={styles.numberCell}>{branch.sections_count || 0}</AppText>
                    </View>
                    <View style={[styles.tableCell, styles.colAction]}>
                      <TouchableOpacity
                        style={styles.viewBranchBtn}
                        onPress={() => handleViewBranch(branch)}
                      >
                        <AppText style={styles.viewBranchBtnText}>View</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Pagination */}
              {filteredBranches.length > ROWS_PER_PAGE && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </AppCard>

            {/* Branch Containers Section */}
            <AppCard style={styles.branchContainersCard}>
              <View style={styles.branchContainersHeader}>
                <View>
                  <AppText style={styles.cardTitle}>
                    {showAllBranches ? 'All Branch Containers' : 'Branch Containers'}
                  </AppText>
                  <AppText style={styles.overviewSubtitle}>
                    {showAllBranches 
                      ? `Showing all ${filteredBranches.length} branches` 
                      : `Showing ${Math.min(BRANCH_CARDS_PER_PAGE, filteredBranches.length)} of ${filteredBranches.length} branches`}
                  </AppText>
                </View>
                <View style={styles.branchContainersActions}>
                  {showAllBranches && (
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search branches..."
                      placeholderTextColor={colors.textMuted}
                      value={branchSearchTerm}
                      onChangeText={setBranchSearchTerm}
                    />
                  )}
                  {!showAllBranches && filteredBranches.length > BRANCH_CARDS_PER_PAGE && (
                    <TouchableOpacity
                      style={styles.viewAllBtn}
                      onPress={() => {
                        setShowAllBranches(true);
                        setBranchCardsPage(1);
                      }}
                    >
                      <AppText style={styles.viewAllBtnText}>View All ({filteredBranches.length})</AppText>
                    </TouchableOpacity>
                  )}
                  {showAllBranches && (
                    <TouchableOpacity
                      style={styles.showLessBtn}
                      onPress={() => {
                        setShowAllBranches(false);
                        setBranchSearchTerm('');
                        setBranchCardsPage(1);
                      }}
                    >
                      <AppText style={styles.showLessBtnText}>Show Less</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {branchCards.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No branches found</AppText>
                </View>
              ) : (
                <>
                  <View style={styles.branchCardsGrid}>
                    {branchCards.map(branch => (
                      <BranchCard key={branch.branch_id} branch={branch} onPress={() => handleViewBranch(branch)} />
                    ))}
                  </View>

                  {showAllBranches && filteredBranches.length > BRANCH_CARDS_PER_PAGE && (
                    <View style={styles.branchCardPagination}>
                      <AppText style={styles.paginationInfo}>
                        Showing {(branchCardsPage - 1) * BRANCH_CARDS_PER_PAGE + 1}–
                        {Math.min(branchCardsPage * BRANCH_CARDS_PER_PAGE, filteredBranches.length)} of {filteredBranches.length}
                      </AppText>
                      <View style={styles.paginationButtons}>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(1)}
                          disabled={branchCardsPage === 1}
                        >
                          <ChevronsLeft size={16} color={branchCardsPage === 1 ? colors.border : colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.max(1, p - 1))}
                          disabled={branchCardsPage === 1}
                        >
                          <ChevronLeft size={16} color={branchCardsPage === 1 ? colors.border : colors.textMuted} />
                        </TouchableOpacity>
                        <AppText style={styles.pageInfo}>Page {branchCardsPage} of {branchCardsTotalPages}</AppText>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.min(branchCardsTotalPages, p + 1))}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <ChevronRight size={16} color={branchCardsPage === branchCardsTotalPages ? colors.border : colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(branchCardsTotalPages)}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <ChevronsRight size={16} color={branchCardsPage === branchCardsTotalPages ? colors.border : colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </AppCard>
          </>
        )}

        {/* Branches View */}
        {view === 'branches' && (
          <AppCard style={styles.branchesViewCard}>
            <View style={styles.branchesViewHeader}>
              <View>
                <AppText style={styles.cardTitle}>
                  {selectedBranchId === 'ALL' ? 'Branch List' : `Branch: ${selectedBranchId}`}
                </AppText>
                <AppText style={styles.overviewSubtitle}>
                  {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} registered
                </AppText>
              </View>
              <TouchableOpacity style={styles.addBranchBtn} onPress={() => setView('addhm')}>
                <AppText style={styles.addBranchBtnText}>+ Add Branch</AppText>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={styles.branchSearchInput}
              placeholder="Search by branch name, ID, or HM name..."
              placeholderTextColor={colors.textMuted}
              value={branchViewSearchTerm}
              onChangeText={(text) => {
                setBranchViewSearchTerm(text);
                setBranchViewPage(1);
              }}
            />

            {/* Branch List Header */}
            <View style={styles.branchesListHeader}>
              <AppText style={[styles.branchesHeaderText, styles.colBranchId]}>Branch ID</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colBranchName]}>Branch Name</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colEmpId]}>HM Emp ID</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colHmName]}>HM Name</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colHmEmail]}>HM Email</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colBranchStatus]}>Status</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colCreated]}>Created</AppText>
              <AppText style={[styles.branchesHeaderText, styles.colActions]}>Actions</AppText>
            </View>

            {paginatedBranches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <AppText style={styles.emptyText}>No branches found</AppText>
              </View>
            ) : (
              paginatedBranches.map(branch => (
                <BranchRow
                  key={branch.branch_id}
                  branch={branch}
                  isEditing={editingId === branch.branch_id}
                  editData={editData}
                  onEditChange={handleEditChange}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  onEdit={() => startEdit(branch)}
                  onDelete={() => deleteBranch(branch.branch_id)}
                  onView={() => handleViewBranch(branch)}
                />
              ))
            )}

            {/* Pagination */}
            {filteredBranches.length > ROWS_PER_PAGE && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
                </TouchableOpacity>
                <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </AppCard>
        )}
      </ScrollView>

      {/* HM Registration Modal */}
      <HMRegistrationModal
        visible={view === 'addhm'}
        schoolCode={schoolCode}
        onClose={() => setView('branches')}
        onSuccess={() => {
          setView('branches');
          fetchStatsAndBranches();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.bg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingHorizontal: 6,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  topBar: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroAvatarWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroHeaderSpacer: {
    width: 42,
    height: 42,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroStatusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStatusText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroRefreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  topBarIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarIconText: {
    fontSize: 20,
    color: colors.accent,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  topBarRight: {
    gap: 14,
  },
  branchSelector: {
    marginBottom: 16,
  },
  branchSelectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 10,
  },
  branchSelectorField: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchSelectorValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  branchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  branchChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  branchChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  viewButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  viewBtnTextActive: {
    color: '#fff',
  },
  viewAllTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
  },
  quickAccessHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickAccessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  quickAccessTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  quickAccessPanel: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 20,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  loader: {
    marginVertical: 20,
  },
  profileSectionCard: {
    marginBottom: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileSectionContent: {
    flex: 1,
    gap: 8,
  },
  profileDetailRow: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  profileDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileSectionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  profileSectionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 0,
    marginBottom: 28,
  },
  kpiCard: {
    flex: 1,
    minWidth: '32%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  kpiBadgeUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  kpiBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  kpiSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  distributionCard: {
    flex: 1,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  snapshotCard: {
    flex: 1,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  barItem: {
    marginBottom: 24,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  barValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  barTrack: {
    height: 12,
    backgroundColor: colors.bg,
    borderRadius: 100,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 100,
  },
  donutContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  donut: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  donutTotal: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  donutLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  branchSnapshot: {
    gap: 16,
  },
  snapshotItem: {
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  snapshotValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  snapshotItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotDate: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chartCard: {
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartEmpty: {
    padding: 48,
    alignItems: 'center',
  },
  chartEmptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
    paddingVertical: 28,
  },
  chartBarGroup: {
    alignItems: 'center',
    width: 64,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 160,
  },
  chartBarPassed: {
    width: 20,
    backgroundColor: colors.success,
    borderRadius: 4,
    minHeight: 2,
  },
  chartBarFailed: {
    width: 20,
    backgroundColor: colors.error,
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  chartPassRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  chartStatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  chartStatItem: {
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  chartStatValue: {
    fontSize: 12,
    color: colors.textMuted,
  },
  overviewCard: {
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  statusChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusChipHealthy: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusChipAttention: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusChipInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colBranch: { width: '15%' },
  colHm: { width: '20%' },
  colStatus: { width: '12%' },
  colTeachers: { width: '8%' },
  colStudents: { width: '8%' },
  colClasses: { width: '8%' },
  colSections: { width: '8%' },
  colAction: { width: '10%' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  branchNameCell: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  branchIdCell: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  hmNameCell: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hmIdCell: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hmEmailCell: {
    fontSize: 12,
    color: colors.textMuted,
  },
  numberCell: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  viewBranchBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  branchContainersCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  branchContainersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  branchContainersActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    minWidth: 220,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    fontWeight: '600',
  },
  viewAllBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewAllBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  showLessBtn: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showLessBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  branchCardsGrid: {
    gap: 16,
  },
  branchCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  branchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  branchName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  branchId: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  branchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  branchHm: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  branchEmail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  branchStats: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  branchStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  branchPendingLeaves: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  branchViewBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  branchCardPagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 24,
  },
  paginationInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  pageBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  branchesViewCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  branchesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  addBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBranchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  branchSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 20,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    fontWeight: '600',
  },
  branchesListHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  branchesHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colBranchId: { width: '10%' },
  colBranchName: { width: '15%' },
  colEmpId: { width: '12%' },
  colHmName: { width: '12%' },
  colHmEmail: { width: '18%' },
  colBranchStatus: { width: '10%' },
  colCreated: { width: '12%' },
  colActions: { width: '11%' },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchRowId: {
    width: '10%',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '800',
    color: colors.accent,
  },
  branchRowCell: {
    width: '15%',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  branchRowDate: {
    width: '12%',
    fontSize: 12,
    color: colors.textMuted,
  },
  branchRowActions: {
    width: '11%',
    flexDirection: 'row',
    gap: 8,
  },
  editRowBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  deleteRowBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  viewRowBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  editInput: {
    width: '15%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  editStatusContainer: {
    width: '10%',
    flexDirection: 'row',
    gap: 6,
  },
  editStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editStatusBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  editStatusTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  healthBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.2,
    marginTop: 4,
  },
  healthText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  headerStandard: {
    backgroundColor: '#071f45',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalBody: {
    padding: 20,
  },
  modalPlaceholder: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalNote: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

});
