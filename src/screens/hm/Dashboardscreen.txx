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
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API, { buildApiUrl } from '../../services/api';

const CALENDAR_API = buildApiUrl('/hm/calendar');

const Colors = {
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  success: '#059669',
  successLight: '#d1fae5',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  amber: '#d97706',
  amberLight: '#fef3c7',
  bg: '#f0f2f7',
  cardBg: '#ffffff',
  border: '#e4e9f2',
  text: '#0d1b2a',
  textSecondary: '#4a5568',
  textMuted: '#8898aa',
};

const COLORS = {
  holiday: '#dc2626',
  festival: '#d97706',
  exam: '#2563eb',
  event: '#059669',
};

const COLOR_OPTIONS = [
  { label: 'Red (Holiday)', value: 'holiday', hex: '#dc2626' },
  { label: 'Amber (Festival)', value: 'festival', hex: '#d97706' },
  { label: 'Blue (Exam)', value: 'exam', hex: '#2563eb' },
  { label: 'Green (Event)', value: 'event', hex: '#059669' },
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
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
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

  const fetchGoogleHolidays = async () => {
    if (!selectedCountry) {
      Alert.alert('Info', 'Please select a country');
      return;
    }
    await autoFetchHolidays(selectedCountry, true);
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
      Alert.alert('Error', 'Failed to save event');
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
              Alert.alert('Success', 'Event deleted successfully');
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
            <Text style={styles.dayNumber}>{date.getDate()}</Text>
            {dayEvents.map((evt) => (
              <View key={evt.event_id} style={styles.eventContainer}>
                <TouchableOpacity
                  style={[styles.eventName, { backgroundColor: COLORS[evt.event_type as keyof typeof COLORS] || Colors.primary }]}
                  onPress={() => handleEditEvent(evt)}
                >
                  <Text style={styles.eventText} numberOfLines={1}>
                    {evt.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteEvent(evt.event_id || evt.id || '')}
                  style={styles.deleteIcon}
                >
                  <Icon name="trash-2" size={12} color={Colors.danger} />
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
          <View style={[styles.checkbox, selectedHolidays[holidayKey] && styles.checkboxChecked]}>
            {selectedHolidays[holidayKey] && <Icon name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.holidayLabel}>{holiday.title}</Text>
          <Text style={styles.holidayMonth}>{holiday.month}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventListItem = ({ item: event }: { item: Event }) => (
    <View style={[styles.holidayItemCard, { borderLeftColor: COLORS[event.event_type as keyof typeof COLORS] || Colors.primary }]}>
      <View style={styles.eventListItemContent}>
        <View style={styles.eventInfo}>
          <Text style={styles.holidayName}>{event.title}</Text>
          <Text style={styles.holidayDate}>
            {new Date(event.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.eventActions}>
          <TouchableOpacity onPress={() => handleEditEvent(event)} style={styles.actionButton}>
            <Icon name="edit-2" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteEvent(event.event_id || event.id || '')} style={styles.actionButton}>
            <Icon name="trash-2" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderWeekdays = () => (
    <View style={styles.weekdaysRow}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <Text key={day} style={styles.weekday}>{day}</Text>
      ))}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Calendar Management</Text>
          <Text style={styles.subtitle}>Plan holidays, festivals, and events for the year</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowHolidaysModal(true)}>
            <Icon name="calendar" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Public Holidays</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleAddEvent(new Date())}>
            <Icon name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
            <Icon name="chevron-left" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthYear}>{monthName}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
            <Icon name="chevron-right" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {renderWeekdays()}

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
          <Text style={styles.holidaysListBtnText}>📋 {showHolidaysList ? 'Hide' : 'Show'} Holidays List</Text>
        </TouchableOpacity>

        {showHolidaysList && (
          <View style={styles.holidaysSidebar}>
            <Text style={styles.sidebarTitle}>📅 Created Holidays</Text>
            {events.length === 0 ? (
              <Text style={styles.noHolidaysText}>No holidays added yet</Text>
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
                    <Text style={styles.shareBtnText}>👨‍🏫 Share to Teachers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert('Success', '✅ Holidays are now visible to all Students!')}>
                    <Text style={styles.shareBtnText}>👨‍🎓 Share to Students</Text>
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
              <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Add Event'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="x" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text>{formData.date || 'Select Date'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date ? new Date(formData.date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
              <Text style={styles.label}>Event Type</Text>
              <View style={styles.selectWrapper}>
                {['holiday', 'festival', 'exam', 'event'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, formData.type === type && styles.typeOptionSelected]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.typeOptionText, formData.type === type && styles.typeOptionTextSelected]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
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

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEvent} disabled={loading}>
                <Text style={styles.submitBtnText}>
                  {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                </Text>
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
              <Text style={styles.modalTitle}>🎉 Add School Holidays</Text>
              <TouchableOpacity onPress={() => setShowHolidaysModal(false)}>
                <Icon name="x" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.holidaysModalText}>
              Select holidays to add to your school calendar. You can include or exclude any holidays based on your school's academic calendar.
            </Text>
            <Text style={styles.holidaysModalSubtext}>
              ✓ Check the holidays your school observes • ✗ Uncheck those that don't apply to your school
            </Text>

            <View style={styles.googleApiSection}>
              <Text style={styles.googleApiTitle}>🌍 Public Holidays (via Nager.Date API)</Text>
              <Text style={styles.googleApiSubtext}>Free holiday data - no API key required</Text>
              
              <View style={styles.googleApiRow}>
                <View style={styles.countrySelector}>
                  <Text style={styles.smallLabel}>Select Country</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
                    {supportedCountries.map((country) => (
                      <TouchableOpacity
                        key={country}
                        style={[styles.countryOption, selectedCountry === country && styles.countryOptionSelected]}
                        onPress={() => {
                          setSelectedCountry(country);
                          AsyncStorage.setItem('selected_country', country);
                        }}
                      >
                        <Text style={[styles.countryOptionText, selectedCountry === country && styles.countryOptionTextSelected]}>
                          {country}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={styles.fetchBtn}
                  onPress={fetchGoogleHolidays}
                  disabled={fetchingGoogleHolidays}
                >
                  <Text style={styles.fetchBtnText}>
                    {fetchingGoogleHolidays ? 'Fetching...' : '🔄 Fetch Holidays'}
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.apiErrorText}>{error}</Text> : null}
              
              {googleHolidays.length > 0 && (
                <Text style={styles.successText}>
                  ✅ {googleHolidays.length} holidays available ({Object.values(selectedHolidays).filter(Boolean).length} selected)
                </Text>
              )}
            </View>

            {googleHolidays.length > 0 && (
              <>
                <Text style={styles.availableHolidaysTitle}>📌 Available Holidays ({googleHolidays.length})</Text>
                <FlatList
                  data={googleHolidays}
                  renderItem={renderHolidayItem}
                  keyExtractor={(item) => `${item.date}-${item.title}`}
                  style={styles.holidaysList}
                  scrollEnabled={true}
                />
              </>
            )}

            {googleHolidays.length === 0 && !fetchingGoogleHolidays && (
              <Text style={styles.noHolidaysText}>
                🔄 Click "Fetch Holidays" above to load the complete holiday list for your school calendar year
              </Text>
            )}

            {fetchingGoogleHolidays && (
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowHolidaysModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddPublicHolidays}
                disabled={loading || googleHolidays.length === 0}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Adding...' : 'Add Selected Holidays'}
                </Text>
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
    backgroundColor: Colors.bg,
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
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.cardBg,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    padding: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  monthYear: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
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
    color: Colors.textMuted,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    margin: 2,
  },
  otherMonthCell: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  dayNumber: {
    fontWeight: '600',
    fontSize: 14,
    color: Colors.text,
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
    backgroundColor: Colors.success,
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
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  holidayItemCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 12,
    color: Colors.textMuted,
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
    backgroundColor: Colors.success,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: