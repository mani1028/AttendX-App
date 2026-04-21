import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppCard from './AppCard';

interface Event {
  event_id: string;
  title: string;
  event_date: string;
  event_type: string;
}

const COLORS: Record<string, string> = {
  holiday: '#dc2626',
  festival: '#d97706',
  exam: '#2563eb',
  event: '#059669',
};

const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await API.get('/hm/calendar');
      const data = res.data;
      setEvents(Array.isArray(data) ? data : data?.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

  const getEventsForDate = (date: Date | null): Event[] => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return events.filter(e => e.event_date === dateStr);
  };

  const upcomingEvents = events
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 10);

  const goPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const goNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  if (loading) return <ActivityIndicator size="large" style={{ margin: 40 }} />;

  return (
    <AppCard style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthYear}>{monthName}</Text>
        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekday}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((date, idx) => {
          const dayEvents = date ? getEventsForDate(date) : [];
          return (
            <View key={idx} style={[styles.dayCell, !date && styles.otherMonth]}>
              {date && (
                <>
                  <Text style={styles.dayNumber}>{date.getDate()}</Text>
                  {dayEvents.map(ev => (
                    <View key={ev.event_id} style={[styles.eventChip, { backgroundColor: COLORS[ev.event_type] || colors.primary }]}>
                      <Text style={styles.eventText} numberOfLines={1}>{ev.title}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })}
      </View>

      {upcomingEvents.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>📌 Upcoming Events</Text>
          {upcomingEvents.map(ev => (
            <View key={ev.event_id} style={[styles.eventItem, { borderLeftColor: COLORS[ev.event_type] || colors.primary }]}>
              <Text style={styles.eventItemTitle}>{ev.title}</Text>
              <Text style={styles.eventItemDate}>{new Date(ev.event_date).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { padding: 8, backgroundColor: '#dbeafe', borderRadius: 8 },
  navText: { fontSize: 16 },
  monthYear: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  weekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekday: { width: '14%', textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#64748b' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 4, margin: 1, backgroundColor: '#fff' },
  otherMonth: { opacity: 0.5 },
  dayNumber: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  eventChip: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginTop: 2 },
  eventText: { fontSize: 8, color: '#fff', fontWeight: '600' },
  upcomingSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  upcomingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  eventItem: { padding: 10, backgroundColor: '#f8fafc', borderLeftWidth: 3, borderRadius: 6, marginBottom: 8 },
  eventItemTitle: { fontWeight: '600', fontSize: 13 },
  eventItemDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
});