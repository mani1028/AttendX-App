import { StyleSheet, Platform } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';
import { SCROLL_PAGE_GUTTER } from '../../layout/innerPageLayoutStyles';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';

export const examsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  tabBarWrap: {
    paddingHorizontal: SCROLL_PAGE_GUTTER,
    paddingTop: 14,
    paddingBottom: Theme.spacing.sm,
  },
  tabBody: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  refreshBtnText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  addBtnText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  errorContainer: {
    backgroundColor: C.errorSoft,
    padding: 14,
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    borderColor: C.error,
  },
  errorText: {
    ...Theme.typography.body,
    color: C.error,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
  },
  tab: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: C.primary,
  },
  tabText: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  activeTabText: {
    color: C.primary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: SCROLL_PAGE_GUTTER,
    paddingTop: Theme.spacing.sm,
  },
  examGrid: {
    gap: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  examCard: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: Theme.spacing.xl,
  },
  examCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  examName: {
    ...Theme.typography.bodyMd,
    color: C.text,
    flex: 1,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  badge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  badgeText: {
    ...Theme.typography.caption,
    color: C.primary,
    textTransform: 'uppercase',
  },
  examInfo: {
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  infoValue: {
    ...Theme.typography.caption,
    color: C.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Theme.radius.sm,
    paddingVertical: 10,
  },
  actionBtnSecondaryText: {
    ...Theme.typography.caption,
    color: C.primary,
  },
  formPanel: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  formTitle: {
    fontSize: Theme.typography.h4.fontSize,
    marginBottom: Theme.spacing.xl,
    color: C.text,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: C.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.md,
    ...Theme.typography.body,
    backgroundColor: C.bg,
    color: C.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: C.success,
    borderRadius: Theme.radius.sm,
    paddingVertical: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  submitBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.card,
  },
  yearSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    backgroundColor: C.bg,
  },
  yearSelectorTextWrap: {
    flex: 1,
    gap: 2,
  },
  yearSelectorTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: C.text,
  },
  yearSelectorHint: {
    ...Theme.typography.label,
    color: C.textMuted,
  },
  yearNextBtn: {
    backgroundColor: C.primary,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  yearNextBtnText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },
  choiceChip: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Theme.radius.full,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  choiceChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  choiceChipText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  choiceChipTextActive: {
    color: Theme.colors.card,
  },
  helperText: {
    ...Theme.typography.caption,
    color: C.textMuted,
    paddingVertical: 10,
  },
  noData: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    ...Theme.typography.body,
    color: C.textMuted,
    marginTop: Theme.spacing.md,
  },
  infoPanel: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  infoTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  infoSubtitle: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  classSectionContainer: {
    marginBottom: Theme.spacing.lg,
  },
  classSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  classSectionTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: C.text,
  },
  studentCount: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  tableContainer: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    ...Theme.typography.caption,
    color: C.text,
  },
  headerCellName: {
    width: '25%',
  },
  headerCellClass: {
    width: '15%',
  },
  headerCellSubjects: {
    width: '40%',
  },
  headerCellTotal: {
    width: '20%',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.bg + '50',
  },
  tableCellName: {
    width: '25%',
  },
  studentName: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.text,
  },
  rollNumber: {
    ...Theme.typography.label,
    color: C.textMuted,
    marginTop: 2,
  },
  tableCellClass: {
    width: '15%',
    justifyContent: 'center',
  },
  classText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  tableCellSubjects: {
    width: '40%',
  },
  subjectChip: {
    backgroundColor: C.bg,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
    marginRight: Theme.spacing.sm,
    minWidth: 80,
  },
  subjectName: {
    ...Theme.typography.label,
    color: C.text,
  },
  subjectMarks: {
    fontSize: Theme.typography.label.fontSize,
    color: C.textMuted,
    marginTop: 2,
  },
  subjectGrade: {
    fontSize: Theme.typography.label.fontSize,
    marginTop: 2,
  },
  tableCellTotal: {
    width: '20%',
    alignItems: 'flex-end',
  },
  totalMarks: {
    ...Theme.typography.caption,
    color: C.text,
  },
  percentage: {
    ...Theme.typography.label,
    marginTop: 2,
  },
  grade: {
    ...Theme.typography.label,
    marginTop: 2,
  },
  tabOuterContainer: {
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
        paddingTop: Theme.spacing.md,
    zIndex: 10,
  },
  tabScrollContainer: {
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    paddingBottom: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: 'rgba(226, 232, 240, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  tabItemActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabItemText: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.muted,
  },
  tabItemTextActive: {
    color: C.white,
  },
  mobileCardsContainer: {
    gap: Theme.spacing.md,
  },
  studentCardMobile: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  studentCardMobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentCardMobileName: {
    ...Theme.typography.bodyMd,
    color: C.text,
  },
  studentCardMobileRoll: {
    ...Theme.typography.label,
    color: C.muted,
    marginTop: 2,
  },
  studentCardMobileBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  studentCardMobileBadgeText: {
    ...Theme.typography.label,
  },
  studentCardMobileDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: Theme.spacing.md,
  },
  studentCardMobileScroll: {
    gap: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
  },
  subjectChipMobile: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    minWidth: 90,
    alignItems: 'center',
  },
  subjectChipMobileName: {
    ...Theme.typography.label,
    color: C.text,
  },
  subjectChipMobileMarks: {
    fontSize: Theme.typography.label.fontSize,
    color: C.muted,
    marginTop: 2,
  },
  subjectChipMobileGradeBg: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: Theme.spacing.xs,
  },
  subjectChipMobileGrade: {
    fontSize: Theme.typography.label.fontSize,
  },
  studentCardMobileFooter: {
    marginTop: Theme.spacing.md,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
    alignItems: 'flex-end',
  },
  studentCardMobileFooterText: {
    ...Theme.typography.caption,
    color: C.muted,
  },
});
