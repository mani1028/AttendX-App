import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  User,
  Calendar,
  BookOpen,
  DollarSign,
  Award,
  TrendingUp,
  Clock,
  FileText,
  Phone,
  Mail,
} from 'lucide-react-native';
import { Theme, colors } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import AvatarBubble from '../../components/common/AvatarBubble';

type TabKey = 'attendance' | 'academics' | 'fees' | 'health';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'attendance', label: 'Attendance', icon: <Calendar size={14} /> },
  { key: 'academics', label: 'Academics', icon: <BookOpen size={14} /> },
  { key: 'fees', label: 'Fees', icon: <DollarSign size={14} /> },
  { key: 'health', label: 'Health', icon: <Award size={14} /> },
];

const MOCK_STUDENT = {
  id: 'STU-042',
  name: 'Aarav Mehta',
  class: 'Class 8 - A',
  section: 'Section A',
  rollNo: '42',
  fatherName: 'Rajesh Mehta',
  phone: '+91 98765 43210',
  email: 'rajesh.mehta@email.com',
  avatar: undefined as string | undefined,
};

const MOCK_ATTENDANCE = {
  rate: 92,
  present: 184,
  absent: 10,
  late: 6,
  total: 200,
  monthly: [
    { month: 'Jun 2026', present: 22, absent: 1, late: 1 },
    { month: 'May 2026', present: 21, absent: 2, late: 0 },
    { month: 'Apr 2026', present: 19, absent: 1, late: 3 },
    { month: 'Mar 2026', present: 23, absent: 0, late: 1 },
    { month: 'Feb 2026', present: 20, absent: 2, late: 1 },
  ],
};

const MOCK_ACADEMICS = {
  overallGrade: 'A',
  percentage: 87,
  subjects: [
    { name: 'Mathematics', marks: 92, total: 100, grade: 'A+' },
    { name: 'Science', marks: 85, total: 100, grade: 'A' },
    { name: 'English', marks: 78, total: 100, grade: 'B+' },
    { name: 'Social Studies', marks: 88, total: 100, grade: 'A' },
    { name: 'Hindi', marks: 91, total: 100, grade: 'A+' },
    { name: 'Computer Science', marks: 95, total: 100, grade: 'A+' },
  ],
  remarks: 'Aarav is a diligent student with consistent performance. Excellent participation in class discussions.',
  teacher: 'Mrs. Sharma',
};

const MOCK_FEES = {
  total: 45000,
  paid: 30000,
  pending: 15000,
  dueDate: '15 Jul 2026',
  history: [
    { date: '01 Apr 2026', amount: 15000, status: 'Paid', method: 'UPI' },
    { date: '01 Jan 2026', amount: 15000, status: 'Paid', method: 'Card' },
    { date: '15 Jul 2026', amount: 15000, status: 'Pending', method: '-' },
  ],
};

const MOCK_HEALTH = {
  bloodGroup: 'B+',
  height: '152 cm',
  weight: '45 kg',
  allergies: 'None',
  medications: 'None',
  lastCheckup: '12 May 2026',
  emergencyContact: { name: 'Priya Mehta', relation: 'Mother', phone: '+91 98765 43211' },
  records: [
    { date: '12 May 2026', type: 'Annual Checkup', status: 'Healthy', notes: 'All vitals normal' },
    { date: '20 Nov 2025', type: 'Eye Test', status: 'Normal', notes: 'Vision 6/6 both eyes' },
    { date: '15 Aug 2025', type: 'Dental Checkup', status: 'Healthy', notes: 'No cavities' },
  ],
};

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const AttendanceCircle: React.FC<{ rate: number }> = ({ rate }) => {
  const { width: SCREEN_W } = useWindowDimensions();
  const size = SCREEN_W * 0.28;
  const r = size / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <View style={[s.circleWrap, { width: size, height: size }]}>
      <View style={[s.circleTrack, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            s.circleFill,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: rate >= 90 ? Theme.colors.success : Theme.colors.warning,
              borderTopColor: 'transparent',
              borderRightColor: rate >= 50 ? (rate >= 90 ? Theme.colors.success : Theme.colors.warning) : 'transparent',
              transform: [{ rotate: '-90deg' }],
            },
          ]}
        />
        <View style={s.circleInner}>
          <Text style={[Theme.typography.h1, { color: rate >= 90 ? Theme.colors.success : Theme.colors.warning }]}>{rate}%</Text>
          <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>Attendance</Text>
        </View>
      </View>
    </View>
  );
};

export default function Student360Screen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Student360'>>();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');

  const student = useMemo(() => {
    const params = route.params;
    return {
      ...MOCK_STUDENT,
      name: params?.studentName || MOCK_STUDENT.name,
      id: params?.studentId || MOCK_STUDENT.id,
    };
  }, [route.params]);

  const renderAttendance = () => (
    <View>
      <View style={s.attendanceTop}>
        <AttendanceCircle rate={MOCK_ATTENDANCE.rate} />
        <View style={s.attendanceCounts}>
          <View style={[s.countItem, { backgroundColor: Theme.colors.successBg }]}>
            <Text style={[Theme.typography.h3, { color: Theme.colors.success }]}>{MOCK_ATTENDANCE.present}</Text>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>Present</Text>
          </View>
          <View style={[s.countItem, { backgroundColor: Theme.colors.errorBg }]}>
            <Text style={[Theme.typography.h3, { color: Theme.colors.error }]}>{MOCK_ATTENDANCE.absent}</Text>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>Absent</Text>
          </View>
          <View style={[s.countItem, { backgroundColor: Theme.colors.warningBg }]}>
            <Text style={[Theme.typography.h3, { color: Theme.colors.warning }]}>{MOCK_ATTENDANCE.late}</Text>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>Late</Text>
          </View>
        </View>
      </View>

      <Text style={[Theme.typography.h4, { color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm }]}>Monthly Trend</Text>
      {MOCK_ATTENDANCE.monthly.map((m, i) => (
        <View key={i} style={s.monthRow}>
          <Text style={[Theme.typography.body, { color: Theme.colors.text, flex: 1 }]}>{m.month}</Text>
          <View style={s.monthBarWrap}>
            <View style={[s.monthBar, { width: `${(m.present / 25) * 100}%` as any, backgroundColor: Theme.colors.success }]} />
          </View>
          <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted, width: 60, textAlign: 'right' }]}>{m.present}/{m.present + m.absent + m.late}</Text>
        </View>
      ))}
    </View>
  );

  const renderAcademics = () => (
    <View>
      <View style={s.gradeRow}>
        <View style={[s.gradeBadge, { backgroundColor: Theme.colors.successBg }]}>
          <Text style={[Theme.typography.h1, { color: Theme.colors.success }]}>{MOCK_ACADEMICS.overallGrade}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Theme.spacing.md }}>
          <Text style={[Theme.typography.body, { color: Theme.colors.textMuted }]}>Overall Percentage</Text>
          <Text style={[Theme.typography.h2, { color: Theme.colors.text }]}>{MOCK_ACADEMICS.percentage}%</Text>
        </View>
        <TrendingUp size={24} color={Theme.colors.success} />
      </View>

      <Text style={[Theme.typography.h4, { color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm }]}>Subject Marks</Text>
      {MOCK_ACADEMICS.subjects.map((s2, i) => (
        <View key={i} style={s.subjectCard}>
          <View style={{ flex: 1 }}>
            <Text style={[Theme.typography.body, { color: Theme.colors.text }]}>{s2.name}</Text>
            <View style={s.progressBarBg}>
              <View style={[s.progressBar, { width: `${s2.marks}%` as any, backgroundColor: s2.marks >= 90 ? Theme.colors.success : s2.marks >= 75 ? Theme.colors.info : Theme.colors.warning }]} />
            </View>
          </View>
          <View style={s.subjectRight}>
            <Text style={[Theme.typography.h4, { color: Theme.colors.text }]}>{s2.marks}/{s2.total}</Text>
            <Text style={[Theme.typography.caption, { color: s2.marks >= 90 ? Theme.colors.success : s2.marks >= 75 ? Theme.colors.info : Theme.colors.warning }]}>{s2.grade}</Text>
          </View>
        </View>
      ))}

      <View style={s.remarkBox}>
        <FileText size={16} color={Theme.colors.textMuted} />
        <View style={{ marginLeft: Theme.spacing.sm, flex: 1 }}>
          <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>Teacher Remarks</Text>
          <Text style={[Theme.typography.body, { color: Theme.colors.text, marginTop: 2 }]}>{MOCK_ACADEMICS.remarks}</Text>
          <Text style={[Theme.typography.caption, { color: Theme.colors.primary, marginTop: Theme.spacing.xs }]}>— {MOCK_ACADEMICS.teacher}</Text>
        </View>
      </View>
    </View>
  );

  const renderFees = () => (
    <View>
      <View style={s.feesSummary}>
        <View style={s.feeItem}>
          <Text style={[Theme.typography.label, { color: Theme.colors.textMuted }]}>Total Fees</Text>
          <Text style={[Theme.typography.h3, { color: Theme.colors.text }]}>{formatCurrency(MOCK_FEES.total)}</Text>
        </View>
        <View style={[s.feeItem, { borderLeftWidth: 1, borderLeftColor: Theme.colors.border, paddingLeft: Theme.spacing.md }]}>
          <Text style={[Theme.typography.label, { color: Theme.colors.textMuted }]}>Paid</Text>
          <Text style={[Theme.typography.h3, { color: Theme.colors.success }]}>{formatCurrency(MOCK_FEES.paid)}</Text>
        </View>
        <View style={[s.feeItem, { borderLeftWidth: 1, borderLeftColor: Theme.colors.border, paddingLeft: Theme.spacing.md }]}>
          <Text style={[Theme.typography.label, { color: Theme.colors.textMuted }]}>Pending</Text>
          <Text style={[Theme.typography.h3, { color: Theme.colors.error }]}>{formatCurrency(MOCK_FEES.pending)}</Text>
        </View>
      </View>

      <View style={[s.dueRow, { backgroundColor: Theme.colors.warningBg, borderColor: Theme.colors.warning }]}>
        <Clock size={16} color={Theme.colors.warning} />
        <Text style={[Theme.typography.body, { color: Theme.colors.warning, marginLeft: Theme.spacing.sm }]}>Next due: {MOCK_FEES.dueDate}</Text>
      </View>

      <Text style={[Theme.typography.h4, { color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm }]}>Payment History</Text>
      {MOCK_FEES.history.map((p, i) => (
        <View key={i} style={s.paymentRow}>
          <View style={{ flex: 1 }}>
            <Text style={[Theme.typography.body, { color: Theme.colors.text }]}>{p.date}</Text>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>{p.method}</Text>
          </View>
          <Text style={[Theme.typography.h4, { color: Theme.colors.text }]}>{formatCurrency(p.amount)}</Text>
          <View style={[s.statusPill, { backgroundColor: p.status === 'Paid' ? Theme.colors.successBg : Theme.colors.warningBg }]}>
            <Text style={[Theme.typography.caption, { color: p.status === 'Paid' ? Theme.colors.success : Theme.colors.warning }]}>{p.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderHealth = () => (
    <View>
      <View style={s.healthGrid}>
        {[
          { label: 'Blood Group', value: MOCK_HEALTH.bloodGroup },
          { label: 'Height', value: MOCK_HEALTH.height },
          { label: 'Weight', value: MOCK_HEALTH.weight },
          { label: 'Allergies', value: MOCK_HEALTH.allergies },
          { label: 'Medications', value: MOCK_HEALTH.medications },
          { label: 'Last Checkup', value: MOCK_HEALTH.lastCheckup },
        ].map((item, i) => (
          <View key={i} style={s.healthCell}>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>{item.label}</Text>
            <Text style={[Theme.typography.bodyMd, { color: Theme.colors.text, marginTop: 2 }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={[s.emergencyCard, { backgroundColor: Theme.colors.errorBg, borderColor: Theme.colors.error }]}>
        <Phone size={16} color={Theme.colors.error} />
        <View style={{ marginLeft: Theme.spacing.sm, flex: 1 }}>
          <Text style={[Theme.typography.label, { color: Theme.colors.textMuted }]}>Emergency Contact</Text>
          <Text style={[Theme.typography.bodyMd, { color: Theme.colors.text }]}>{MOCK_HEALTH.emergencyContact.name} ({MOCK_HEALTH.emergencyContact.relation})</Text>
          <Text style={[Theme.typography.body, { color: Theme.colors.primary }]}>{MOCK_HEALTH.emergencyContact.phone}</Text>
        </View>
      </View>

      <Text style={[Theme.typography.h4, { color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm }]}>Health Records</Text>
      {MOCK_HEALTH.records.map((rec, i) => (
        <View key={i} style={s.recordRow}>
          <View style={[s.recordDot, { backgroundColor: rec.status === 'Healthy' || rec.status === 'Normal' ? Theme.colors.success : Theme.colors.info }]} />
          <View style={{ flex: 1, marginLeft: Theme.spacing.sm }}>
            <Text style={[Theme.typography.body, { color: Theme.colors.text }]}>{rec.type}</Text>
            <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted }]}>{rec.date} — {rec.notes}</Text>
          </View>
          <Text style={[Theme.typography.caption, { color: rec.status === 'Healthy' || rec.status === 'Normal' ? Theme.colors.success : Theme.colors.info }]}>{rec.status}</Text>
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'attendance': return renderAttendance();
      case 'academics': return renderAcademics();
      case 'fees': return renderFees();
      case 'health': return renderHealth();
      default: return null;
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: Theme.colors.background }]}>
      <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + Theme.spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ChevronLeft size={22} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Theme.typography.h2, { color: Theme.colors.text }]}>Student 360</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[s.profileCard, { backgroundColor: Theme.colors.card, borderColor: Theme.colors.border }]}>
          <AvatarBubble
            displayName={student.name}
            size={64}
            textSize={24}
            primaryColor={Theme.colors.primary}
          />
          <View style={s.profileInfo}>
            <Text style={[Theme.typography.h3, { color: Theme.colors.text }]}>{student.name}</Text>
            <Text style={[Theme.typography.body, { color: Theme.colors.textMuted }]}>{student.class} • Roll No. {student.rollNo}</Text>
            <View style={s.profileMeta}>
              <View style={s.metaPill}>
                <User size={12} color={Theme.colors.textMuted} />
                <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted, marginLeft: 4 }]}>{student.id}</Text>
              </View>
              <View style={s.metaPill}>
                <Phone size={12} color={Theme.colors.textMuted} />
                <Text style={[Theme.typography.caption, { color: Theme.colors.textMuted, marginLeft: 4 }]}>{student.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[s.tabPill, activeTab === tab.key ? s.tabPillActive : { backgroundColor: Theme.colors.card, borderColor: Theme.colors.border }]}
            >
              {tab.icon}
              <Text style={[Theme.typography.caption, { marginLeft: 4, color: activeTab === tab.key ? '#fff' : Theme.colors.textMuted }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.contentCard, { backgroundColor: Theme.colors.card, borderColor: Theme.colors.border }]}>
          {renderContent()}
        </View>
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + Theme.spacing.sm, backgroundColor: Theme.colors.card, borderTopColor: Theme.colors.border }]}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: Theme.colors.primary }]}>
          <Phone size={16} color="#fff" />
          <Text style={[Theme.typography.caption, { color: '#fff', marginLeft: Theme.spacing.xs }]}>Call Parent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: Theme.colors.info }]}>
          <Mail size={16} color="#fff" />
          <Text style={[Theme.typography.caption, { color: '#fff', marginLeft: Theme.spacing.xs }]}>Send Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: Theme.colors.success }]}>
          <FileText size={16} color="#fff" />
          <Text style={[Theme.typography.caption, { color: '#fff', marginLeft: Theme.spacing.xs }]}>View Reports</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: Theme.spacing.md, paddingBottom: Theme.spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  profileMeta: {
    flexDirection: 'row',
    marginTop: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundAlt,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.radius.full,
  },
  tabsContainer: {
    paddingHorizontal: Theme.spacing.xs,
    paddingBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
  },
  tabPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  contentCard: {
    borderRadius: Theme.spacing.lg,
    borderWidth: 1,
    padding: Theme.spacing.md,
  },
  circleWrap: { alignItems: 'center', justifyContent: 'center' },
  circleTrack: { borderWidth: 6, borderColor: Theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  circleFill: { position: 'absolute', top: 0, left: 0, borderWidth: 6 },
  circleInner: { alignItems: 'center', justifyContent: 'center' },
  attendanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceCounts: { flex: 1, marginLeft: Theme.spacing.lg, gap: Theme.spacing.sm },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  monthBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.full,
    marginHorizontal: Theme.spacing.sm,
    overflow: 'hidden',
  },
  monthBar: { height: '100%', borderRadius: Theme.radius.full },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundAlt,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
  },
  gradeBadge: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.full,
    marginTop: Theme.spacing.xs,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: Theme.radius.full },
  subjectRight: { alignItems: 'flex-end', marginLeft: Theme.spacing.md, minWidth: 60 },
  remarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.colors.backgroundAlt,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  feesSummary: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.backgroundAlt,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
  },
  feeItem: { flex: 1, alignItems: 'center' },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  statusPill: {
    marginLeft: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.radius.full,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  healthCell: {
    width: '48%',
    backgroundColor: Theme.colors.backgroundAlt,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  recordDot: { width: 8, height: 8, borderRadius: 4 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
  },
});
