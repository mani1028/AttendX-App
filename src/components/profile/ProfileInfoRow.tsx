import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import { profileStyles as styles } from './profileStyles';

interface ProfileInfoRowProps {
  label: string;
  value: string | undefined;
  IconComponent: LucideIcon;
  fieldKey?: string;
  editable?: boolean;
  onEdit?: (fieldKey: string, label: string, value: string) => void;
}

export default function ProfileInfoRow({
  label,
  value,
  IconComponent,
  fieldKey,
  editable,
  onEdit,
}: ProfileInfoRowProps) {
  const canEdit = Boolean(fieldKey && editable && onEdit);
  const RowComponent = canEdit ? TouchableOpacity : View;

  return (
    <RowComponent
      style={styles.infoRow}
      onPress={canEdit ? () => onEdit!(fieldKey!, label, value || '') : undefined}
    >
      <View style={styles.iconCircle}>
        <IconComponent size={18} color={Theme.colors.blue} />
      </View>
      <View style={styles.infoContent}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={styles.infoValue}>{value || '—'}</AppText>
      </View>
      {canEdit && (
        <View style={styles.editIcon}>
          <AppText style={{ ...Theme.typography.caption, color: Theme.colors.blue, fontWeight: '600' }}>
            Edit
          </AppText>
        </View>
      )}
    </RowComponent>
  );
}
