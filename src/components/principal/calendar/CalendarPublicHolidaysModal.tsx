import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppText from '../../common/AppText';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { CALENDAR_COLORS } from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { GoogleHoliday } from './types';

export interface CalendarPublicHolidaysModalProps {
  visible: boolean;
  supportedCountries: string[];
  selectedCountry: string;
  googleHolidays: GoogleHoliday[];
  selectedHolidays: Record<string, boolean>;
  fetchingGoogleHolidays: boolean;
  saving: boolean;
  onClose: () => void;
  onCountryChange: (code: string) => void;
  onFetch: () => void;
  onToggleHoliday: (key: string) => void;
  onAddSelected: () => void;
}

export default function CalendarPublicHolidaysModal({
  visible,
  supportedCountries,
  selectedCountry,
  googleHolidays,
  selectedHolidays,
  fetchingGoogleHolidays,
  saving,
  onClose,
  onCountryChange,
  onFetch,
  onToggleHoliday,
  onAddSelected,
}: CalendarPublicHolidaysModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">🎉 Add School Holidays</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={CALENDAR_COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.googleApiSection}>
            <AppText style={styles.googleApiTitle} weight="bold">🌍 Public Holidays</AppText>
            <View style={styles.countrySelector}>
              <AppText style={styles.label} weight="semibold">Select Country</AppText>
              <View style={styles.countryButtons}>
                {supportedCountries.slice(0, 4).map((code) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={code}
                    style={[
                      styles.countryButton,
                      selectedCountry === code && styles.countryButtonActive,
                    ]}
                    onPress={() => onCountryChange(code)}
                  >
                    <AppText
                      style={[
                        styles.countryButtonText,
                        selectedCountry === code && styles.countryButtonTextActive,
                      ]}
                      weight="bold"
                    >
                      {code}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.fetchButton}
              onPress={onFetch}
              disabled={fetchingGoogleHolidays}
            >
              <AppText style={styles.fetchButtonText} weight="bold">
                {fetchingGoogleHolidays ? 'Fetching...' : '🔄 Fetch Holidays'}
              </AppText>
            </TouchableOpacity>
          </View>

          {fetchingGoogleHolidays ? (
            <View style={styles.loadingContainer}>
              <ScreenSkeleton variant="list" />
              <AppText style={styles.loadingText}>Loading holidays...</AppText>
            </View>
          ) : googleHolidays.length > 0 ? (
            <ScrollView style={[styles.holidaysList, innerPageLayoutStyles.scrollViewFront]}>
              <AppText style={styles.holidaysListTitle} weight="bold">
                📌 Available Holidays ({googleHolidays.length})
              </AppText>
              {googleHolidays.map((holiday, index) => {
                const key = `${holiday.date}-${holiday.title}`;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={`${key}-${index}`}
                    style={[
                      styles.holidayItem,
                      selectedHolidays[key] && styles.holidayItemSelected,
                    ]}
                    onPress={() => onToggleHoliday(key)}
                  >
                    <AppText style={styles.holidayItemText} weight="semibold">{holiday.title}</AppText>
                    <AppText style={styles.holidayItemDate}>{holiday.month}</AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.buttonGroup}>
            <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={onClose}>
              <AppText style={styles.cancelButtonText} weight="bold">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.submitButton}
              onPress={onAddSelected}
              disabled={saving || googleHolidays.length === 0}
            >
              <AppText style={styles.submitButtonText} weight="bold">
                {saving ? 'Adding...' : 'Add Selected Holidays'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
