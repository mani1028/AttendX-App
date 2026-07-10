import { Theme } from '../../theme/tokens';
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
  primary: Theme.colors.violet,
  primaryLight: Theme.colors.blueLight,
  success: Theme.colors.success,
  danger: Theme.colors.error,
  dangerLight: Theme.colors.redLight,
  amber: Theme.colors.warning,
  bg: '#f0f2f7',
  cardBg: Theme.colors.card,
  border: Theme.colors.border,
  text: Theme.colors.text,
  textSecondary: Theme.colors.textSec,
  textMuted: Theme.colors.textMuted,
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
  holiday: Theme.colors.error,
  festival: Theme.colors.warning,
  exam: Theme.colors.violet,
  event: Theme.colors.success,
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
    if (!date) {return [];}
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
        <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={handlePrevMonth}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{monthName}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={handleNextMonth}>
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
            <TouchableOpacity accessibilityRole="button"
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
                    <TouchableOpacity accessibilityRole="button"
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
            <TouchableOpacity accessibilityRole="button"
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
    marginTop: Theme.spacing.md,
    color: Colors.textMuted,
    ...Theme.typography.body,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text,
  },
  calendarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYear: {
    ...Theme.typography.h3,
    color: Colors.text,
    minWidth: 150,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...Theme.typography.caption,
    fontWeight: '700',
    color: Colors.textMuted,
    paddingVertical: Theme.spacing.sm,
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
    borderRadius: Theme.radius.sm,
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
    ...Theme.typography.caption,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
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
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: 2,
    marginBottom: 2,
  },
  eventText: {
    fontSize: 8,
    fontWeight: '500',
    color: Theme.colors.card,
  },
  moreEvents: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 2,
  },
  eventsList: {
    marginTop: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  eventsTitle: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Theme.spacing.md,
  },
  eventItem: {
    padding: Theme.spacing.md,
    marginBottom: 10,
    backgroundColor: Colors.bg,
    borderLeftWidth: 3,
    borderRadius: Theme.radius.sm,
  },
  eventTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
  eventDate: {
    ...Theme.typography.caption,
    color: Colors.textMuted,
  },
  eventTypeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.primaryLight,
  },
  eventTypeText: {
    fontSize: Theme.typography.label.fontSize,
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
    ...Theme.typography.body,
  },
});
