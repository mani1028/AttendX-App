// src/components/common/CalendarView.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import API from '../../services/api';
import { formatLocalDateKey, getMonthSundayDates } from '../../utils/holidayUtils';

const Colors = {
  primary: "#6648dc",
  primaryLight: "#dbeafe",
  success: "#059669",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  amber: "#d97706",
  bg: "#f0f2f7",
  cardBg: "#ffffff",
  border: "#e4e9f2",
  text: "#0d1b2a",
  textSecondary: "#4a5568",
  textMuted: "#8898aa",
};

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

const EVENT_COLORS: Record<string, string> = {
  holiday: "#dc2626",
  festival: "#d97706",
  exam: "#6648dc",
  event: "#059669",
};

interface CalendarViewProps {
  onEventPress?: (event: Event) => void;
}

export default function CalendarView({ onEventPress }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth())
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await API.get('/director/calendar');
      if (response.data) {
        setEvents(Array.isArray(response.data) ? response.data : response.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
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
    const dateStr = formatLocalDateKey(date);
    return events.filter((e) => e.event_date === dateStr);
  };

  const sundayEvents = getMonthSundayDates(currentDate.getMonth(), currentDate.getFullYear()).map((date) => ({
    event_id: `sunday-${formatLocalDateKey(date)}`,
    title: 'Sunday Holiday',
    event_date: formatLocalDateKey(date),
    event_type: 'holiday',
  }));

  const allEvents = [...events];
  sundayEvents.forEach((holiday) => {
    if (!allEvents.some((event) => event.event_date === holiday.event_date)) {
      allEvents.push(holiday);
    }
  });

  const upcomingEvents = allEvents
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 10);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 School Calendar</Text>
      </View>

      <View style={styles.calendarControls}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{monthName}</Text>
        <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
          <ChevronRight size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Weekdays Header */}
      <View style={styles.weekdaysRow}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View style={styles.daysGrid}>
        {calendarDays.map((date, idx) => {
          const dayEvents = getEventsForDate(date);
          const isOtherMonth = !date;
          const isSunday = Boolean(date && date.getDay() === 0);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                isOtherMonth && styles.otherMonthCell,
                isSunday && styles.sundayCell,
              ]}
              disabled={isOtherMonth}
              onPress={() => {
                if (date && dayEvents.length > 0 && onEventPress) {
                  onEventPress(dayEvents[0]);
                }
              }}
            >
              {date && (
                <>
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayNumber}>{date.getDate()}</Text>
                    {isSunday && <CalendarDays size={12} color={Colors.danger} />}
                  </View>
                  {isSunday && <Text style={styles.holidayLabel}>Sunday</Text>}
                  {dayEvents.slice(0, 2).map((evt) => (
                    <TouchableOpacity
                      key={evt.event_id}
                      style={[
                        styles.eventBadge,
                        { backgroundColor: EVENT_COLORS[evt.event_type || ''] || Colors.primary },
                      ]}
                      onPress={() => onEventPress && onEventPress(evt)}
                    >
                      <Text style={styles.eventText} numberOfLines={1}>
                        {evt.title}
                      </Text>
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

      {/* Upcoming Events List */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsList}>
          <Text style={styles.eventsTitle}>📌 Upcoming Events</Text>
          {upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event.event_id}
              style={[
                styles.eventItem,
                { borderLeftColor: EVENT_COLORS[event.event_type || ''] || Colors.primary },
              ]}
              onPress={() => onEventPress && onEventPress(event)}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              {event.event_type && (
                <View style={styles.eventTypeBadge}>
                  <Text style={styles.eventTypeText}>{event.event_type}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {events.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events scheduled</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cardBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.cardBg,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: 14,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  calendarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 150,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
    color: Colors.textMuted,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 6,
    backgroundColor: Colors.cardBg,
  },
  sundayCell: {
    backgroundColor: '#fff7f7',
    borderColor: '#fecaca',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  otherMonthCell: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  dayNumber: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 4,
    color: Colors.text,
  },
  holidayLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: 2,
  },
  eventBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 2,
  },
  eventText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#fff',
  },
  moreEvents: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 2,
  },
  eventsList: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  eventItem: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: Colors.bg,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  eventTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventTypeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});