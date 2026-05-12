// src/screens/hm/CalendarManagement.tsx

import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Trash2, Eye } from 'lucide-react-native';
import API, { buildApiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

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
  holiday: '#dc2626',
  festival: '#d97706',
  exam: '#2563eb',
  event: '#059669',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  success: '#059669',
  danger: '#dc2626',
  text: '#0d1b2a',
  textSecondary: '#4a5568',
  textMuted: '#8898aa',
  border: '#e4e9f2',
  bg: '#f0f2f7',
  cardBg: '#ffffff',
};

export default function CalendarManagement() {
  const insets = useSafeAreaInsets();
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('IN');
  const { userRole } = useAuth();
  const isStudent = String(userRole || '').trim().toLowerCase() === 'student';
  const canEdit = !isStudent;
  const [googleHolidays, setGoogleHolidays] = useState<GoogleHoliday[]>([]);
  const [fetchingGoogleHolidays, setFetchingGoogleHolidays] = useState<boolean>(false);

  const supportedCountries = ['IN', 'US', 'GB', 'AU', 'CA', 'SG', 'MY', 'PK', 'BD'];

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    if (selectedCountry) {
      autoFetchHolidays(selectedCountry, false);
    }
  }, [currentDate, selectedCountry]);

  const fetchEvents = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await API.get('/hm/calendar');
      if (response.data) {
        setEvents(Array.isArray(response.data) ? response.data : response.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

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
          if (showAlert) Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);
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
        if (showAlert) Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setError(`Failed to fetch holidays: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGoogleHolidays([]);
      if (showAlert) Alert.alert('Error', 'Failed to fetch holidays. Please try again.');
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
    if (!canEdit) return;
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
    if (!canEdit) return;
    if (!formData.title.trim() || !formData.date) {
      Alert.alert('Error', 'Title and date are required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        event_date: formData.date,
        description: formData.description,
        event_type: formData.type,
        color_code: COLORS[formData.color] || COLORS[formData.type] || '#2563eb',
      };

      if (editingEvent) {
        await API.put(`/hm/calendar/${editingEvent.event_id || editingEvent.id}`, payload);
      } else {
        await API.post('/hm/calendar', payload);
      }

      setShowModal(false);
      fetchEvents();
    } catch (err) {
      Alert.alert('Error', 'Error saving event: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string | number): Promise<void> => {
    if (!canEdit) return;
    Alert.alert('Delete Event', 'Delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/hm/calendar/${eventId}`);
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

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const getEventsForDate = (date: Date | null): Event[] => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return events.filter((e) => e.event_date === dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" translucent={false} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isStudent && (
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ChevronLeft size={20} color={COLORS.text} />
              </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>School Calendar</Text>
            <Text style={styles.subtitle}>Review academic events, holidays, and important dates.</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          {canEdit ? (
            <>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowHolidaysModal(true)}>
                <Text style={styles.addButtonText}>📅 Public Holidays</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => handleAddEvent(new Date())}>
                <Plus size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Event</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.readOnlyNotice}>
              <Text style={styles.readOnlyNoticeTitle}>Student access</Text>
              <Text style={styles.readOnlyNoticeText}>This calendar is view-only for students.</Text>
            </View>
          )}
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => autoFetchHolidays(selectedCountry, false)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
            <ChevronLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthYear}>{monthName}</Text>
          <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
            <ChevronRight size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdaysRow}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((date, idx) => {
            const dayEvents = getEventsForDate(date);
            const isOtherMonth = !date;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dayCell, isOtherMonth && styles.otherMonthCell, !canEdit && !isOtherMonth && styles.dayCellReadOnly]}
                onPress={date && canEdit ? () => handleAddEvent(date) : undefined}
                disabled={isOtherMonth || !canEdit}
              >
                {date && (
                  <>
                    <Text style={styles.dayNumber}>{date.getDate()}</Text>
                    {dayEvents.slice(0, 2).map((evt) => (
                      <TouchableOpacity
                        key={evt.event_id}
                        style={[
                          styles.eventBadge,
                          { backgroundColor: evt.color_code || COLORS[evt.event_type || ''] || COLORS.primary },
                        ]}
                        onPress={() => {
                          setPreviewingEvent(evt);
                          setShowPreviewModal(true);
                        }}
                      >
                        <Text style={styles.eventText} numberOfLines={1}>
                          {evt.title}
                        </Text>
                        {canEdit && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(evt.event_id);
                            }}
                            style={styles.deleteIcon}
                          >
                            <Trash2 size={10} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))}
                    {dayEvents.length > 2 && (
                      <Text style={styles.moreEvents}>+{dayEvents.length - 2} more</Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Holidays List Toggle */}
      <TouchableOpacity
        style={styles.holidaysListBtn}
        onPress={() => setShowHolidaysList((prev) => !prev)}
        activeOpacity={0.8}
      >
        <Text style={styles.holidaysListBtnText}>
          📋 {showHolidaysList ? 'Hide' : 'Show'} Holidays List
        </Text>
      </TouchableOpacity>

      {showHolidaysList && (
        <View style={styles.holidaysSidebar}>
          <Text style={styles.sidebarTitle}>📅 All Events</Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events added yet</Text>
          ) : (
            <>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.event_id}
                  style={styles.holidayItemCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    setPreviewingEvent(event);
                    setShowPreviewModal(true);
                  }}
                >
                  <View style={styles.holidayItemContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.holidayName}>{event.title}</Text>
                      <Text style={styles.holidayDate}>
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                      {event.event_type && (
                        <Text style={styles.eventTypeBadge}>{event.event_type}</Text>
                      )}
                    </View>
                    {canEdit && (
                      <View style={styles.holidayItemActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingEvent(event);
                            setFormData({
                              title: event.title,
                              date: event.event_date,
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
                        <TouchableOpacity onPress={() => handleDeleteEvent(event.event_id)}>
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

      {/* Add/Edit Event Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Add Event'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Summer Vacation, Diwali Festival"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.date}
                  onChangeText={(text) => setFormData({ ...formData, date: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Event Type</Text>
                <View style={styles.pickerContainer}>
                  {['holiday', 'festival', 'exam', 'event'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.type === type && styles.typeOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.type === type && styles.typeOptionTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional details about this event..."
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveEvent} disabled={loading}>
                <Text style={styles.submitButtonText}>
                  {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📌 Event Details</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {previewingEvent && (
              <>
                <View style={styles.previewField}>
                  <Text style={styles.previewLabel}>Event Title</Text>
                  <Text style={styles.previewValue}>{previewingEvent.title}</Text>
                </View>

                <View style={styles.previewField}>
                  <Text style={styles.previewLabel}>Date</Text>
                  <Text style={styles.previewValue}>
                    {new Date(previewingEvent.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.previewField}>
                  <Text style={styles.previewLabel}>Event Type</Text>
                  <Text style={styles.previewValue}>
                    {previewingEvent.event_type || 'Event'}
                  </Text>
                </View>

                {previewingEvent.description && (
                  <View style={styles.previewField}>
                    <Text style={styles.previewLabel}>Description</Text>
                    <Text style={styles.previewDescription}>{previewingEvent.description}</Text>
                  </View>
                )}

                <View style={styles.previewButtonGroup}>
                  {canEdit && (
                  <>
                    <TouchableOpacity
                      style={styles.previewEditBtn}
                      onPress={() => {
                        if (previewingEvent) {
                          setEditingEvent(previewingEvent);
                          setFormData({
                            title: previewingEvent.title,
                            date: previewingEvent.event_date,
                            description: previewingEvent.description || '',
                            type: previewingEvent.event_type || 'holiday',
                            color: 'holiday',
                          });
                          setShowPreviewModal(false);
                          setShowModal(true);
                        }
                      }}
                    >
                      <Edit2 size={16} color="#fff" />
                      <Text style={styles.previewEditBtnText}>Edit Event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.previewDeleteBtn}
                      onPress={() => {
                        setShowPreviewModal(false);
                        handleDeleteEvent(previewingEvent.event_id);
                      }}
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                      <Text style={styles.previewDeleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Public Holidays Modal */}
      <Modal visible={showHolidaysModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎉 Add School Holidays</Text>
              <TouchableOpacity onPress={() => setShowHolidaysModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.googleApiSection}>
              <Text style={styles.googleApiTitle}>🌍 Public Holidays</Text>
              <View style={styles.countrySelector}>
                <Text style={styles.label}>Select Country</Text>
                <View style={styles.countryButtons}>
                  {supportedCountries.slice(0, 4).map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.countryButton,
                        selectedCountry === code && styles.countryButtonActive,
                      ]}
                      onPress={() => setSelectedCountry(code)}
                    >
                      <Text
                        style={[
                          styles.countryButtonText,
                          selectedCountry === code && styles.countryButtonTextActive,
                        ]}
                      >
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.fetchButton}
                onPress={() => autoFetchHolidays(selectedCountry, true)}
                disabled={fetchingGoogleHolidays}
              >
                <Text style={styles.fetchButtonText}>
                  {fetchingGoogleHolidays ? 'Fetching...' : '🔄 Fetch Holidays'}
                </Text>
              </TouchableOpacity>
            </View>

            {fetchingGoogleHolidays ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading holidays...</Text>
              </View>
            ) : googleHolidays.length > 0 ? (
              <ScrollView style={styles.holidaysList}>
                <Text style={styles.holidaysListTitle}>
                  📌 Available Holidays ({googleHolidays.length})
                </Text>
                {googleHolidays.map((holiday, index) => (
                  <TouchableOpacity
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
                    <Text style={styles.holidayItemText}>{holiday.title}</Text>
                    <Text style={styles.holidayItemDate}>{holiday.month}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHolidaysModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={async () => {
                  const holidaysToAdd = Object.keys(selectedHolidays).filter((key) => selectedHolidays[key]);
                  if (holidaysToAdd.length === 0) {
                    Alert.alert('Error', 'Please select at least one holiday');
                    return;
                  }
                  try {
                    setLoading(true);
                    for (const holidayKey of holidaysToAdd) {
                      const googleHoliday = googleHolidays.find((h) => `${h.date}-${h.title}` === holidayKey);
                      if (googleHoliday) {
                        await API.post('/hm/calendar', {
                          title: googleHoliday.title,
                          event_date: googleHoliday.date,
                          description: 'Public Holiday',
                          event_type: 'holiday',
                          color_code: '#dc2626',
                        });
                      }
                    }
                    setSelectedHolidays({});
                    setGoogleHolidays([]);
                    setShowHolidaysModal(false);
                    fetchEvents();
                    Alert.alert('Success', `Added ${holidaysToAdd.length} holidays successfully`);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to add holidays');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || googleHolidays.length === 0}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adding...' : 'Add Selected Holidays'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
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
    padding: 16,
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  otherMonthCell: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventText: {
    fontSize: 8,
    color: '#fff',
    flex: 1,
  },
  deleteIcon: {
    paddingHorizontal: 2,
  },
  moreEvents: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  holidaysListBtn: {
    backgroundColor: '#047857',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  holidaysListBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  holidaysSidebar: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  holidayItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  holidayItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holidayName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  eventTypeBadge: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  holidayItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readOnlyNotice: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  readOnlyNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  readOnlyNoticeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  dayCellReadOnly: {
    opacity: 0.75,
    backgroundColor: '#f8fafc',
  },
  actionButton: {
    padding: 4,
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
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: '#fff',
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewField: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    padding: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  previewDescription: {
    fontSize: 14,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
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
    color: '#fff',
    fontWeight: '600',
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
    fontWeight: '600',
  },
  googleApiSection: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  googleApiTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  countrySelector: {
    marginBottom: 12,
  },
  countryButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  countryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  countryButtonText: {
    color: COLORS.text,
  },
  countryButtonTextActive: {
    color: '#fff',
  },
  fetchButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  holidaysList: {
    maxHeight: 400,
  },
  holidaysListTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  holidayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  holidayItemSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  holidayItemText: {
    flex: 1,
    fontWeight: '500',
  },
  holidayItemDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});