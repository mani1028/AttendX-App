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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';
import Icon from '@react-native-vector-icons/feather';
import AppText from '../../components/common/AppText';
import { RootStackParamList } from '../../navigation/AppNavigator';

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

// KPI Card Component
const KpiCard: React.FC<{
  title: string;
  value: number;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeUp: boolean;
  onPress?: () => void;
}> = ({ title, value, sub, icon, iconBg, iconColor, badge, badgeUp, onPress }) => (
  <TouchableOpacity style={styles.kpiCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.kpiHeader}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
        <AppText style={[styles.kpiIconText, { color: iconColor }]}>{icon}</AppText>
      </View>
      <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
        <AppText style={styles.kpiBadgeText}>{badgeUp ? '▲' : '▼'} {badge}</AppText>
      </View>
    </View>
    <AppText style={styles.kpiTitle}>{title}</AppText>
    <AppText style={styles.kpiValue}>{value}</AppText>
    <AppText style={styles.kpiSub}>{sub}</AppText>
  </TouchableOpacity>
);

// Branch Card Component
const BranchCard: React.FC<{ branch: Branch; onPress: () => void }> = ({ branch, onPress }) => {
  const health = getHealthMeta(branch.health_status);
  return (
    <TouchableOpacity style={styles.branchCard} onPress={onPress}>
      <View style={styles.branchCardHeader}>
        <View>
          <AppText style={styles.branchName}>{branch.branch_name}</AppText>
          <AppText style={styles.branchId}>ID: {branch.branch_id}</AppText>
        </View>
        <View>
          <StatusBadge status={branch.branch_status} />
          <HealthBadge status={branch.health_status} />
        </View>
      </View>

      <AppText style={styles.branchHm}>👨‍🏫 HM: {branch.hm_name || 'No HM'}</AppText>
      <AppText style={styles.branchEmail}>✉️ {branch.hm_email || 'No email'}</AppText>

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
        <AppText style={styles.branchPendingLeaves}>📋 Pending Leaves: {branch.pending_leave_requests || 0}</AppText>
        <AppText style={styles.branchViewBtn}>View Details →</AppText>
      </View>
    </TouchableOpacity>
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
            <AppText style={styles.saveBtnText}>💾</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <AppText style={styles.cancelBtnText}>✕</AppText>
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
        <TouchableOpacity style={styles.editRowBtn} onPress={onEdit}>
          <AppText style={styles.editRowBtnText}>✏️ Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteRowBtn} onPress={onDelete}>
          <AppText style={styles.deleteRowBtnText}>🗑️ Del</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewRowBtn} onPress={onView}>
          <AppText style={styles.viewRowBtnText}>👁️ View</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Pass/Fail Bar Chart Component
const PassFailChart: React.FC<{ data: MarksSummary[]; isAllBranches: boolean }> = ({ data, isAllBranches }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <AppText style={styles.chartEmptyText}>No marks data available. Exam results will appear here once marks are entered.</AppText>
      </View>
    );
  }

  const maxTotal = Math.max(...data.map(d => (d.passed || 0) + (d.failed || 0)), 1);
  const maxHeight = 150;

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
            const passedHeight = ((item.passed || 0) / maxTotal) * maxHeight;
            const failedHeight = ((item.failed || 0) / maxTotal) * maxHeight;
            const total = (item.passed || 0) + (item.failed || 0);
            const passRate = total > 0 ? Math.round((item.passed / total) * 100) : 0;

            return (
              <View key={idx} style={styles.chartBarGroup}>
                <View style={styles.chartBars}>
                  <View style={[styles.chartBarPassed, { height: Math.max(passedHeight, 2) }]} />
                  <View style={[styles.chartBarFailed, { height: Math.max(failedHeight, 2) }]} />
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
              <AppText style={styles.modalCloseText}>✕</AppText>
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();
  const route = useRoute();
  const overviewRef = useRef<ScrollView>(null);

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
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>('');
  const [branchCardsPage, setBranchCardsPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [marksSummary, setMarksSummary] = useState<MarksSummary[]>([]);
  const [marksSummaryLoading, setMarksSummaryLoading] = useState<boolean>(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Branch>>({});
  
  // Search for branches view
  const [branchViewSearchTerm, setBranchViewSearchTerm] = useState<string>('');
  const [branchViewPage, setBranchViewPage] = useState<number>(1);

  const ROWS_PER_PAGE = 7;
  const BRANCH_CARDS_PER_PAGE = 6;

  // Load school code
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      setSchoolCode(code);
    };
    load();
  }, []);

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
        setStats({
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
        });
        setBranches(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  // Fetch marks summary
  const fetchMarksSummary = useCallback(async () => {
    if (!schoolCode) return;
    setMarksSummaryLoading(true);
    try {
      const params = selectedBranchId !== 'ALL' ? `?branch_id=${encodeURIComponent(selectedBranchId)}` : '';
      const res = await API.get(`/principal/dashboard/marks-summary${params}`, {
        headers: { 'x-school-code': schoolCode },
      });
      setMarksSummary(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      console.error('Failed to fetch marks summary:', err);
      setMarksSummary([]);
    } finally {
      setMarksSummaryLoading(false);
    }
  }, [schoolCode, selectedBranchId]);

  // Initial fetch
  useEffect(() => {
    if (schoolCode) {
      fetchStatsAndBranches();
    }
  }, [schoolCode]);

  // Fetch marks summary when view changes
  useEffect(() => {
    if (view === 'dashboard') {
      fetchMarksSummary();
    }
  }, [selectedBranchId, view, fetchMarksSummary]);

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
      Alert.alert('Success', 'Branch updated successfully');
      cancelEdit();
      fetchStatsAndBranches();
    } catch (err) {
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
      <ScrollView
        ref={overviewRef}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Principal'}!</AppText>
            <AppText style={styles.welcomeSub}>Complete school-wide branch health and operational status.</AppText>
          </View>
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.topBarIcon}>
              <AppText style={styles.topBarIconText}>
                {view === 'dashboard' ? '⊞' : view === 'branches' ? '⊟' : '+'}
              </AppText>
            </View>
            <View>
              <AppText style={styles.title}>
                {view === 'dashboard'
                  ? 'Main Principal Dashboard'
                  : view === 'branches'
                    ? 'Branches & HMs'
                    : 'Register New HM'}
              </AppText>
              <AppText style={styles.subtitle}>Manage all data and complete sub-branch status</AppText>
            </View>
          </View>

          <View style={styles.topBarRight}>
            <View style={styles.branchSelector}>
              <AppText style={styles.branchSelectorLabel}>Branch:</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.branchChips}>
                  <TouchableOpacity
                    style={[styles.branchChip, selectedBranchId === 'ALL' && styles.branchChipActive]}
                    onPress={() => setSelectedBranchId('ALL')}
                  >
                    <AppText style={[styles.branchChipText, selectedBranchId === 'ALL' && styles.branchChipTextActive]}>
                      All Branches
                    </AppText>
                  </TouchableOpacity>
                  {branches.map(b => (
                    <TouchableOpacity
                      key={b.branch_id}
                      style={[styles.branchChip, selectedBranchId === b.branch_id && styles.branchChipActive]}
                      onPress={() => setSelectedBranchId(b.branch_id)}
                    >
                      <AppText style={[styles.branchChipText, selectedBranchId === b.branch_id && styles.branchChipTextActive]}>
                        {b.branch_id}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.viewButtons}>
              {(['dashboard', 'branches', 'addhm'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.viewBtn, view === key && styles.viewBtnActive]}
                  onPress={() => setView(key)}
                >
                  <AppText style={[styles.viewBtnText, view === key && styles.viewBtnTextActive]}>
                    {key === 'dashboard' ? '⊞ Dashboard' : key === 'branches' ? '⊟ Branches' : '+ Add Branch'}
                  </AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <AppText style={styles.refreshBtnText}>↻ Refresh</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <KpiCard
                title={selectedBranchId === 'ALL' ? 'Total Branches' : 'Selected Branch'}
                value={displayedStats.branches}
                sub={selectedBranchId === 'ALL' ? 'All sub-branches' : `${selectedBranch?.branch_name || 'Branch'} snapshot`}
                icon="🏫"
                iconBg="rgba(59, 130, 246, 0.1)"
                iconColor="#3b82f6"
                badge="Live"
                badgeUp={true}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Total Teachers"
                value={displayedStats.teachers}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Teachers in ${selectedBranchId}`}
                icon="👨‍🏫"
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor="#10b981"
                badge="Live"
                badgeUp={true}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Total Students"
                value={displayedStats.students}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Students in ${selectedBranchId}`}
                icon="👨‍🎓"
                iconBg="rgba(249, 115, 22, 0.1)"
                iconColor="#f97316"
                badge="Live"
                badgeUp={true}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Active Branches"
                value={selectedBranchId === 'ALL' ? stats.activeBranches : (selectedBranch?.branch_status === 'ACTIVE' ? 1 : 0)}
                sub={selectedBranchId === 'ALL' ? 'Operational branches' : 'Branch active status'}
                icon="🏫"
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor="#10b981"
                badge="Status"
                badgeUp={true}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Inactive Branches"
                value={selectedBranchId === 'ALL' ? stats.inactiveBranches : (selectedBranch?.branch_status === 'ACTIVE' ? 0 : 1)}
                sub={selectedBranchId === 'ALL' ? 'Need attention' : 'Branch inactive status'}
                icon="🏫"
                iconBg="rgba(239, 68, 68, 0.1)"
                iconColor="#dc2626"
                badge="Watch"
                badgeUp={false}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Pending Leaves"
                value={displayedStats.pendingLeaves}
                sub={selectedBranchId === 'ALL' ? 'Across all branches' : `Pending in ${selectedBranchId}`}
                icon="👨‍🏫"
                iconBg="rgba(234, 88, 12, 0.1)"
                iconColor="#ea580c"
                badge="Pending"
                badgeUp={false}
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
                    <AppText style={styles.pageBtnText}>«</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <AppText style={styles.pageBtnText}>‹</AppText>
                  </TouchableOpacity>
                  <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <AppText style={styles.pageBtnText}>›</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <AppText style={styles.pageBtnText}>»</AppText>
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
                          <AppText style={styles.pageBtnText}>«</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.max(1, p - 1))}
                          disabled={branchCardsPage === 1}
                        >
                          <AppText style={styles.pageBtnText}>‹</AppText>
                        </TouchableOpacity>
                        <AppText style={styles.pageInfo}>Page {branchCardsPage} of {branchCardsTotalPages}</AppText>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.min(branchCardsTotalPages, p + 1))}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <AppText style={styles.pageBtnText}>›</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(branchCardsTotalPages)}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <AppText style={styles.pageBtnText}>»</AppText>
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
                  <AppText style={styles.pageBtnText}>«</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <AppText style={styles.pageBtnText}>‹</AppText>
                </TouchableOpacity>
                <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <AppText style={styles.pageBtnText}>›</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <AppText style={styles.pageBtnText}>»</AppText>
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
    padding: 20,
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
  topBar: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  topBarIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  topBarRight: {
    gap: 12,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  branchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  branchChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  branchChipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  branchChipTextActive: {
    color: '#fff',
  },
  viewButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
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
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  loader: {
    marginVertical: 20,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  kpiIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconText: {
    fontSize: 19,
  },
  kpiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  kpiBadgeUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  kpiBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  kpiSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },
  distributionCard: {
    flex: 1,
    padding: 20,
  },
  snapshotCard: {
    flex: 1,
    padding: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  barItem: {
    marginBottom: 18,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
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
    marginVertical: 16,
  },
  donut: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  donutLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  branchSnapshot: {
    gap: 12,
  },
  snapshotItem: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  snapshotItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chartCard: {
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  chartEmptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 20,
    paddingVertical: 20,
  },
  chartBarGroup: {
    alignItems: 'center',
    width: 60,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 150,
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
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  chartPassRate: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartStatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chartStatItem: {
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chartStatValue: {
    fontSize: 11,
    color: colors.textMuted,
  },
  overviewCard: {
    padding: 20,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  overviewSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusChips: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipHealthy: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusChipAttention: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusChipInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    justifyContent: 'center',
  },
  branchNameCell: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchIdCell: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hmNameCell: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hmIdCell: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hmEmailCell: {
    fontSize: 11,
    color: colors.textMuted,
  },
  numberCell: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBranchBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  branchContainersCard: {
    padding: 20,
  },
  branchContainersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  branchContainersActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minWidth: 180,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  viewAllBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewAllBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  showLessBtn: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showLessBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  branchCardsGrid: {
    gap: 16,
  },
  branchCard: {
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchId: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchHm: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  branchEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  branchStats: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
  },
  branchStat: {
    alignItems: 'center',
  },
  branchStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  branchStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  branchPendingLeaves: {
    fontSize: 12,
    color: colors.textMuted,
  },
  branchViewBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  branchCardPagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  paginationInfo: {
    fontSize: 12,
    color: colors.textMuted,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  pageBtn: {
    minWidth: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pageBtnDisabled: {
    opacity: 0.36,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pageInfo: {
    fontSize: 13,
    color: colors.textMuted,
  },
  branchesViewCard: {
    padding: 20,
  },
  branchesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  addBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBranchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  branchSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  branchesListHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  branchesHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchRowId: {
    width: '10%',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700',
    color: colors.accent,
  },
  branchRowCell: {
    width: '15%',
    fontSize: 13,
    color: colors.textPrimary,
  },
  branchRowDate: {
    width: '12%',
    fontSize: 11,
    color: colors.textMuted,
  },
  branchRowActions: {
    width: '11%',
    flexDirection: 'row',
    gap: 6,
  },
  editRowBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editRowBtnText: {
    fontSize: 11,
    color: colors.accent,
  },
  deleteRowBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteRowBtnText: {
    fontSize: 11,
    color: colors.error,
  },
  viewRowBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewRowBtnText: {
    fontSize: 11,
    color: colors.success,
  },
  editInput: {
    width: '15%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },
  editStatusContainer: {
    width: '10%',
    flexDirection: 'row',
    gap: 4,
  },
  editStatusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    fontWeight: '600',
    color: colors.textMuted,
  },
  editStatusTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  healthText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});