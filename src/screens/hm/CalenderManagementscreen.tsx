import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import API, { buildApiUrl } from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  primarySoft: colors.primary + '20',
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
};

const COLORS = {
  holiday: '#ef4444', // red-500
  festival: '#f59e0b', // amber-500
  exam: '#6366f1', // indigo-500
  event: '#10b981', // emerald-500
};

const COLOR_OPTIONS = [
  { label: 'Red (Holiday)', value: 'holiday', hex: '#ef4444' },
  { label: 'Amber (Festival)', value: 'festival', hex: '#f59e0b' },
  { label: 'Blue (Exam)', value: 'exam', hex: '#6366f1' },
  { label: 'Green (Event)', value: 'event', hex: '#10b981' },
];

const supportedCountries = ['IN', 'US', 'GB', 'AU', 'CA', 'SG', 'MY', 'PK', 'BD'];

interface Event {
  event_id?: string;
  id?: string;
  title: string;
  event_date: string;
  description?: string;
  event_type: string;
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

export default function CalendarManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [showHolidaysList, setShowHolidaysList] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedHolidays, setSelectedHolidays] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: '',
    description: '',
    type: 'holiday',
    color: 'holiday',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [googleHolidays, setGoogleHolidays] = useState<GoogleHoliday[]>([]);
  const [fetchingGoogleHolidays, setFetchingGoogleHolidays] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchEvents();
    loadSavedCountry();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      autoFetchHolidays(selectedCountry, false);
    }
  }, [currentDate, selectedCountry]);

  const loadSavedCountry = async () => {
    try {
      const savedCountry = await AsyncStorage.getItem('selected_country');
      if (savedCountry) {
        setSelectedCountry(savedCountry);
      }
    } catch (error) {
      console.error('Failed to load country:', error);
    }
  };

  const fetchEvents = async () => {
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

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateIndiaHolidays = (year: number) => {
    const holidays = [
      { name: "New Year's Day", date: new Date(year, 0, 1), category: 'national' },
      { name: 'Republic Day', date: new Date(year, 0, 26), category: 'national' },
      { name: 'Independence Day', date: new Date(year, 7, 15), category: 'national' },
      { name: 'Gandhi Jayanti', date: new Date(year, 9, 2), category: 'national' },
      { name: 'Guru Nanak Jayanti', date: new Date(year, 10, 5), category: 'national' },
      { name: 'Christmas', date: new Date(year, 11, 25), category: 'national' },
      { name: 'Dr. B.R. Ambedkar Jayanti', date: new Date(year, 3, 14), category: 'national' },
      { name: 'Good Friday', date: new Date(calculateEaster(year).getTime() - 2 * 24 * 60 * 60 * 1000), category: 'national' },
    ];

    return holidays
      .map((h) => ({
        name: h.name,
        date: formatLocalDate(h.date),
        category: h.category,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getIndiaHolidaysForYear = (year: number) => {
    return generateIndiaHolidays(year);
  };

  const autoFetchHolidays = async (country: string, showAlert: boolean = false) => {
    if (!country || !supportedCountries.includes(country)) {
      setError(`Country not supported. Supported countries: ${supportedCountries.join(', ')}`);
      return;
    }

    setFetchingGoogleHolidays(true);
    try {
      const viewingYear = currentDate.getFullYear();
      const url = `https://date.nager.at/api/v3/publicholidays/${viewingYear}/${country}`;
      const response = await fetch(url, { method: 'GET' });

      if (response.status === 204) {
        if (country === 'IN') {
          const indianHolidays = getIndiaHolidaysForYear(viewingYear);
          const holidays = indianHolidays.map((holiday) => ({
            title: holiday.name,
            date: holiday.date,
            month: new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' }),
          }));
          setGoogleHolidays(holidays);
          setError('');
          if (showAlert) {
            Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);
          }
          return;
        }
        setGoogleHolidays([]);
        setError(`No holiday data available for ${country}`);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const holidays = data
          .filter((holiday: any) => holiday.date && holiday.name)
          .map((holiday: any) => ({
            title: holiday.name,
            date: holiday.date,
            month: new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' }),
          }))
          .sort((a: GoogleHoliday, b: GoogleHoliday) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setGoogleHolidays(holidays);
        setError('');
        if (showAlert) {
          Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`);
        }
        return;
      } else {
        throw new Error(`Holiday API failed: ${response.status}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Failed to fetch holidays: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGoogleHolidays([]);
    } finally {
      setFetchingGoogleHolidays(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleAddEvent = (date?: Date) => {
    setEditingEvent(null);
    setFormData({
      title: '',
      date: date ? formatLocalDate(date) : formatLocalDate(new Date()),
      description: '',
      type: 'holiday',
      color: 'holiday',
    });
    setShowModal(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.event_date,
      description: event.description || '',
      type: event.event_type || 'holiday',
      color: Object.keys(COLORS).find(key => COLORS[key as keyof typeof COLORS] === event.color_code) || 'holiday',
    });
    setShowModal(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim() || !formData.date) {
      Alert.alert('Error', 'Title and date are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        title: formData.title,
        event_date: formData.date,
        description: formData.description,
        event_type: formData.type,
        color_code: COLORS[formData.color as keyof typeof COLORS] || COLORS[formData.type as keyof typeof COLORS] || '#2563eb',
      };

      if (editingEvent) {
        await API.put(`/hm/calendar/${editingEvent.event_id || editingEvent.id}`, payload);
      } else {
        await API.post('/hm/calendar', payload);
      }

      setShowModal(false);
      fetchEvents();
    } catch (err) {
      setError('Error saving event: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
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
      ]
    );
  };

  const handleAddPublicHolidays = async () => {
    const holidaysToAdd = Object.keys(selectedHolidays).filter((key) => selectedHolidays[key]);

    if (holidaysToAdd.length === 0) {
      Alert.alert('Info', 'Please select at least one holiday');
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
      Alert.alert('Success', 'Holidays added successfully');
    } catch (err) {
      console.error('Failed to add holidays:', err);
      Alert.alert('Error', 'Failed to add some holidays');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

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

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return events.filter((e) => e.event_date === dateStr);
  };

  const renderCalendarDay = ({ item: date, index }: { item: Date | null; index: number }) => {
    const dayEvents = getEventsForDate(date);
    const isCurrentMonth = date !== null;
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.dayCell, !isCurrentMonth && styles.otherMonthCell]}
        onPress={() => isCurrentMonth && handleAddEvent(date)}
        disabled={!isCurrentMonth}
      >
        {date && (
          <>
            <AppText style={styles.dayNumber}>{date.getDate()}</AppText>
            {dayEvents.map((evt) => (
              <View key={evt.event_id} style={styles.eventContainer}>
                <TouchableOpacity
                  style={[styles.eventName, { backgroundColor: COLORS[evt.event_type as keyof typeof COLORS] || C.primary }]}
                  onPress={() => handleEditEvent(evt)}
                >
                  <AppText style={styles.eventText} numberOfLines={1}>
                    {evt.title}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteEvent(evt.event_id || evt.id || '')}
                  style={styles.deleteIcon}
                >
                  <Icon name="trash-2" size={12} color={C.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderHolidayItem = ({ item: holiday }: { item: GoogleHoliday }) => {
    const holidayKey = `${holiday.date}-${holiday.title}`;
    return (
      <TouchableOpacity
        style={[styles.holidayItem, selectedHolidays[holidayKey] && styles.holidayItemSelected]}
        onPress={() => setSelectedHolidays({
          ...selectedHolidays,
          [holidayKey]: !selectedHolidays[holidayKey],
        })}
      >
        <View style={styles.holidayItemContent}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, selectedHolidays[holidayKey] && styles.checkboxChecked]}>
              {selectedHolidays[holidayKey] && <Icon name="check" size={14} color="#fff" />}
            </View>
          </View>
          <AppText style={styles.holidayLabel}>{holiday.title}</AppText>
          <AppText style={styles.holidayMonth}>{holiday.month}</AppText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventListItem = ({ item: event }: { item: Event }) => (
    <View style={[styles.holidayItemCard, { borderLeftColor: COLORS[event.event_type as keyof typeof COLORS] || C.primary }]}>
      <View style={styles.eventListItemContent}>
        <View style={styles.eventInfo}>
          <AppText style={styles.holidayName}>{event.title}</AppText>
          <AppText style={styles.holidayDate}>
            {new Date(event.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </AppText>
        </View>
        <View style={styles.eventActions}>
          <TouchableOpacity onPress={() => handleEditEvent(event)} style={styles.actionButton}>
            <Icon name="edit-2" size={16} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteEvent(event.event_id || event.id || '')} style={styles.actionButton}>
            <Icon name="trash-2" size={16} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.title}>Calendar Management</AppText>
          <AppText style={styles.subtitle}>Plan holidays, festivals, and events for the year</AppText>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowHolidaysModal(true)}>
            <Icon name="calendar" size={18} color="#fff" />
            <AppText style={styles.addBtnText}>Public Holidays</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleAddEvent(new Date())}>
            <Icon name="plus" size={18} color="#fff" />
            <AppText style={styles.addBtnText}>Add Event</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
            <Icon name="chevron-left" size={20} color={C.text} />
          </TouchableOpacity>
          <AppText style={styles.monthYear}>{monthName}</AppText>
          <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
            <Icon name="chevron-right" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdaysRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <AppText key={day} style={styles.weekday}>{day}</AppText>
          ))}
        </View>

        <FlatList
          data={calendarDays}
          renderItem={renderCalendarDay}
          keyExtractor={(_, index) => index.toString()}
          numColumns={7}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.holidaysListBtn} onPress={() => setShowHolidaysList(!showHolidaysList)}>
          <AppText style={styles.holidaysListBtnText}>📋 {showHolidaysList ? 'Hide' : 'Show'} Holidays List</AppText>
        </TouchableOpacity>

        {showHolidaysList && (
          <View style={styles.holidaysSidebar}>
            <AppText style={styles.sidebarTitle}>📅 Created Holidays</AppText>
            {events.length === 0 ? (
              <AppText style={styles.noHolidaysText}>No holidays added yet</AppText>
            ) : (
              <>
                <FlatList
                  data={events}
                  renderItem={renderEventListItem}
                  keyExtractor={(item) => item.event_id || item.id || Math.random().toString()}
                  scrollEnabled={false}
                />
                <View style={styles.shareButtons}>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert('Success', '✅ Holidays are now visible to all Teachers!')}>
                    <AppText style={styles.shareBtnText}>👨‍🏫 Share to Teachers</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert('Success', '✅ Holidays are now visible to all Students!')}>
                    <AppText style={styles.shareBtnText}>👨‍🎓 Share to Students</AppText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Add/Edit Event Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Add Event'}</AppText>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="x" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Event Title *</AppText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Vacation, Diwali Festival"
                placeholderTextColor={C.textMuted}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Date *</AppText>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <AppText style={{ color: C.text }}>{formData.date || 'Select Date'}</AppText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date ? new Date(formData.date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setFormData({ ...formData, date: formatLocalDate(selectedDate) });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Event Type</AppText>
              <View style={styles.selectWrapper}>
                {['holiday', 'festival', 'exam', 'event'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, formData.type === type && styles.typeOptionSelected]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <AppText style={[styles.typeOptionText, formData.type === type && styles.typeOptionTextSelected]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Color</AppText>
              <View style={styles.colorPicker}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.hex },
                      formData.color === color.value && styles.colorOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Description</AppText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details about this event..."
                placeholderTextColor={C.textMuted}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEvent} disabled={loading}>
                <AppText style={styles.submitBtnText}>
                  {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Public Holidays Modal */}
      <Modal
        visible={showHolidaysModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHolidaysModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.holidaysModalContent]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>🎉 Add School Holidays</AppText>
              <TouchableOpacity onPress={() => setShowHolidaysModal(false)}>
                <Icon name="x" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <AppText style={styles.holidaysModalText}>
              Select holidays to add to your school calendar. You can include or exclude any holidays based on your school's academic calendar.
            </AppText>
            <AppText style={styles.holidaysModalSubtext}>
              ✓ Check the holidays your school observes • ✗ Uncheck those that don't apply to your school
            </AppText>

            <View style={styles.googleApiSection}>
              <AppText style={styles.googleApiTitle}>🌍 Public Holidays (via Nager.Date API)</AppText>
              <AppText style={styles.googleApiSubtext}>Free holiday data - no API key required</AppText>
              
              <View style={styles.googleApiRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.smallLabel}>Select Country</AppText>
                  <View style={styles.selectWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {supportedCountries.map((country) => (
                        <TouchableOpacity
                          key={country}
                          style={[styles.countryOption, selectedCountry === country && styles.countryOptionSelected]}
                          onPress={() => {
                            setSelectedCountry(country);
                            AsyncStorage.setItem('selected_country', country);
                          }}
                        >
                          <AppText style={[styles.countryOptionText, selectedCountry === country && styles.countryOptionTextSelected]}>
                            {country}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.fetchBtn}
                  onPress={() => autoFetchHolidays(selectedCountry, true)}
                  disabled={fetchingGoogleHolidays}
                >
                  <AppText style={styles.fetchBtnText}>
                    {fetchingGoogleHolidays ? 'Fetching...' : '🔄 Fetch'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {error ? <AppText style={styles.apiErrorText}>{error}</AppText> : null}
              
              {googleHolidays.length > 0 && (
                <AppText style={styles.successText}>
                  ✅ {googleHolidays.length} holidays available ({Object.values(selectedHolidays).filter(Boolean).length} selected)
                </AppText>
              )}
            </View>

            {googleHolidays.length > 0 && (
              <>
                <AppText style={styles.availableHolidaysTitle}>📌 Available Holidays ({googleHolidays.length})</AppText>
                <FlatList
                  data={googleHolidays}
                  renderItem={renderHolidayItem}
                  keyExtractor={(item) => `${item.date}-${item.title}`}
                  style={styles.holidaysList}
                  scrollEnabled={true}
                />
              </>
            )}

            {googleHolidays.length === 0 && (
              <AppText style={styles.noHolidaysText}>
                🔄 Click "Fetch" above to load the complete holiday list for your school calendar year
              </AppText>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowHolidaysModal(false)}>
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddPublicHolidays}
                disabled={loading || googleHolidays.length === 0}
              >
                <AppText style={styles.submitBtnText}>
                  {loading ? 'Adding...' : 'Add Selected'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarContainer: {
    backgroundColor: C.card,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    padding: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 8,
  },
  monthYear: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
    color: C.textMuted,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 8,
    margin: 2,
  },
  otherMonthCell: {
    backgroundColor: C.bg,
    opacity: 0.5,
  },
  dayNumber: {
    fontWeight: '600',
    fontSize: 14,
    color: C.text,
    marginBottom: 4,
  },
  eventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventName: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 2,
  },
  eventText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  deleteIcon: {
    padding: 2,
  },
  bottomSection: {
    margin: 16,
  },
  holidaysListBtn: {
    backgroundColor: C.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  holidaysListBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  holidaysSidebar: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: C.text,
  },
  holidayItemCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  eventListItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  holidayName: {
    fontWeight: '600',
    color: C.text,
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: C.success,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  holidaysModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  errorText: {
    color: C.error,
    marginBottom: 12,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    color: C.text,
    fontSize: 14,
  },
  smallLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: C.text,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    color: C.text,
    backgroundColor: C.bg,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: C.bg,
  },
  selectWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  typeOptionText: {
    fontSize: 12,
    color: C.textMuted,
  },
  typeOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: C.text,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: C.textMuted,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: C.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  holidaysModalText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  holidaysModalSubtext: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 20,
  },
  googleApiSection: {
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  googleApiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  googleApiSubtext: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 12,
  },
  googleApiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  countryOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 6,
    marginBottom: 4,
  },
  countryOptionSelected: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  countryOptionText: {
    fontSize: 11,
    color: C.textMuted,
  },
  countryOptionTextSelected: {
    color: C.primary,
    fontWeight: '700',
  },
  fetchBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  fetchBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  apiErrorText: {
    color: C.error,
    fontSize: 11,
    marginTop: 8,
  },
  successText: {
    color: C.success,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  availableHolidaysTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  holidaysList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  holidayItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  holidayItemSelected: {
    backgroundColor: C.primarySoft,
  },
  holidayItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.primary,
  },
  holidayLabel: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  holidayMonth: {
    fontSize: 12,
    color: C.textMuted,
  },
  noHolidaysText: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 12,
    paddingVertical: 20,
  },
});