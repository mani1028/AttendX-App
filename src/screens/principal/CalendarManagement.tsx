// src/screens/principal/CalendarManagement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Alert, useWindowDimensions } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { Theme } from '../../theme/tokens';
import {
  type Event,
  type GoogleHoliday,
  type FormData,
  CALENDAR_COLORS,
  SUPPORTED_COUNTRIES,
  normalizeDateStr,
  normalizeEvent,
  getCalendarHeaders,
  formatLocalDate,
  generateIndiaHolidays,
  calendarStyles,
  CalendarActionBar,
  CalendarErrorBanner,
  CalendarMonthGrid,
  CalendarEventsList,
  CalendarEventFormModal,
  CalendarEventPreviewModal,
  CalendarDayEventsModal,
  CalendarPublicHolidaysModal,
} from '../../components/principal/calendar';

const styles = calendarStyles;

export default function CalendarManagement() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [showHolidaysList, setShowHolidaysList] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const isCompactActions = screenWidth < 380;
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const { userRole } = useAuth();
  const isStudent = String(userRole || '').trim().toLowerCase() === 'student';
  const canEdit = !isStudent;
  const [googleHolidays, setGoogleHolidays] = useState<GoogleHoliday[]>([]);
  const [fetchingGoogleHolidays, setFetchingGoogleHolidays] = useState(false);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);

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

  const autoFetchHolidays = async (country: string, showAlert: boolean = false): Promise<void> => {
    if (!country || !SUPPORTED_COUNTRIES.includes(country)) {
      setError(`Country not supported. Supported: ${SUPPORTED_COUNTRIES.join(', ')}`);
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
          if (showAlert) { Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`); }
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const holidays: GoogleHoliday[] = data
          .filter((holiday: { date?: string; name?: string }) => holiday.date && holiday.name)
          .map((holiday: { name: string; date: string }) => ({
            title: holiday.name,
            date: holiday.date,
            month: new Date(holiday.date).toLocaleDateString('en-US', { month: 'long' }),
          }));
        setGoogleHolidays(holidays);
        setError('');
        if (showAlert) { Alert.alert('Success', `Found ${holidays.length} holidays for ${viewingYear}`); }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setError(`Failed to fetch holidays: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGoogleHolidays([]);
      if (showAlert) { Alert.alert('Error', 'Failed to fetch holidays. Please try again.'); }
    } finally {
      setFetchingGoogleHolidays(false);
    }
  };

  const handleDayPress = (date: Date, dayEvents: Event[]): void => {
    if (dayEvents.length === 0) {
      if (canEdit) { handleAddEvent(date); }
    } else {
      setSelectedDayDate(date);
      setSelectedDayEvents(dayEvents);
      setShowDayEventsModal(true);
    }
  };

  const handlePrevMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleAddEvent = (date: Date): void => {
    if (!canEdit) { return; }
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

  const openEditForm = (event: Event): void => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: normalizeDateStr(event.event_date),
      description: event.description || '',
      type: event.event_type || 'holiday',
      color: 'holiday',
    });
    setShowModal(true);
  };

  const handleSaveEvent = async (): Promise<void> => {
    if (!canEdit) { return; }
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
        color_code: CALENDAR_COLORS[formData.color] || CALENDAR_COLORS[formData.type] || Theme.colors.violet,
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
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      const status = apiErr?.response?.status;
      const detail = apiErr?.response?.data?.detail;
      if (status === 409) {
        Alert.alert('Already exists', String(detail || 'This event already exists on the selected date.'));
      } else if (status === 403) {
        Alert.alert('Read-only year', String(detail || 'The active academic year is closed for edits.'));
      } else {
        Alert.alert('Error', String(detail || apiErr?.message || 'Failed to save event.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string | number): Promise<void> => {
    if (!canEdit) { return; }
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

  const handleAddSelectedHolidays = async (): Promise<void> => {
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
          } catch (postErr: unknown) {
            const status = (postErr as { response?: { status?: number } })?.response?.status;
            if (status !== 409) { throw postErr; }
          }
        }
      }
      setSelectedHolidays({});
      setGoogleHolidays([]);
      setShowHolidaysModal(false);
      fetchEvents();
      Alert.alert('Success', `Added ${added} holiday${added === 1 ? '' : 's'} successfully`);
    } catch {
      Alert.alert('Error', 'Failed to add holidays');
    } finally {
      setSaving(false);
    }
  };

  if (fetching && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenSkeleton variant="list" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={[styles.scrollViewContainer, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Calendar Planning"
          subtitle="Plan holidays, festivals, and events for the year"
          onBackPress={() => navigation.goBack()}
          showBack={navigation.canGoBack()}
        />

        <View style={innerPageLayoutStyles.contentFront}>
          <CalendarActionBar
            canEdit={canEdit}
            isCompactActions={isCompactActions}
            onPublicHolidays={() => setShowHolidaysModal(true)}
            onAddEvent={() => handleAddEvent(new Date())}
          />

          <CalendarErrorBanner
            error={error}
            onRetry={() => autoFetchHolidays(selectedCountry, false)}
          />

          <CalendarMonthGrid
            currentDate={currentDate}
            events={events}
            canEdit={canEdit}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayPress={handleDayPress}
          />

          <CalendarEventsList
            events={events}
            showHolidaysList={showHolidaysList}
            canEdit={canEdit}
            onToggleList={() => setShowHolidaysList((prev) => !prev)}
            onPreview={(event) => {
              setPreviewingEvent(event);
              setShowPreviewModal(true);
            }}
            onEdit={openEditForm}
            onDelete={handleDeleteEvent}
          />

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <CalendarEventFormModal
        visible={showModal}
        editingEvent={editingEvent}
        formData={formData}
        saving={saving}
        onClose={() => setShowModal(false)}
        onChange={setFormData}
        onSave={handleSaveEvent}
      />

      <CalendarEventPreviewModal
        visible={showPreviewModal}
        event={previewingEvent}
        canEdit={canEdit}
        onClose={() => setShowPreviewModal(false)}
        onEdit={(event) => {
          setShowPreviewModal(false);
          openEditForm(event);
        }}
        onDelete={(eventId) => {
          setShowPreviewModal(false);
          handleDeleteEvent(eventId);
        }}
      />

      <CalendarDayEventsModal
        visible={showDayEventsModal}
        date={selectedDayDate}
        events={selectedDayEvents}
        canEdit={canEdit}
        onClose={() => setShowDayEventsModal(false)}
        onEdit={(evt) => {
          setShowDayEventsModal(false);
          openEditForm(evt);
        }}
        onDelete={(eventId) => {
          setShowDayEventsModal(false);
          handleDeleteEvent(eventId);
        }}
        onAddEvent={() => {
          setShowDayEventsModal(false);
          if (selectedDayDate) { handleAddEvent(selectedDayDate); }
        }}
      />

      <CalendarPublicHolidaysModal
        visible={showHolidaysModal}
        supportedCountries={SUPPORTED_COUNTRIES}
        selectedCountry={selectedCountry}
        googleHolidays={googleHolidays}
        selectedHolidays={selectedHolidays}
        fetchingGoogleHolidays={fetchingGoogleHolidays}
        saving={saving}
        onClose={() => setShowHolidaysModal(false)}
        onCountryChange={setSelectedCountry}
        onFetch={() => autoFetchHolidays(selectedCountry, true)}
        onToggleHoliday={(key) =>
          setSelectedHolidays((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        onAddSelected={handleAddSelectedHolidays}
      />
    </View>
  );
}
