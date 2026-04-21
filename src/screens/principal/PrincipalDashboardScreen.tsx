import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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
  if (key === 'HEALTHY') return { label: 'Healthy', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
  if (key === 'INACTIVE') return { label: 'Inactive', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (key === 'HM_MISSING') return { label: 'HM Missing', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  if (key === 'NO_CLASSES') return { label: 'No Classes', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  if (key === 'NO_TEACHERS') return { label: 'No Teachers', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  if (key === 'NO_STUDENTS') return { label: 'No Students', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  return { label: 'Needs Review', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' };
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </Text>
    </View>
  );
};

// Health Badge Component
const HealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = getHealthMeta(status);
  return (
    <View style={[styles.healthBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[styles.healthText, { color: meta.color }]}>{meta.label}</Text>
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
        <Text style={[styles.kpiIconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
        <Text style={styles.kpiBadgeText}>{badgeUp ? '▲' : '▼'} {badge}</Text>
      </View>
    </View>
    <Text style={styles.kpiTitle}>{title}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiSub}>{sub}</Text>
  </TouchableOpacity>
);

// Branch Card Component
const BranchCard: React.FC<{ branch: Branch; onPress: () => void }> = ({ branch, onPress }) => {
  const health = getHealthMeta(branch.health_status);
  return (
    <TouchableOpacity style={styles.branchCard} onPress={onPress}>
      <View style={styles.branchCardHeader}>
        <View>
          <Text style={styles.branchName}>{branch.branch_name}</Text>
          <Text style={styles.branchId}>ID: {branch.branch_id}</Text>
        </View>
        <View>
          <StatusBadge status={branch.branch_status} />
          <HealthBadge status={branch.health_status} />
        </View>
      </View>

      <Text style={styles.branchHm}>👨‍🏫 HM: {branch.hm_name || 'No HM'}</Text>
      <Text style={styles.branchEmail}>✉️ {branch.hm_email || 'No email'}</Text>

      <View style={styles.branchStats}>
        <View style={styles.branchStat}>
          <Text style={styles.branchStatValue}>{branch.teachers_count || 0}</Text>
          <Text style={styles.branchStatLabel}>Teachers</Text>
        </View>
        <View style={styles.branchStat}>
          <Text style={styles.branchStatValue}>{branch.students_count || 0}</Text>
          <Text style={styles.branchStatLabel}>Students</Text>
        </View>
        <View style={styles.branchStat}>
          <Text style={styles.branchStatValue}>{branch.classes_count || 0}</Text>
          <Text style={styles.branchStatLabel}>Classes</Text>
        </View>
        <View style={styles.branchStat}>
          <Text style={styles.branchStatValue}>{branch.sections_count || 0}</Text>
          <Text style={styles.branchStatLabel}>Sections</Text>
        </View>
      </View>

      <View style={styles.branchFooter}>
        <Text style={styles.branchPendingLeaves}>📋 Pending Leaves: {branch.pending_leave_requests || 0}</Text>
        <Text style={styles.branchViewBtn}>View Details →</Text>
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
        <Text style={styles.branchRowId}>{branch.branch_id}</Text>
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
              <Text style={[styles.editStatusText, editData.branch_status === opt && styles.editStatusTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.branchRowActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>💾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.branchRow}>
      <Text style={styles.branchRowId}>{branch.branch_id}</Text>
      <Text style={styles.branchRowCell}>{branch.branch_name}</Text>
      <Text style={styles.branchRowCell}>{branch.hm_employee_id || '-'}</Text>
      <Text style={styles.branchRowCell}>{branch.hm_name || '-'}</Text>
      <Text style={styles.branchRowCell}>{branch.hm_email || '-'}</Text>
      <StatusBadge status={branch.branch_status} />
      <Text style={styles.branchRowDate}>{formatDate(branch.creation_date)}</Text>
      <View style={styles.branchRowActions}>
        <TouchableOpacity style={styles.editRowBtn} onPress={onEdit}>
          <Text style={styles.editRowBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteRowBtn} onPress={onDelete}>
          <Text style={styles.deleteRowBtnText}>🗑️ Del</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewRowBtn} onPress={onView}>
          <Text style={styles.viewRowBtnText}>👁️ View</Text>
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
        <Text style={styles.chartEmptyText}>No marks data available. Exam results will appear here once marks are entered.</Text>
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
          <Text style={styles.legendText}>Passed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Failed</Text>
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
                <Text style={styles.chartLabel}>
                  {isAllBranches 
                    ? (item.label.length > 10 ? item.label.slice(0, 8) + '…' : item.label)
                    : item.label}
                </Text>
                <Text style={styles.chartPassRate}>{passRate}% pass</Text>
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
              <Text style={styles.chartStatLabel}>{item.label}:</Text>
              <Text style={styles.chartStatValue}>{item.passed} ✓ / {item.failed} ✗ ({passRate}%)</Text>
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
            <Text style={styles.modalTitle}>Register New HM</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalPlaceholder}>HM Registration Form would go here</Text>
            <Text style={styles.modalNote}>This is a placeholder. The full HM registration form would be implemented here.</Text>
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
  const navigation = useNavigation();
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
      navigation.navigate('BranchDetails' as never, {
        branchId: selectedBranch?.branch_id,
        branchName: selectedBranch?.branch_name,
        hmName: selectedBranch?.hm_name,
        hmEmail: selectedBranch?.hm_email,
        branchStatus: selectedBranch?.branch_status,
      } as never);
    }
  };

  const handleViewBranch = (branch: Branch) => {
    navigation.navigate('BranchDetails' as never, {
      branchId: branch.branch_id,
      branchName: branch.branch_name,
      hmName: branch.hm_name,
      hmEmail: branch.hm_email,
      branchStatus: branch.branch_status,
    } as never);
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
        <Text style={styles.errorTitle}>School Code missing</Text>
        <Text style={styles.errorText}>Please login again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={overviewRef}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.topBarIcon}>
              <Text style={styles.topBarIconText}>
                {view === 'dashboard' ? '⊞' : view === 'branches' ? '⊟' : '+'}
              </Text>
            </View>
            <View>
              <Text style={styles.title}>
                {view === 'dashboard'
                  ? 'Main Principal Dashboard'
                  : view === 'branches'
                    ? 'Branches & HMs'
                    : 'Register New HM'}
              </Text>
              <Text style={styles.subtitle}>Manage all data and complete sub-branch status</Text>
            </View>
          </View>

          <View style={styles.topBarRight}>
            <View style={styles.branchSelector}>
              <Text style={styles.branchSelectorLabel}>Branch:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.branchChips}>
                  <TouchableOpacity
                    style={[styles.branchChip, selectedBranchId === 'ALL' && styles.branchChipActive]}
                    onPress={() => setSelectedBranchId('ALL')}
                  >
                    <Text style={[styles.branchChipText, selectedBranchId === 'ALL' && styles.branchChipTextActive]}>
                      All Branches
                    </Text>
                  </TouchableOpacity>
                  {branches.map(b => (
                    <TouchableOpacity
                      key={b.branch_id}
                      style={[styles.branchChip, selectedBranchId === b.branch_id && styles.branchChipActive]}
                      onPress={() => setSelectedBranchId(b.branch_id)}
                    >
                      <Text style={[styles.branchChipText, selectedBranchId === b.branch_id && styles.branchChipTextActive]}>
                        {b.branch_id}
                      </Text>
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
                  <Text style={[styles.viewBtnText, view === key && styles.viewBtnTextActive]}>
                    {key === 'dashboard' ? '⊞ Dashboard' : key === 'branches' ? '⊟ Branches' : '+ Add Branch'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <Text style={styles.refreshBtnText}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />}

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
                iconBg="#eff6ff"
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
                iconBg="#f0fdf4"
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
                iconBg="#fff7ed"
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
                iconBg="#ecfdf5"
                iconColor="#059669"
                badge="Status"
                badgeUp={true}
                onPress={handleKpiClick}
              />
              <KpiCard
                title="Inactive Branches"
                value={selectedBranchId === 'ALL' ? stats.inactiveBranches : (selectedBranch?.branch_status === 'ACTIVE' ? 0 : 1)}
                sub={selectedBranchId === 'ALL' ? 'Need attention' : 'Branch inactive status'}
                icon="🏫"
                iconBg="#fef2f2"
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
                iconBg="#fff7ed"
                iconColor="#ea580c"
                badge="Pending"
                badgeUp={false}
                onPress={handleKpiClick}
              />
            </View>

            {/* Distribution & Snapshot */}
            <View style={styles.twoColumnGrid}>
              <AppCard style={styles.distributionCard}>
                <Text style={styles.cardTitle}>Distribution</Text>
                {bars.map(bar => (
                  <View key={bar.label} style={styles.barItem}>
                    <View style={styles.barHeader}>
                      <Text style={styles.barLabel}>{bar.label}</Text>
                      <Text style={[styles.barValue, { color: bar.color }]}>{bar.value}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round((bar.value / maxVal) * 100)}%`, backgroundColor: bar.color }]} />
                    </View>
                  </View>
                ))}
              </AppCard>

              <AppCard style={styles.snapshotCard}>
                <Text style={styles.cardTitle}>
                  {selectedBranchId === 'ALL' ? 'School Snapshot' : 'Branch Snapshot'}
                </Text>
                {selectedBranchId === 'ALL' ? (
                  <>
                    <View style={styles.donutContainer}>
                      <View style={styles.donut}>
                        <Text style={styles.donutTotal}>{stats.branches + stats.teachers + stats.students}</Text>
                        <Text style={styles.donutLabel}>Total</Text>
                      </View>
                    </View>
                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.legendText}>Branches</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.legendText}>Teachers</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                        <Text style={styles.legendText}>Students</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.branchSnapshot}>
                    <View style={styles.snapshotItem}>
                      <Text style={styles.snapshotLabel}>Branch ID</Text>
                      <Text style={styles.snapshotValue}>{selectedBranch?.branch_id || '-'}</Text>
                    </View>
                    <View style={styles.snapshotItem}>
                      <Text style={styles.snapshotLabel}>Branch Name</Text>
                      <Text style={styles.snapshotValue}>{selectedBranch?.branch_name || '-'}</Text>
                    </View>
                    <View style={styles.snapshotItem}>
                      <Text style={styles.snapshotLabel}>HM Name</Text>
                      <Text style={styles.snapshotValue}>{selectedBranch?.hm_name || '-'}</Text>
                    </View>
                    <View style={styles.snapshotItem}>
                      <Text style={styles.snapshotLabel}>HM Email</Text>
                      <Text style={styles.snapshotValue}>{selectedBranch?.hm_email || '-'}</Text>
                    </View>
                    <View style={styles.snapshotItemRow}>
                      <StatusBadge status={selectedBranch?.branch_status || '-'} />
                      <Text style={styles.snapshotDate}>Created: {formatDate(selectedBranch?.creation_date || '')}</Text>
                    </View>
                  </View>
                )}
              </AppCard>
            </View>

            {/* Pass/Fail Chart */}
            <AppCard style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>
                  {selectedBranchId === 'ALL'
                    ? 'Student Pass / Fail Overview — All Branches'
                    : `Student Pass / Fail — ${selectedBranch?.branch_name || selectedBranchId} (by Class)`}
                </Text>
                {marksSummaryLoading && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>
              <PassFailChart data={marksSummary} isAllBranches={selectedBranchId === 'ALL'} />
            </AppCard>

            {/* Main Principal Overview */}
            <AppCard style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View>
                  <Text style={styles.cardTitle}>Main Principal Overview</Text>
                  <Text style={styles.overviewSubtitle}>Complete school-wide branch health and operational status</Text>
                </View>
                <View style={styles.statusChips}>
                  <View style={[styles.statusChip, styles.statusChipHealthy]}>
                    <Text style={styles.statusChipText}>Healthy: {statusSummary.healthy}</Text>
                  </View>
                  <View style={[styles.statusChip, styles.statusChipAttention]}>
                    <Text style={styles.statusChipText}>Needs Attention: {statusSummary.needsAttention}</Text>
                  </View>
                  <View style={[styles.statusChip, styles.statusChipInactive]}>
                    <Text style={styles.statusChipText}>Inactive: {statusSummary.inactive}</Text>
                  </View>
                </View>
              </View>

              {/* Branch Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colBranch]}>Branch</Text>
                <Text style={[styles.tableHeaderText, styles.colHm]}>HM</Text>
                <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderText, styles.colTeachers]}>Teachers</Text>
                <Text style={[styles.tableHeaderText, styles.colStudents]}>Students</Text>
                <Text style={[styles.tableHeaderText, styles.colClasses]}>Classes</Text>
                <Text style={[styles.tableHeaderText, styles.colSections]}>Sections</Text>
                <Text style={[styles.tableHeaderText, styles.colAction]}>Action</Text>
              </View>

              {paginatedBranches.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No branches found</Text>
                </View>
              ) : (
                paginatedBranches.map(branch => (
                  <View key={branch.branch_id} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.colBranch]}>
                      <Text style={styles.branchNameCell}>{branch.branch_name || '—'}</Text>
                      <Text style={styles.branchIdCell}>ID: {branch.branch_id}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colHm]}>
                      <Text style={styles.hmNameCell}>{branch.hm_name || '—'}</Text>
                      <Text style={styles.hmIdCell}>{branch.hm_employee_id || '—'}</Text>
                      <Text style={styles.hmEmailCell}>{branch.hm_email || '—'}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colStatus]}>
                      <StatusBadge status={branch.branch_status} />
                      <HealthBadge status={branch.health_status} />
                    </View>
                    <View style={[styles.tableCell, styles.colTeachers]}>
                      <Text style={styles.numberCell}>{branch.teachers_count || 0}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colStudents]}>
                      <Text style={styles.numberCell}>{branch.students_count || 0}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colClasses]}>
                      <Text style={styles.numberCell}>{branch.classes_count || 0}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colSections]}>
                      <Text style={styles.numberCell}>{branch.sections_count || 0}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.colAction]}>
                      <TouchableOpacity
                        style={styles.viewBranchBtn}
                        onPress={() => handleViewBranch(branch)}
                      >
                        <Text style={styles.viewBranchBtnText}>View</Text>
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
                    <Text style={styles.pageBtnText}>«</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <Text style={styles.pageBtnText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={styles.pageBtnText}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={styles.pageBtnText}>»</Text>
                  </TouchableOpacity>
                </View>
              )}
            </AppCard>

            {/* Branch Containers Section */}
            <AppCard style={styles.branchContainersCard}>
              <View style={styles.branchContainersHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {showAllBranches ? 'All Branch Containers' : 'Branch Containers'}
                  </Text>
                  <Text style={styles.overviewSubtitle}>
                    {showAllBranches 
                      ? `Showing all ${filteredBranches.length} branches` 
                      : `Showing ${Math.min(BRANCH_CARDS_PER_PAGE, filteredBranches.length)} of ${filteredBranches.length} branches`}
                  </Text>
                </View>
                <View style={styles.branchContainersActions}>
                  {showAllBranches && (
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search branches..."
                      placeholderTextColor="#94a3b8"
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
                      <Text style={styles.viewAllBtnText}>View All ({filteredBranches.length})</Text>
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
                      <Text style={styles.showLessBtnText}>Show Less</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {branchCards.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No branches found</Text>
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
                      <Text style={styles.paginationInfo}>
                        Showing {(branchCardsPage - 1) * BRANCH_CARDS_PER_PAGE + 1}–
                        {Math.min(branchCardsPage * BRANCH_CARDS_PER_PAGE, filteredBranches.length)} of {filteredBranches.length}
                      </Text>
                      <View style={styles.paginationButtons}>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(1)}
                          disabled={branchCardsPage === 1}
                        >
                          <Text style={styles.pageBtnText}>«</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === 1 && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.max(1, p - 1))}
                          disabled={branchCardsPage === 1}
                        >
                          <Text style={styles.pageBtnText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>Page {branchCardsPage} of {branchCardsTotalPages}</Text>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(p => Math.min(branchCardsTotalPages, p + 1))}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <Text style={styles.pageBtnText}>›</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pageBtn, branchCardsPage === branchCardsTotalPages && styles.pageBtnDisabled]}
                          onPress={() => setBranchCardsPage(branchCardsTotalPages)}
                          disabled={branchCardsPage === branchCardsTotalPages}
                        >
                          <Text style={styles.pageBtnText}>»</Text>
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
                <Text style={styles.cardTitle}>
                  {selectedBranchId === 'ALL' ? 'Branch List' : `Branch: ${selectedBranchId}`}
                </Text>
                <Text style={styles.overviewSubtitle}>
                  {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} registered
                </Text>
              </View>
              <TouchableOpacity style={styles.addBranchBtn} onPress={() => setView('addhm')}>
                <Text style={styles.addBranchBtnText}>+ Add Branch</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={styles.branchSearchInput}
              placeholder="Search by branch name, ID, or HM name..."
              placeholderTextColor="#94a3b8"
              value={branchViewSearchTerm}
              onChangeText={(text) => {
                setBranchViewSearchTerm(text);
                setBranchViewPage(1);
              }}
            />

            {/* Branch List Header */}
            <View style={styles.branchesListHeader}>
              <Text style={[styles.branchesHeaderText, styles.colBranchId]}>Branch ID</Text>
              <Text style={[styles.branchesHeaderText, styles.colBranchName]}>Branch Name</Text>
              <Text style={[styles.branchesHeaderText, styles.colEmpId]}>HM Emp ID</Text>
              <Text style={[styles.branchesHeaderText, styles.colHmName]}>HM Name</Text>
              <Text style={[styles.branchesHeaderText, styles.colHmEmail]}>HM Email</Text>
              <Text style={[styles.branchesHeaderText, styles.colBranchStatus]}>Status</Text>
              <Text style={[styles.branchesHeaderText, styles.colCreated]}>Created</Text>
              <Text style={[styles.branchesHeaderText, styles.colActions]}>Actions</Text>
            </View>

            {paginatedBranches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No branches found</Text>
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
                  <Text style={styles.pageBtnText}>«</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.pageBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={styles.pageBtnText}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <Text style={styles.pageBtnText}>»</Text>
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
    backgroundColor: '#f8fafc',
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
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
  },
  topBar: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarIconText: {
    fontSize: 20,
    color: '#3b82f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  branchChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  branchChipText: {
    fontSize: 12,
    color: '#64748b',
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
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  viewBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  viewBtnTextActive: {
    color: '#fff',
  },
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8edf3',
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
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  kpiBadgeDown: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  kpiSub: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#1e293b',
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
    color: '#475569',
  },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
  },
  donutLabel: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#64748b',
  },
  branchSnapshot: {
    gap: 12,
  },
  snapshotItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  snapshotLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  snapshotItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  snapshotDate: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#94a3b8',
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
    backgroundColor: '#10b981',
    borderRadius: 4,
    minHeight: 2,
  },
  chartBarFailed: {
    width: 20,
    backgroundColor: '#ef4444',
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  chartPassRate: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  chartStatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chartStatItem: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chartStatValue: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#94a3b8',
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusChipAttention: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  statusChipInactive: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f3f6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
    borderBottomColor: '#e2e8f0',
  },
  tableCell: {
    justifyContent: 'center',
  },
  branchNameCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  branchIdCell: {
    fontSize: 11,
    color: '#64748b',
  },
  hmNameCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  hmIdCell: {
    fontSize: 11,
    color: '#64748b',
  },
  hmEmailCell: {
    fontSize: 11,
    color: '#94a3b8',
  },
  numberCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  viewBranchBtn: {
    backgroundColor: '#3b82f6',
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
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minWidth: 180,
  },
  viewAllBtn: {
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  showLessBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  branchCardsGrid: {
    gap: 16,
  },
  branchCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#1e293b',
  },
  branchId: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  branchHm: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  branchEmail: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#0f172a',
  },
  branchStatLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  branchPendingLeaves: {
    fontSize: 12,
    color: '#64748b',
  },
  branchViewBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
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
    color: '#64748b',
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
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
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
    color: '#64748b',
  },
  pageInfo: {
    fontSize: 13,
    color: '#64748b',
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
    backgroundColor: '#3b82f6',
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
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  branchesListHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f3f6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  branchesHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
    borderBottomColor: '#e2e8f0',
  },
  branchRowId: {
    width: '10%',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700',
    color: '#3b82f6',
  },
  branchRowCell: {
    width: '15%',
    fontSize: 13,
    color: '#1e293b',
  },
  branchRowDate: {
    width: '12%',
    fontSize: 11,
    color: '#94a3b8',
  },
  branchRowActions: {
    width: '11%',
    flexDirection: 'row',
    gap: 6,
  },
  editRowBtn: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editRowBtnText: {
    fontSize: 11,
    color: '#2563eb',
  },
  deleteRowBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteRowBtnText: {
    fontSize: 11,
    color: '#dc2626',
  },
  viewRowBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewRowBtnText: {
    fontSize: 11,
    color: '#10b981',
  },
  editInput: {
    width: '15%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editStatusBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  editStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  editStatusTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: '#fee2e2',
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
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803d',
  },
  statusTextInactive: {
    color: '#b91c1c',
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
    color: '#94a3b8',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 20,
  },
  modalPlaceholder: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 13,
    color: '#64748b',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});