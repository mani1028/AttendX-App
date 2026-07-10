import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { BookOpen, Phone, Mail, FileText } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import InfoRow from './InfoRow';
import { pickText } from './helpers';
import { student360Styles as styles } from './student360Styles';
import type { Student360TabKey } from './types';

export interface Student360TabContentProps {
  activeTab: Student360TabKey;
  loadingProfile: boolean;
  profileError: string;
  profile: Record<string, any> | null;
  history: any[];
  displayName: string;
  rollNo: string;
  displayClass: string;
  onCall: (phone: string) => void;
  onEmail: (email: string) => void;
}

export default function Student360TabContent({
  activeTab,
  loadingProfile,
  profileError,
  profile,
  history,
  displayName,
  rollNo,
  displayClass,
  onCall,
  onEmail,
}: Student360TabContentProps) {
  if (loadingProfile) {
    return (
      <View style={styles.loadingPanel}>
        <ScreenSkeleton variant="list" />
        <AppText style={styles.loadingText}>Loading student profile...</AppText>
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={styles.emptyPanel}>
        <FileText size={36} color={Theme.colors.error} />
        <AppText style={styles.emptyPanelTitle} weight="bold">{profileError}</AppText>
      </View>
    );
  }

  if (activeTab === 'overview') {
    return (
      <View>
        <InfoRow label="Student Name" value={displayName} />
        <InfoRow label="Roll Number" value={rollNo} />
        <InfoRow label="Admission No." value={pickText(profile?.admission_number)} />
        <InfoRow label="Class & Section" value={displayClass} />
        <InfoRow label="Academic Year" value={pickText(profile?.academic_year)} />
        <InfoRow label="Status" value={pickText(profile?.student_status, profile?.status, 'ACTIVE')} />
        <InfoRow label="Gender" value={pickText(profile?.gender, profile?.student_gender)} />
        <InfoRow label="Date of Birth" value={pickText(profile?.date_of_birth, profile?.dob)} />
        <InfoRow label="Father / Guardian" value={pickText(profile?.father_guardian_name, profile?.parent_guardian_name)} />
      </View>
    );
  }

  if (activeTab === 'academics') {
    if (history.length === 0) {
      return (
        <View style={styles.emptyPanel}>
          <BookOpen size={36} color={Theme.colors.textMuted} />
          <AppText style={styles.emptyPanelTitle} weight="bold">No academic history yet</AppText>
          <AppText style={styles.emptyPanelText}>Promotion and exam history will appear here.</AppText>
        </View>
      );
    }
    return (
      <View>
        {history.map((item, index) => (
          <View key={`${item?.id || index}`} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={{ flex: 1 }}>
              <AppText style={styles.historyTitle} weight="semibold">
                {pickText(item?.to_class_name, item?.class_grade, item?.title, 'Record')}
              </AppText>
              <AppText style={styles.historySub}>
                {pickText(item?.academic_year, item?.year, item?.created_at?.slice?.(0, 10))}
              </AppText>
              {item?.remarks ? (
                <AppText style={styles.historyRemarks}>{String(item.remarks)}</AppText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  const parentMobile = pickText(profile?.parent_guardian_mobile, profile?.father_mobile, profile?.mobile_number);
  const parentEmail = pickText(profile?.parent_guardian_email, profile?.email_id);

  return (
    <View>
      <InfoRow label="Parent Mobile" value={parentMobile} />
      <InfoRow label="Parent Email" value={parentEmail} />
      <InfoRow label="Address" value={pickText(profile?.address, profile?.permanent_address, profile?.current_address)} />
      <View style={styles.contactActions}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]}
          onPress={() => onCall(parentMobile)}
        >
          <Phone size={16} color={Theme.colors.card} />
          <AppText style={styles.actionBtnText} weight="semibold">Call Parent</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.actionBtn, { backgroundColor: Theme.colors.info }]}
          onPress={() => onEmail(parentEmail)}
        >
          <Mail size={16} color={Theme.colors.card} />
          <AppText style={styles.actionBtnText} weight="semibold">Email Parent</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
