import React from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Users } from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/theme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';

export default function StudentPromotionScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Standard Header */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 16,
          borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
          borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
        }
      ]}>
        <TouchableOpacity 
          onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')} 
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Users size={18} color="#fff" />
          <View>
            <AppText style={styles.headerTitle} weight="bold">Student Promotion</AppText>
            <AppText style={styles.headerSub}>Principal Control</AppText>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText style={styles.title} weight="bold">Promote Students</AppText>
        <AppText style={styles.subtitle}>Promote students to the next academic year.</AppText>
        <View style={styles.card}>
          <AppText style={styles.cardText}>Promotion interface will be available here.</AppText>
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
    shadowColor: '#1E3A8A',
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
    color: '#fff', 
    fontSize: 17,
  },
  headerSub: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 11,
  },
  scroll: { 
    flex: 1,
  },
  scrollContent: { 
    padding: 20,
  },
  title: { 
    fontSize: 22, 
    marginBottom: 8, 
    color: Theme.colors.text,
  },
  subtitle: { 
    fontSize: 14, 
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
    fontSize: 14,
  },
});

