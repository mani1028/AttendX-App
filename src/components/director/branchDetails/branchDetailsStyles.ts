import { StyleSheet, Platform } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';


export const branchDetailsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  contentContainer: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Theme.radius.xl,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  statValue: {
    ...Theme.typography.h1,
    color: Theme.colors.text,
  },
  statTitle: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  statIcon: {
    fontSize: Theme.typography.h1.fontSize,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xs,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.colors.primary,
  },
  tabText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  tabTextActive: {
    color: Theme.colors.card,
  },
  searchContainer: {
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  filterRow: {
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  filterField: {
    marginBottom: Theme.spacing.sm,
  },
  filterLabel: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dropdownSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    height: 48,
  },
  dropdownSelectText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  emptyText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
  teacherCard: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  teacherName: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  teacherId: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  teacherSubject: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  teacherContact: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: 2,
  },
  teacherEmail: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  studentCard: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  studentName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  studentRoll: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  studentDetails: {
    gap: Theme.spacing.xs,
  },
  studentInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.xl,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: Theme.colors.redLight,
  },
  statusText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803d',
  },
  statusTextInactive: {
    color: '#b91c1c',
  },
  attendanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.xl,
    alignSelf: 'flex-start',
  },
  attendancePresent: {
    backgroundColor: '#dcfce7',
  },
  attendanceAbsent: {
    backgroundColor: Theme.colors.redLight,
  },
  attendanceText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  attendanceTextPresent: {
    color: '#15803d',
  },
  attendanceTextAbsent: {
    color: '#b91c1c',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.xl,
  },
  resultPass: {
    backgroundColor: '#dcfce7',
  },
  resultFail: {
    backgroundColor: Theme.colors.redLight,
  },
  resultText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  resultTextPass: {
    color: '#15803d',
  },
  resultTextFail: {
    color: '#b91c1c',
  },
  gradeBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.md,
  },
  gradeText: {
    ...Theme.typography.label,
    fontWeight: '700',
  },
  leaveBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.xl,
  },
  leaveText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  leaveCard: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  leaveStudent: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  leaveDetails: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  leaveDates: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  leaveReason: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  classCard: {
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  classHeader: {
    backgroundColor: Theme.colors.primary,
    padding: 14,
  },
  classTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  sectionList: {
    padding: Theme.spacing.md,
  },
  sectionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  sectionName: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.cardAlt,
  },
  sectionCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  attendanceControls: {
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  attendanceTypeRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  attendanceTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  attendanceTypeBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  attendanceTypeText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  attendanceTypeTextActive: {
    color: Theme.colors.card,
  },
  attendanceDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
  },
  dateText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.text,
  },
  attendanceSummary: {
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
  },
  attendanceSummaryText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  attendanceFilterRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterChipText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  filterChipTextActive: {
    color: Theme.colors.card,
  },
  teacherAttendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: Theme.spacing.sm,
  },
  teacherAttendanceName: {
    flex: 1,
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  teacherAttendanceId: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginHorizontal: Theme.spacing.sm,
  },
  marksRow: {
    backgroundColor: Theme.colors.background,
    padding: 14,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  marksRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  marksStudentName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  marksRowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marksInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  marksPercentage: {
    ...Theme.typography.body,
    fontWeight: '700',
  },
  marksControls: {
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  sortLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sortBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  sortBtnText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  sortBtnTextActive: {
    color: Theme.colors.card,
  },
  summaryCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  summaryLabel: {
    ...Theme.typography.label,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: Theme.colors.card,
  },
  summarySub: {
    fontSize: Theme.typography.label.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chartTitle: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Theme.spacing.md,
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
  },
  chartStatLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.xl,
    width: '100%',
    maxHeight: '85%',
  },
  largeModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.lg,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.textSec,
  },
  modalBody: {
    padding: Theme.spacing.md,
  },
  modalFooter: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: Theme.spacing.md,
  },
  attendanceRoll: {
    width: 60,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  attendanceName: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.text,
  },
  studentInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.xl,
  },
  studentInfoItem: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.text,
  },
  examSection: {
    marginBottom: Theme.spacing.xl,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  examTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  examToggle: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  examToggleBtn: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.background,
  },
  examToggleBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  examToggleText: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  examToggleTextActive: {
    color: Theme.colors.card,
  },
  chartContainer: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  chartSubtitle: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
  },
  chart: {
    borderRadius: Theme.radius.lg,
  },
  noDataText: {
    textAlign: 'center',
    color: Theme.colors.textSec,
    padding: Theme.spacing.xl,
  },
  subjectTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  subjectName: {
    flex: 2,
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.text,
  },
  subjectMarks: {
    width: 60,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  subjectMax: {
    width: 60,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
  branchSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  viewAllLeavesBtn: {
    backgroundColor: Theme.colors.background,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
  },
  viewAllLeavesText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
