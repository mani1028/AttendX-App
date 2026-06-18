import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { Director_THEME } from '../../constants/directorTheme';
import CalendarView from '../common/CalendarView';

type AccountantPageHeaderProps = {
  title: string;
  greeting?: string;
  subtext?: string;
  onBackPress: () => void;
};

const AccountantPageHeader: React.FC<AccountantPageHeaderProps> = ({ title, greeting, subtext, onBackPress }) => {
  const insets = useSafeAreaInsets();
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}> 
        <View style={styles.headerTop}>
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

        {(greeting || subtext) && (
          <View style={styles.headerContent}>
            {greeting && <AppText weight="bold" style={styles.headerGreeting}>{greeting}</AppText>}
            {subtext && <AppText style={styles.headerSubtext}>{subtext}</AppText>}
          </View>
        )}
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
    backgroundColor: '#1e3a8a',
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerGreeting: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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