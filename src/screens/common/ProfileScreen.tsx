import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AccountSwitcher from '../../components/common/AccountSwitcher';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme } from '../../theme/tokens';
import {
  ProfileHeader,
  ProfileSections,
  ProfileAccountSettingsSection,
  ProfileEditModal,
  ProfileSettingsModal,
  ProfilePasswordChangeModal,
  profileStyles,
  useProfileScreen,
} from '../../components/profile';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const profile = useProfileScreen();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('MainTabs');
    }
  };

  if (profile.loading) {
    return (
      <View style={profileStyles.loadingContainer}>
        <ScreenSkeleton variant="list" />
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[profileStyles.content, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
      >
        <StandardPageHeader
          title="My Profile"
          onBackPress={handleBackPress}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              onPress={profile.handleLogout}
              style={[heroHeaderStyles.iconBtn, profileStyles.logoutBtnHeader]}
              accessibilityLabel="Log out"
            >
              <LogOut size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          <ProfileHeader
            name={profile.userInfo.name}
            subtitle={profile.profileSubtitle}
            profilePhotoUrl={profile.profilePhotoUrl}
            profilePhotoError={profile.profilePhotoError}
            userToken={profile.userToken}
            onPhotoError={() => profile.setProfilePhotoError(true)}
            onOpenAccountSwitcher={() => profile.setShowAccountSwitcher(true)}
          />
          <ProfileSections
            userInfo={profile.userInfo}
            studentRollNumber={profile.studentRollNumber}
            isAgent={profile.isAgent}
            isDirector={profile.isDirector}
            isAdminPanel={profile.isAdminPanel}
            isStudent={profile.isStudent}
            roleKey={profile.roleKey}
            onEditField={profile.handleEditField}
          />
          <ProfileAccountSettingsSection
            systemSettingsRoute={profile.systemSettingsRoute}
            onOpenSettings={() => profile.setShowSettingsModal(true)}
            onOpenPasswordChange={() => profile.setShowPasswordChangeModal(true)}
            onOpenAccountSwitcher={() => profile.setShowAccountSwitcher(true)}
            onNavigateSettings={(route) => (navigation as any).navigate(route)}
          />
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <ProfileEditModal
        visible={profile.showEditModal}
        editField={profile.editField}
        editLoading={profile.editLoading}
        onClose={() => profile.setShowEditModal(false)}
        onChangeValue={profile.handleEditValueChange}
        onSave={profile.handleUpdateProfile}
      />
      <ProfileSettingsModal
        visible={profile.showSettingsModal}
        settings={profile.settings}
        onClose={() => profile.setShowSettingsModal(false)}
        onToggleNotifications={profile.handleToggleNotifications}
      />
      <ProfilePasswordChangeModal
        visible={profile.showPasswordChangeModal}
        step={profile.passwordChangeStep}
        loading={profile.passwordChangeLoading}
        otp={profile.passwordChangeOtp}
        error={profile.passwordChangeError}
        success={profile.passwordChangeSuccess}
        newPassword={profile.newPassword}
        confirmPassword={profile.confirmPassword}
        showNewPassword={profile.showNewPassword}
        showConfirmPassword={profile.showConfirmPassword}
        targetEmail={profile.passwordTargetEmail}
        onClose={profile.handlePasswordChangeModalClose}
        onRequestOtp={profile.handleRequestOtp}
        onVerifyOtp={profile.handleVerifyOtp}
        onChangePassword={profile.handleChangePassword}
        onOtpChange={profile.setPasswordChangeOtp}
        onNewPasswordChange={profile.setNewPassword}
        onConfirmPasswordChange={profile.setConfirmPassword}
        onToggleNewPassword={() => profile.setShowNewPassword(!profile.showNewPassword)}
        onToggleConfirmPassword={() => profile.setShowConfirmPassword(!profile.showConfirmPassword)}
      />
      <AccountSwitcher
        visible={profile.showAccountSwitcher}
        onClose={() => profile.setShowAccountSwitcher(false)}
      />
    </View>
  );
}
