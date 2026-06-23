import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import AppText from '../../components/common/AppText';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme } from '../../theme/tokens';


export default function TeacherRegistrationRequestsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>


      {/* Standard Header */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
          borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
        },
      ]}>
        <TouchableOpacity accessibilityRole="button"
          onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={Theme.colors.card} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ClipboardList size={18} color={Theme.colors.card} />
          <View>
            <AppText style={styles.headerTitle} weight="bold">Teacher Requests</AppText>
            <AppText style={styles.headerSub}>Principal Control</AppText>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText style={styles.title} weight="bold">Teacher Registration Requests</AppText>
        <AppText style={styles.subtitle}>Review and approve new teacher registrations.</AppText>
        <View style={styles.card}>
          <AppText style={styles.cardText}>No pending requests.</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    gap: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Theme.colors.card,
    fontSize: 17,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.label,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    marginBottom: Theme.spacing.sm,
    color: Theme.colors.text,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    marginBottom: 20,
  },
  card: {
    padding: 20,
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  cardText: {
    color: Theme.colors.textSec,
    ...Theme.typography.body,
  },
});
