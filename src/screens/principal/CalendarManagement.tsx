// src/screens/principal/CalendarManagement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Trash2, Eye, CalendarDays } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import API, { buildApiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';

import type { RootStackParamList } from '../../navigation/types';
import AppText from '../../components/common/AppText';
import { Theme, C } from '../../theme/tokens';



// Types
interface Event {
  event_id: string | number;
  id?: string | number;
  title: string;
  event_date: string;
  description?: string;
  event_type?: string;
  color_code?: string;
}

interface GoogleHoliday {
  title: string;
  date: string;
  month: string;
}

interface FormData {
  title: string;
  date: string;
  description: string;
  type: string;
  color: string;
}

interface HolidayItem {
  name: string;
  date: string;
  category: string;
}

const COLORS: Record<string, string> = {
  holiday: C.error,
  festival: C.warning,
  exam: '#6648dc', // blue
  event: C.success,
  primary: C.primary,
  primaryLight: '#dbeafe', // blueLight
  success: C.success,
  danger: C.error,
  text: C.text,
  textSecondary: C.text2,
  textMuted: C.text3,
  border: C.border,
  bg: C.bg,
  cardBg: C.card,
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const normalizeDateStr = (value?: string | null): string => String(value || '').trim().slice(0, 10);

const normalizeEvent = (event: Event): Event => ({
  ...event,
  event_date: normalizeDateStr(event.event_date),
});

async function getCalendarHeaders(): Promise<Record<string, string>> {
  const schoolCode =
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';
  const branchId =
    (await storage.getString(StorageKeys.BRANCH_ID)) ||
    (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId')) ||
    '';
  return {
    'X-School-Code': schoolCode,
    'x-school-code': schoolCode,
    'X-Branch-Id': branchId,
    'x-branch-id': branchId,
  };
}

export default function CalendarManagement() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState<boolean>(false);
  const [showHolidaysList, setShowHolidaysList] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewingEvent, setPreviewingEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedHolidays, setSelectedHolidays] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: '',
    description: '',
    type: 'holiday',
    color: 'holiday',
  });
  const [fetching, setFetching] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const { width: screenWidth } = useWindowDimensions();
  const isCompactActions = screenWidth < 380;
  const [error, setError] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('IN');
  const { userRole } = useAuth();
  const isStudent = String(userRole || '').trim().toLowerCase() === 'student';
  const canEdit = !isStudent;
  const [googleHolidays, setGoogleHolidays] = useState<GoogleHoliday[]>([]);
  const [fetchingGoogleHolidays, setFetchingGoogleHolidays] = useState<boolean>(false);

  // Custom states for day events viewing on mobile
  const [showDayEventsModal, setShowDayEventsModal] = useState<boolean>(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);

  const handleDayPress = (date: Date, dayEvents: Event[]): void => {
    if (dayEvents.length === 0) {
      if (canEdit) {
        handleAddEvent(date);
      }
    } else {
      setSelectedDayDate(date);
      setSelectedDayEvents(dayEvents);
      setShowDayEventsModal(true);
    }
  };

  const supportedCountries = ['IN', 'US', 'GB', 'AU', 'CA', 'SG', 'MY', 'PK', 'BD'];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      autoFetchHolidays(selectedCountry, false);
    }
  }, [currentDate, selectedCountry]);

  const fetchEvents = useCallback(async (): Promise<void> => {
    try {
      setFetching(true);
      const headers = await getCalendarHeaders();
      const response = await API.get('/principal/calendar', { headers });
      if (response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.events || [];
        setEvents(Array.isArray(raw) ? raw.map(normalizeEvent) : []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setFetching(false);
    }
  }, []);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateEaster = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  const generateIndiaHolidays = (year: number): HolidayItem[] => {
    const holidays = [
      { name: "New Year's Day", date: new Date(year, 0, 1), category: 'national' },
      { name: 'Republic Day', date: new Date(year, 0, 26), category: 'national' },
      { name: 'Independence Day', date: new Date(year, 7, 15), category: 'national' },
      { name: 'Gandhi Jayanti', date: new Date(year, 9, 2), category: 'national' },
      { name: 'Guru Nanak Jayanti', date: new Date(year, 10, 5), category: 'national' },
      { name: 'Christmas', date: new Date(year, 11, 25), category: 'national' },
      { name: 'Dr. B.R. Ambedkar Jayanti', date: new Date(year, 3, 14), category: 'national' },
      {
        name: 'Good Friday',
        date: new Date(calculateEaster(year).getTime() - 2 * 24 * 60 * 60 * 1000),
        category: 'national',
      },
    ];

    return holidays
      .map((h) => ({
        name: h.name,
        date: formatLocalDate(h.date),
        category: h.category,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const autoFetchHolidays = async (country: string, showAlert: boolean = false): Promise<void> => {
    if (!country || !supportedCountries.includes(country)) {
      setError(`Country not supported. Supported: ${supportedCountries.join(', ')}`);
      return;
    }

    setFetchingGoogleHolidays(true);
    try {
      const viewingYear = currentDate.getFullYear();
      const url = `https://date.nager.at/api/v3/publicholidays/${viewingYear}/${country}`;
      const response = await fetch(url);

      if (response.status === 204) {
        if (country === 'IN') {
          const indianHolidays = generateIndiaHolidays(viewingYear);
          const holidays: GoogleHoliday[] = indianHolidays.map((holiday) => ({
            title: holiday.name,
            date: holiday.date,
            month: new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' }),
          }));
          setGoogleHolidays(holidays);
          setError('');
          if (showAlert) {Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);}
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const holidays: GoogleHoliday[] = data
          .filter((holiday: any) => holiday.date && holiday.name)
          .map((holiday: any) => ({
            title: holiday.name,
            date: holiday.date,
            month: new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' }),
          }));
        setGoogleHolidays(holidays);
        setError('');
        if (showAlert) {Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);}
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setError(`Failed to fetch holidays: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGoogleHolidays([]);
      if (showAlert) {Alert.alert('Error', 'Failed to fetch holidays. Please try again.');}
    } finally {
      setFetchingGoogleHolidays(false);
    }
  };

  const handlePrevMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleAddEvent = (date: Date): void => {
    if (!canEdit) {return;}
    setEditingEvent(null);
    setFormData({
      title: '',
      date: formatLocalDate(date),
      description: '',
      type: 'holiday',
      color: 'holiday',
    });
    setShowModal(true);
  };

  const handleSaveEvent = async (): Promise<void> => {
    if (!canEdit) {return;}
    const title = formData.title.trim();
    const eventDate = normalizeDateStr(formData.date);
    if (!title || !eventDate) {
      Alert.alert('Error', 'Title and date are required');
      return;
    }

    try {
      setSaving(true);
      const headers = await getCalendarHeaders();
      const payload = {
        title,
        event_date: eventDate,
        description: formData.description,
        event_type: formData.type,
        color_code: COLORS[formData.color] || COLORS[formData.type] || '#6648dc',
      };

      if (editingEvent) {
        await API.put(`/principal/calendar/${editingEvent.event_id || editingEvent.id}`, payload, { headers });
      } else {
        await API.post('/principal/calendar', payload, { headers });
      }

      setShowModal(false);
      setEditingEvent(null);
      await fetchEvents();
      Alert.alert('Success', editingEvent ? 'Event updated successfully.' : 'Event added successfully.');
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409) {
        Alert.alert('Already exists', String(detail || 'This event already exists on the selected date.'));
      } else if (status === 403) {
        Alert.alert('Read-only year', String(detail || 'The active academic year is closed for edits.'));
      } else {
        Alert.alert('Error', String(detail || err?.message || 'Failed to save event.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string | number): Promise<void> => {
    if (!canEdit) {return;}
    Alert.alert('Delete Event', 'Delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getCalendarHeaders();
            await API.delete(`/principal/calendar/${eventId}`, { headers });
            fetchEvents();
          } catch (err) {
            console.error('Failed to delete event:', err);
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const todayDateStr = formatLocalDate(new Date());

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const getEventsForDate = (date: Date | null): Event[] => {
    if (!date) {return [];}
    const dateStr = formatLocalDate(date);
    return events.filter((e) => normalizeDateStr(e.event_date) === dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (fetching && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>


      <StandardPageHeader
        title="Calendar Planning"
        subtitle="Plan holidays, festivals, and events for the year"
        onBackPress={() => navigation.goBack()}
        showBack={navigation.canGoBack()}
      />

      <ScrollView
        style={[styles.scrollViewContainer, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={innerPageLayoutStyles.contentFront}>
        {/* Action Buttons Row */}
        {canEdit ? (
          <View style={[styles.actionRowContainer, isCompactActions && styles.actionRowContainerStacked]}>
            <TouchableOpacity accessibilityRole="button" style={styles.actionRowButton} onPress={() => setShowHolidaysModal(true)}>
              <CalendarDays size={18} color={C.primary} />
              <AppText style={styles.actionRowButtonText} weight="bold">Public Holidays</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.actionRowButton, styles.actionRowButtonPrimary]} onPress={() => handleAddEvent(new Date())}>
              <Plus size={18} color={Theme.colors.card} />
              <AppText style={[styles.actionRowButtonText, styles.actionRowButtonTextPrimary]} weight="bold">Add Event</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.readOnlyNotice}>
            <AppText style={styles.readOnlyNoticeTitle} weight="bold">Student Access</AppText>
            <AppText style={styles.readOnlyNoticeText}>This calendar is view-only for students.</AppText>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{error}</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={() => autoFetchHolidays(selectedCountry, false)}>
              <AppText style={styles.retryButtonText} weight="bold">Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Calendar Card */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={handlePrevMonth}>
              <ChevronLeft size={20} color={COLORS.text} />
            </TouchableOpacity>
            <AppText style={styles.monthYear} weight="bold">{monthName}</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={handleNextMonth}>
              <ChevronRight size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysRow}>
            {weekDays.map((day) => (
              <AppText key={day} style={styles.weekday} weight="bold">
                {day}
              </AppText>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((date, idx) => {
              const dayEvents = getEventsForDate(date);
              const isOtherMonth = !date;
              const isToday = date ? formatLocalDate(date) === todayDateStr : false;

              return (
                <TouchableOpacity accessibilityRole="button"
                  key={idx}
                  style={[
                    styles.dayCell,
                    isOtherMonth && styles.otherMonthCell,
                    !canEdit && !isOtherMonth && styles.dayCellReadOnly,
                    isToday && styles.dayCellToday,
                  ]}
                  onPress={date ? () => handleDayPress(date, dayEvents) : undefined}
                  disabled={isOtherMonth}
                >
                  {date && (
                    <>
                      <AppText style={[styles.dayNumber, isToday && styles.dayNumberToday]} weight="semibold">
                        {date.getDate()}
                      </AppText>

                      {/* Clean dots indicator below the number */}
                      <View style={styles.dotsContainer}>
                        {dayEvents.slice(0, 3).map((evt) => (
                          <View
                            key={evt.event_id || evt.id}
                            style={[
                              styles.eventDot,
                              { backgroundColor: evt.color_code || COLORS[evt.event_type || ''] || COLORS.primary },
                            ]}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <View style={[styles.eventDot, { backgroundColor: COLORS.textMuted }]} />
                        )}
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Holidays List Toggle */}
        <TouchableOpacity accessibilityRole="button"
          style={styles.holidaysListBtn}
          onPress={() => setShowHolidaysList((prev) => !prev)}
          activeOpacity={0.8}
        >
          <AppText style={styles.holidaysListBtnText} weight="bold">
            📋 {showHolidaysList ? 'Hide' : 'Show'} Holidays List
          </AppText>
        </TouchableOpacity>

        {showHolidaysList && (
          <View style={styles.holidaysSidebar}>
            <AppText style={styles.sidebarTitle} weight="bold">📅 All Events</AppText>
            {events.length === 0 ? (
              <AppText style={styles.emptyText}>No events added yet</AppText>
            ) : (
              <>
                {events.map((event) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={event.event_id || event.id}
                    style={styles.holidayItemCard}
                    activeOpacity={0.9}
                    onPress={() => {
                      setPreviewingEvent(event);
                      setShowPreviewModal(true);
                    }}
                  >
                    <View style={styles.holidayItemContent}>
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.holidayName} weight="bold">{event.title}</AppText>
                        <AppText style={styles.holidayDate}>
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </AppText>
                        {event.event_type && (
                          <AppText style={[styles.eventTypeBadge, { color: event.color_code || COLORS[event.event_type] || COLORS.primary }]} weight="semibold">
                            {event.event_type}
                          </AppText>
                        )}
                      </View>
                      {canEdit && (
                        <View style={styles.holidayItemActions}>
                          <TouchableOpacity accessibilityRole="button"
                            onPress={() => {
                              setEditingEvent(event);
                              setFormData({
                                title: event.title,
                                date: normalizeDateStr(event.event_date),
                                description: event.description || '',
                                type: event.event_type || 'holiday',
                                color: 'holiday',
                              });
                              setShowModal(true);
                            }}
                            style={styles.actionButton}
                          >
                            <Edit2 size={16} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityRole="button" onPress={() => handleDeleteEvent(event.event_id || event.id || '')}>
                            <Trash2 size={16} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Add/Edit Event Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle} weight="bold">{editingEvent ? 'Edit Event' : 'Add Event'}</AppText>
                <TouchableOpacity accessibilityRole="button" onPress={() => setShowModal(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Event Title *</AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Summer Vacation, Diwali Festival"
                    placeholderTextColor={COLORS.textMuted}
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Date *</AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={formData.date}
                    onChangeText={(text) => setFormData({ ...formData, date: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Event Type</AppText>
                  <View style={styles.pickerContainer}>
                    {['holiday', 'festival', 'exam', 'event'].map((type) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={type}
                        style={[
                          styles.typeOption,
                          formData.type === type && styles.typeOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, type })}
                      >
                        <AppText
                          style={[
                            styles.typeOptionText,
                            formData.type === type && styles.typeOptionTextActive,
                          ]}
                          weight="bold"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.label} weight="semibold">Description</AppText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Additional details about this event..."
                    placeholderTextColor={COLORS.textMuted}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={() => setShowModal(false)}>
                    <AppText style={styles.cancelButtonText} weight="bold">Cancel</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.submitButton} onPress={handleSaveEvent} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={Theme.colors.card} />
                    ) : (
                      <AppText style={styles.submitButtonText} weight="bold">
                        {editingEvent ? 'Update Event' : 'Add Event'}
                      </AppText>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">📌 Event Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowPreviewModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {previewingEvent && (
              <>
                <View style={styles.previewField}>
                  <AppText style={styles.previewLabel} weight="semibold">Event Title</AppText>
                  <AppText style={styles.previewValue} weight="bold">{previewingEvent.title}</AppText>
                </View>

                <View style={styles.previewField}>
                  <AppText style={styles.previewLabel} weight="semibold">Date</AppText>
                  <AppText style={styles.previewValue}>
                    {new Date(previewingEvent.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </AppText>
                </View>

                <View style={styles.previewField}>
                  <AppText style={styles.previewLabel} weight="semibold">Event Type</AppText>
                  <AppText style={styles.previewValue} weight="bold">
                    {previewingEvent.event_type || 'Event'}
                  </AppText>
                </View>

                {previewingEvent.description && (
                  <View style={styles.previewField}>
                    <AppText style={styles.previewLabel} weight="semibold">Description</AppText>
                    <AppText style={styles.previewDescription}>{previewingEvent.description}</AppText>
                  </View>
                )}

                <View style={styles.previewButtonGroup}>
                  {canEdit && (
                    <>
                      <TouchableOpacity accessibilityRole="button"
                        style={styles.previewEditBtn}
                        onPress={() => {
                          if (previewingEvent) {
                            setEditingEvent(previewingEvent);
                            setFormData({
                              title: previewingEvent.title,
                              date: normalizeDateStr(previewingEvent.event_date),
                              description: previewingEvent.description || '',
                              type: previewingEvent.event_type || 'holiday',
                              color: 'holiday',
                            });
                            setShowPreviewModal(false);
                            setShowModal(true);
                          }
                        }}
                      >
                        <Edit2 size={16} color={Theme.colors.card} />
                        <AppText style={styles.previewEditBtnText} weight="bold">Edit Event</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button"
                        style={styles.previewDeleteBtn}
                        onPress={() => {
                          setShowPreviewModal(false);
                          handleDeleteEvent(previewingEvent.event_id || previewingEvent.id || '');
                        }}
                      >
                        <Trash2 size={16} color={COLORS.danger} />
                        <AppText style={styles.previewDeleteBtnText} weight="bold">Delete</AppText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Day Events Modal (Clean list view of events on selected day) */}
      <Modal visible={showDayEventsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">
                📅 Events on {selectedDayDate ? selectedDayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowDayEventsModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={innerPageLayoutStyles.scrollViewFront} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: Theme.spacing.md }}>
              {selectedDayEvents.map((evt) => (
                <View
                  key={evt.event_id || evt.id}
                  style={[
                    styles.dayEventCard,
                    { borderLeftColor: evt.color_code || COLORS[evt.event_type || ''] || COLORS.primary },
                  ]}
                >
                  <View style={styles.dayEventCardHeader}>
                    <AppText style={styles.dayEventTitle} weight="bold">{evt.title}</AppText>
                    <AppText style={[styles.dayEventTypeBadge, { backgroundColor: (evt.color_code || COLORS[evt.event_type || ''] || COLORS.primary) + '15', color: evt.color_code || COLORS[evt.event_type || ''] || COLORS.primary }]} weight="bold">
                      {evt.event_type || 'event'}
                    </AppText>
                  </View>
                  {evt.description ? (
                    <AppText style={styles.dayEventDesc}>{evt.description}</AppText>
                  ) : null}

                  {canEdit && (
                    <View style={styles.dayEventCardActions}>
                      <TouchableOpacity accessibilityRole="button"
                        onPress={() => {
                          setShowDayEventsModal(false);
                          setEditingEvent(evt);
                          setFormData({
                            title: evt.title,
                            date: normalizeDateStr(evt.event_date),
                            description: evt.description || '',
                            type: evt.event_type || 'holiday',
                            color: 'holiday',
                          });
                          setShowModal(true);
                        }}
                        style={styles.dayEventActionBtn}
                      >
                        <Edit2 size={16} color={COLORS.primary} />
                        <AppText style={styles.dayEventActionText} weight="bold">Edit</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button"
                        onPress={() => {
                          setShowDayEventsModal(false);
                          handleDeleteEvent(evt.event_id || evt.id || '');
                        }}
                        style={[styles.dayEventActionBtn, styles.dayEventActionBtnDelete]}
                      >
                        <Trash2 size={16} color={COLORS.danger} />
                        <AppText style={[styles.dayEventActionText, styles.dayEventActionTextDelete]} weight="bold">Delete</AppText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.buttonGroup}>
              {canEdit && (
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.submitButton, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                  onPress={() => {
                    setShowDayEventsModal(false);
                    if (selectedDayDate) {handleAddEvent(selectedDayDate);}
                  }}
                >
                  <Plus size={18} color={Theme.colors.card} />
                  <AppText style={styles.submitButtonText} weight="bold">Add Event</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity accessibilityRole="button"
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => setShowDayEventsModal(false)}
              >
                <AppText style={styles.cancelButtonText} weight="bold">Close</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Public Holidays Modal */}
      <Modal visible={showHolidaysModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">🎉 Add School Holidays</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowHolidaysModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.googleApiSection}>
              <AppText style={styles.googleApiTitle} weight="bold">🌍 Public Holidays</AppText>
              <View style={styles.countrySelector}>
                <AppText style={styles.label} weight="semibold">Select Country</AppText>
                <View style={styles.countryButtons}>
                  {supportedCountries.slice(0, 4).map((code) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={code}
                      style={[
                        styles.countryButton,
                        selectedCountry === code && styles.countryButtonActive,
                      ]}
                      onPress={() => setSelectedCountry(code)}
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
              <TouchableOpacity accessibilityRole="button"
                style={styles.fetchButton}
                onPress={() => autoFetchHolidays(selectedCountry, true)}
                disabled={fetchingGoogleHolidays}
              >
                <AppText style={styles.fetchButtonText} weight="bold">
                  {fetchingGoogleHolidays ? 'Fetching...' : '🔄 Fetch Holidays'}
                </AppText>
              </TouchableOpacity>
            </View>

            {fetchingGoogleHolidays ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <AppText style={styles.loadingText}>Loading holidays...</AppText>
              </View>
            ) : googleHolidays.length > 0 ? (
              <ScrollView style={[styles.holidaysList, innerPageLayoutStyles.scrollViewFront]}>
                <AppText style={styles.holidaysListTitle} weight="bold">
                  📌 Available Holidays ({googleHolidays.length})
                </AppText>
                {googleHolidays.map((holiday, index) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={`${holiday.date}-${holiday.title}-${index}`}
                    style={[
                      styles.holidayItem,
                      selectedHolidays[`${holiday.date}-${holiday.title}`] && styles.holidayItemSelected,
                    ]}
                    onPress={() =>
                      setSelectedHolidays({
                        ...selectedHolidays,
                        [`${holiday.date}-${holiday.title}`]: !selectedHolidays[`${holiday.date}-${holiday.title}`],
                      })
                    }
                  >
                    <AppText style={styles.holidayItemText} weight="semibold">{holiday.title}</AppText>
                    <AppText style={styles.holidayItemDate}>{holiday.month}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.buttonGroup}>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={() => setShowHolidaysModal(false)}>
                <AppText style={styles.cancelButtonText} weight="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={styles.submitButton}
                onPress={async () => {
                  const holidaysToAdd = Object.keys(selectedHolidays).filter((key) => selectedHolidays[key]);
                  if (holidaysToAdd.length === 0) {
                    Alert.alert('Error', 'Please select at least one holiday');
                    return;
                  }
                  try {
                    setSaving(true);
                    const headers = await getCalendarHeaders();
                    let added = 0;
                    for (const holidayKey of holidaysToAdd) {
                      const googleHoliday = googleHolidays.find((h) => `${h.date}-${h.title}` === holidayKey);
                      if (googleHoliday) {
                        try {
                          await API.post('/principal/calendar', {
                            title: googleHoliday.title,
                            event_date: googleHoliday.date,
                            description: 'Public Holiday',
                            event_type: 'holiday',
                            color_code: Theme.colors.error,
                          }, { headers });
                          added += 1;
                        } catch (postErr: any) {
                          if (postErr?.response?.status !== 409) {throw postErr;}
                        }
                      }
                    }
                    setSelectedHolidays({});
                    setGoogleHolidays([]);
                    setShowHolidaysModal(false);
                    fetchEvents();
                    Alert.alert('Success', `Added ${added} holiday${added === 1 ? '' : 's'} successfully`);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to add holidays');
                  } finally {
                    setSaving(false);
                  }
                }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollViewContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: Theme.spacing.md,
    borderRadius: 12,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.danger + '40',
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Theme.colors.card,
    fontSize: 13,
  },
  actionRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: Theme.spacing.md,
    marginTop: 14,
    marginBottom: Theme.spacing.sm,
  },
  actionRowContainerStacked: {
    flexDirection: 'column',
  },
  actionRowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  actionRowButtonPrimary: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  actionRowButtonText: {
    fontSize: 13,
    color: C.text,
  },
  actionRowButtonTextPrimary: {
    color: C.white,
  },
  calendarContainer: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    marginTop: 12,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYear: {
    fontSize: 18,
    color: COLORS.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...Theme.typography.caption,
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    padding: 6,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  otherMonthCell: {
    backgroundColor: Theme.colors.background,
    opacity: 0.35,
  },
  dayNumber: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dayCellToday: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary + '30',
  },
  dayNumberToday: {
    color: C.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    width: '100%',
    height: 8,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  holidaysListBtn: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    marginHorizontal: Theme.spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    shadowColor: '#064e3b',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  holidaysListBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
  },
  holidaysSidebar: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  sidebarTitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  holidayItemCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  holidayItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holidayName: {
    ...Theme.typography.body,
    color: COLORS.text,
    marginBottom: Theme.spacing.xs,
  },
  holidayDate: {
    ...Theme.typography.caption,
    color: COLORS.textMuted,
  },
  eventTypeBadge: {
    fontSize: 10,
    marginTop: Theme.spacing.xs,
    textTransform: 'capitalize',
  },
  holidayItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readOnlyNotice: {
    backgroundColor: '#f8fbff',
    padding: Theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    marginHorizontal: Theme.spacing.md,
    marginTop: 12,
    marginBottom: Theme.spacing.sm,
  },
  readOnlyNoticeTitle: {
    ...Theme.typography.body,
    color: COLORS.text,
    marginBottom: Theme.spacing.xs,
  },
  readOnlyNoticeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  dayCellReadOnly: {
    backgroundColor: '#fafafa',
  },
  actionButton: {
    padding: Theme.spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    maxHeight: '88%',
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  modalTitle: {
    fontSize: 18,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    marginBottom: Theme.spacing.sm,
    color: COLORS.text,
    ...Theme.typography.body,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    ...Theme.typography.body,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    color: COLORS.textSecondary,
    ...Theme.typography.caption,
  },
  typeOptionTextActive: {
    color: Theme.colors.card,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.primary,
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Theme.colors.card,
  },
  previewField: {
    marginBottom: Theme.spacing.md,
  },
  previewLabel: {
    ...Theme.typography.caption,
    color: COLORS.textMuted,
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
  },
  previewValue: {
    ...Theme.typography.body,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    color: COLORS.text,
  },
  previewDescription: {
    ...Theme.typography.body,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  previewButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  previewEditBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewEditBtnText: {
    color: Theme.colors.card,
  },
  previewDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewDeleteBtnText: {
    color: COLORS.danger,
  },
  googleApiSection: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  googleApiTitle: {
    ...Theme.typography.bodyMd,
    color: '#166534',
    marginBottom: 12,
  },
  countrySelector: {
    marginBottom: 12,
  },
  countryButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Theme.spacing.sm,
    flexWrap: 'wrap',
  },
  countryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  countryButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  countryButtonText: {
    color: COLORS.textSecondary,
    ...Theme.typography.caption,
  },
  countryButtonTextActive: {
    color: Theme.colors.card,
  },
  fetchButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: Theme.colors.card,
  },
  holidaysList: {
    maxHeight: 250,
    marginBottom: 12,
  },
  holidaysListTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  holidayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
  },
  holidayItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#22c55e',
  },
  holidayItemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  holidayItemDate: {
    ...Theme.typography.label,
    color: COLORS.textMuted,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 4,
  },
  dayEventCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  dayEventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayEventTitle: {
    ...Theme.typography.body,
    color: COLORS.text,
    flex: 1,
  },
  dayEventTypeBadge: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'capitalize',
    overflow: 'hidden',
  },
  dayEventDesc: {
    ...Theme.typography.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: Theme.spacing.sm,
  },
  dayEventCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 10,
    marginTop: Theme.spacing.xs,
  },
  dayEventActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  dayEventActionBtnDelete: {
    backgroundColor: '#fee2e2',
  },
  dayEventActionText: {
    ...Theme.typography.label,
    color: COLORS.primary,
  },
  dayEventActionTextDelete: {
    color: COLORS.danger,
  },
});
