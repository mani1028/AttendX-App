import React from 'react';
import { View } from 'react-native';
import { User, Mail, Phone, Droplet, Briefcase, BookOpen, Grid, Hash, Home, MapPin, Check, X } from 'lucide-react-native';
import AppCard from '../common/AppCard';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import type { UserProfile } from './types';
import ProfileInfoRow from './ProfileInfoRow';
import { profileStyles as styles } from './profileStyles';

interface ProfileSectionsProps {
  userInfo: UserProfile;
  studentRollNumber: string;
  isAgent: boolean;
  isDirector: boolean;
  isAdminPanel: boolean;
  isStudent: boolean;
  roleKey: string;
  onEditField?: (fieldKey: string, label: string, value: string) => void;
}

export default function ProfileSections({
  userInfo,
  studentRollNumber,
  isAgent,
  isDirector,
  isAdminPanel,
  isStudent,
  roleKey,
  onEditField,
}: ProfileSectionsProps) {
  return (
    <>
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Basic Information</AppText>
        <AppCard style={styles.infoCard}>
          {isAgent && (
            <>
              <ProfileInfoRow label="Full Name" value={userInfo.name} IconComponent={User} />
              <View style={styles.divider} />
              <ProfileInfoRow label="Username" value={userInfo.username} IconComponent={User} />
              <View style={styles.divider} />
              <ProfileInfoRow label="Email" value={userInfo.email} IconComponent={Mail} />
            </>
          )}
          {isDirector && roleKey === 'director' && (
            <>
              <ProfileInfoRow
                label="Full Name"
                value={userInfo.name}
                IconComponent={User}
                fieldKey="name"
                editable
                onEdit={onEditField}
              />
              <View style={styles.divider} />
              <ProfileInfoRow label="Director ID" value={userInfo.employee_id} IconComponent={Hash} />
              <View style={styles.divider} />
              <ProfileInfoRow
                label="Email"
                value={userInfo.email}
                IconComponent={Mail}
                fieldKey="email"
                editable
                onEdit={onEditField}
              />
              <View style={styles.divider} />
              <ProfileInfoRow
                label="Address"
                value={userInfo.address}
                IconComponent={MapPin}
                fieldKey="address"
                editable
                onEdit={onEditField}
              />
            </>
          )}
          {isDirector && roleKey === 'principal' && !isAgent && (
            <>
              <ProfileInfoRow
                label="Full Name"
                value={userInfo.name}
                IconComponent={User}
                fieldKey="name"
                editable
                onEdit={onEditField}
              />
              <View style={styles.divider} />
              <ProfileInfoRow label="Employee ID" value={userInfo.employee_id} IconComponent={Hash} />
            </>
          )}
          {isDirector && isAdminPanel && !isAgent && (
            <>
              <ProfileInfoRow label="Full Name" value={userInfo.name} IconComponent={User} />
            </>
          )}
          {isStudent && (
            <>
              <ProfileInfoRow label="Roll Number" value={studentRollNumber} IconComponent={Hash} />
              <View style={styles.divider} />
              <ProfileInfoRow label="Class" value={userInfo.class_grade} IconComponent={BookOpen} />
              <View style={styles.divider} />
              <ProfileInfoRow label="Section" value={userInfo.section} IconComponent={Grid} />
              <View style={styles.divider} />
              <ProfileInfoRow label="Blood Group" value={userInfo.blood_group} IconComponent={Droplet} />
            </>
          )}
          {!isStudent && !isDirector && !isAgent && (
            <>
              <ProfileInfoRow label="Employee ID" value={userInfo.employee_id} IconComponent={Hash} />
              {userInfo.blood_group ? (
                <>
                  <View style={styles.divider} />
                  <ProfileInfoRow label="Blood Group" value={userInfo.blood_group} IconComponent={Droplet} />
                </>
              ) : null}
            </>
          )}
        </AppCard>
      </View>

      {!isStudent && !isDirector && !isAgent && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Professional Details</AppText>
          <AppCard style={styles.infoCard}>
            <ProfileInfoRow label="Designation" value={userInfo.designation} IconComponent={Briefcase} />
            <View style={styles.divider} />
            <ProfileInfoRow label="Department" value={userInfo.department_subject} IconComponent={BookOpen} />
          </AppCard>
        </View>
      )}

      {isStudent && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Parental Information</AppText>
          <AppCard style={styles.infoCard}>
            <ProfileInfoRow label="Father Name" value={userInfo.father_guardian_name} IconComponent={User} />
            <View style={styles.divider} />
            <ProfileInfoRow label="Father Mobile" value={userInfo.father_guardian_mobile} IconComponent={Phone} />
            <View style={styles.divider} />
            <ProfileInfoRow label="Parent Email" value={userInfo.parent_guardian_email} IconComponent={Mail} />
          </AppCard>
        </View>
      )}

      {(roleKey === 'principal' || (!isStudent && !isDirector && !isAgent)) && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Contact Information</AppText>
          <AppCard style={styles.infoCard}>
            <ProfileInfoRow
              label="Email"
              value={userInfo.email}
              IconComponent={Mail}
              fieldKey="email"
              editable={roleKey === 'principal'}
              onEdit={onEditField}
            />
            <View style={styles.divider} />
            <ProfileInfoRow
              label="Phone"
              value={userInfo.phone}
              IconComponent={Phone}
              fieldKey="phone"
              editable={roleKey === 'principal'}
              onEdit={onEditField}
            />
            <View style={styles.divider} />
            <ProfileInfoRow
              label="Address"
              value={userInfo.address}
              IconComponent={MapPin}
              fieldKey="address"
              editable={roleKey === 'principal'}
              onEdit={onEditField}
            />
          </AppCard>
        </View>
      )}

      {(!isDirector || roleKey === 'principal') && !isAgent && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Organization</AppText>
          <AppCard style={styles.infoCard}>
            <ProfileInfoRow label="School" value={userInfo.school_name} IconComponent={Home} />
            <View style={styles.divider} />
            <ProfileInfoRow label="Branch" value={userInfo.branch_name} IconComponent={MapPin} />
            <View style={styles.divider} />
            <ProfileInfoRow label="Branch ID" value={userInfo.branch_id} IconComponent={Hash} />
          </AppCard>
        </View>
      )}

      {isAgent && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Capabilities</AppText>
          <AppCard style={styles.infoCard}>
            <AgentCapabilityRow
              label="Can Register Schools"
              enabled={Boolean(userInfo.can_register_school)}
            />
            <View style={styles.divider} />
            <AgentCapabilityRow
              label="Can View Payments"
              enabled={Boolean(userInfo.can_view_payments)}
            />
            <View style={styles.divider} />
            <AgentCapabilityRow
              label="Can Edit School Features"
              enabled={Boolean(userInfo.can_edit_features)}
            />
          </AppCard>
        </View>
      )}
    </>
  );
}

function AgentCapabilityRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.iconCircle, { backgroundColor: enabled ? Theme.colors.greenLight : Theme.colors.redLight }]}>
        {enabled ? (
          <Check size={18} color={Theme.colors.success} />
        ) : (
          <X size={18} color={Theme.colors.error} />
        )}
      </View>
      <View style={styles.infoContent}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={styles.infoValue}>{enabled ? 'Enabled' : 'Disabled'}</AppText>
      </View>
    </View>
  );
}
