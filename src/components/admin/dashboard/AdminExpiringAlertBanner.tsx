import React from 'react';
import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors } from '../../../theme/tokens';
import { dashboardStyles as styles } from './dashboardStyles';

interface AdminExpiringAlertBannerProps {
  count: number;
}

export default function AdminExpiringAlertBanner({ count }: AdminExpiringAlertBannerProps) {
  if (count <= 0) { return null; }

  return (
    <View style={styles.alertBanner}>
      <AlertTriangle size={16} color={colors.warning} />
      <AppText style={styles.alertText}>
        {count} school(s) have trials ending in 3 days or less!
      </AppText>
    </View>
  );
}
