import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import { safeNavigate } from '../../utils/navigationHelpers';
import DashboardHeroHeader from '../../components/dashboard/DashboardHeroHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { colors, Theme } from '../../theme/tokens';
import { DirectorUpgradeChoiceModal } from '../../components/director/DirectorBranchUpgradeFlow';
import {
  DirectorKpiSection,
  DirectorQuickAccessSection,
  DirectorBranchLimitBanner,
  DirectorBillingOverviewCard,
  DirectorPaymentHistoryCard,
  DirectorBranchManagementPanel,
  DirectorBranchesListView,
  DirectorEditBranchModal,
  DirectorBranchSelectorModal,
} from '../../components/director/dashboard';
import { useDirectorDashboard } from './useDirectorDashboard';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

export default function DirectorDashboardScreen() {
  const tabBarScrollPadding = useTabBarScrollPadding();
  const { userName } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const overviewRef = useRef<ScrollView>(null);
  const handleScroll = useScrollTabBar();
  const dash = useDirectorDashboard();

  if (!dash.schoolCode) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorTitle}>School Code missing</AppText>
        <AppText style={styles.errorText}>Please login again.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={overviewRef}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.onRefresh} tintColor={colors.accent} />}
      >
        <DashboardHeroHeader
          userName={userName || 'Director'}
          greetingLine={`GOOD ${getGreeting().toUpperCase()}`}
          subtitle={`School ID: ${dash.schoolCode} • Manage branches`}
          unreadCount={unreadCount}
          onAvatarPress={() => safeNavigate(dash.navigation, 'Profile')}
          onNotificationsPress={() => safeNavigate(dash.navigation, 'Notifications')}
          onRefreshPress={dash.onRefresh}
          refreshing={dash.loading}
          pageTitle="Director Control Center"
          showDateBadge
          fullBleed
        />

        <View style={innerPageLayoutStyles.contentFront}>
          {dash.view === 'dashboard' && (
            <DirectorKpiSection
              selectedBranchId={dash.selectedBranchId}
              displayedStats={dash.displayedStats}
              onKpiPress={() => dash.handleKpiClick(() => overviewRef.current?.scrollToEnd())}
            />
          )}

          {dash.view === 'dashboard' && (
            <DirectorQuickAccessSection
              navigation={dash.navigation}
              selectedBranchId={dash.selectedBranchId}
              topBarOpacityAnim={dash.topBarOpacityAnim}
              topBarTranslateAnim={dash.topBarTranslateAnim}
              onAddBranchPress={dash.handleAddBranchPress}
              onOpenUpgradeModal={dash.openUpgradeModal}
              onOpenBranchSelector={() => dash.setBranchSelectorVisible(true)}
            />
          )}

          {dash.loading && <ScreenSkeleton variant="dashboard" />}

          {dash.view === 'dashboard' && dash.atBranchLimit && (
            <DirectorBranchLimitBanner
              branchCount={dash.stats.branches}
              branchLimit={dash.branchLimit}
              planName={dash.subscription?.current_plan_name || dash.subscription?.current_plan}
              onUpgrade={dash.openUpgradeModal}
            />
          )}

          {dash.view === 'dashboard' && (
            <DirectorBillingOverviewCard
              subscription={dash.subscription}
              billingLoading={dash.billingLoading}
              hasPayments={dash.payments.length > 0}
              branchCount={dash.stats.branches}
              branchLimit={dash.branchLimit}
              atBranchLimit={dash.atBranchLimit}
              branchSlotsAvailable={dash.branchSlotsAvailable}
              onManage={() => safeNavigate(dash.navigation, 'DirectorBilling', { variant: 'subscription' })}
              onUpgrade={dash.openUpgradeModal}
              onAddBranch={dash.handleAddBranchPress}
            />
          )}

          {dash.view === 'dashboard' && (
            <DirectorPaymentHistoryCard
              payments={dash.payments}
              recentPayments={dash.recentPayments}
              onViewAll={() => safeNavigate(dash.navigation, 'DirectorBilling', { variant: 'payments' })}
              onPaymentPress={() => safeNavigate(dash.navigation, 'DirectorBilling', { variant: 'payments' })}
            />
          )}

          {dash.view === 'dashboard' && (
            <DirectorBranchManagementPanel
              filteredBranchCount={dash.filteredBranches.length}
              dashboardBranchPreview={dash.dashboardBranchPreview}
              dashboardBranchLimit={dash.DASHBOARD_BRANCH_LIMIT}
              onViewAll={dash.navigateToBranchesTab}
              onBranchPress={dash.navigateToBranchesTab}
            />
          )}

          {dash.view === 'branches' && (
            <DirectorBranchesListView
              selectedBranchId={dash.selectedBranchId}
              filteredBranches={dash.filteredBranches}
              paginatedBranches={dash.paginatedBranches}
              branchViewSearchTerm={dash.branchViewSearchTerm}
              branchSlotsAvailable={dash.branchSlotsAvailable}
              currentPage={dash.currentPage}
              totalPages={dash.totalPages}
              rowsPerPage={dash.ROWS_PER_PAGE}
              onSearchChange={dash.handleBranchSearchChange}
              onAddBranch={dash.handleAddBranchPress}
              onEditBranch={dash.startEdit}
              onViewBranch={dash.handleViewBranch}
              onPageChange={dash.setCurrentPage}
            />
          )}
        </View>
      </ScrollView>

      <DirectorEditBranchModal
        visible={dash.editBranchModalVisible}
        editData={dash.editData}
        onClose={dash.cancelEdit}
        onSave={dash.saveEdit}
        onFieldChange={dash.handleEditChange}
      />

      <DirectorBranchSelectorModal
        visible={dash.branchSelectorVisible}
        branches={dash.branches}
        selectedBranchId={dash.selectedBranchId}
        onClose={() => dash.setBranchSelectorVisible(false)}
        onSelect={dash.handleBranchSelect}
      />

      <DirectorUpgradeChoiceModal
        visible={dash.showUpgradeModal}
        onClose={() => dash.setShowUpgradeModal(false)}
        nextPlan={dash.nextPlan}
        currentPlanName={dash.subscription?.current_plan_name || dash.subscription?.current_plan || dash.subscription?.plan_code}
        onUpgradePlan={dash.handleUpgradePlanChoice}
        onAddBranchSlot={dash.handleAddBranchSlotChoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  contentContainer: { paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: Theme.colors.background },
  errorTitle: { fontSize: Theme.typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary, marginBottom: Theme.spacing.sm },
  errorText: { ...Theme.typography.body, color: colors.textMuted },
});
