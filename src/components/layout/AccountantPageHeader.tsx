import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { HM_THEME } from '../../constants/hmTheme';
import CalendarView from '../common/CalendarView';

type AccountantPageHeaderProps = {
  title: string;
  onBackPress: () => void;
};

const AccountantPageHeader: React.FC<AccountantPageHeaderProps> = ({ title, onBackPress }) => {
  const insets = useSafeAreaInsets();
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}> 
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle} numberOfLines={1}>{title}</AppText>
        </View>

        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
          accessibilityLabel="Open academic calendar"
        >
          <CalendarDays size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarModalHeader}>
              <AppText style={styles.calendarModalTitle}>Academic Calendar</AppText>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <X size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <CalendarView />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    paddingBottom: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  calendarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    maxHeight: '88%',
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default AccountantPageHeader;