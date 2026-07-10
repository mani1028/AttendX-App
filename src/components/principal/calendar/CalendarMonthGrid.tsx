import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import {
  CALENDAR_COLORS,
  MONTH_NAMES,
  WEEK_DAYS,
  buildCalendarDays,
  formatLocalDate,
  getEventsForDate,
} from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { Event } from './types';

export interface CalendarMonthGridProps {
  currentDate: Date;
  events: Event[];
  canEdit: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: Date, dayEvents: Event[]) => void;
}

export default function CalendarMonthGrid({
  currentDate,
  events,
  canEdit,
  onPrevMonth,
  onNextMonth,
  onDayPress,
}: CalendarMonthGridProps) {
  const monthName = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const calendarDays = buildCalendarDays(currentDate);
  const todayDateStr = formatLocalDate(new Date());

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={onPrevMonth}>
          <ChevronLeft size={20} color={CALENDAR_COLORS.text} />
        </TouchableOpacity>
        <AppText style={styles.monthYear} weight="bold">{monthName}</AppText>
        <TouchableOpacity accessibilityRole="button" style={styles.navButton} onPress={onNextMonth}>
          <ChevronRight size={20} color={CALENDAR_COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdaysRow}>
        {WEEK_DAYS.map((day) => (
          <AppText key={day} style={styles.weekday} weight="bold">
            {day}
          </AppText>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((date, idx) => {
          const dayEvents = getEventsForDate(date, events);
          const isOtherMonth = !date;
          const isToday = date ? formatLocalDate(date) === todayDateStr : false;

          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={idx}
              style={[
                styles.dayCell,
                isOtherMonth && styles.otherMonthCell,
                !canEdit && !isOtherMonth && styles.dayCellReadOnly,
                isToday && styles.dayCellToday,
              ]}
              onPress={date ? () => onDayPress(date, dayEvents) : undefined}
              disabled={isOtherMonth}
            >
              {date && (
                <>
                  <AppText style={[styles.dayNumber, isToday && styles.dayNumberToday]} weight="semibold">
                    {date.getDate()}
                  </AppText>
                  <View style={styles.dotsContainer}>
                    {dayEvents.slice(0, 3).map((evt) => (
                      <View
                        key={evt.event_id || evt.id}
                        style={[
                          styles.eventDot,
                          { backgroundColor: evt.color_code || CALENDAR_COLORS[evt.event_type || ''] || CALENDAR_COLORS.primary },
                        ]}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <View style={[styles.eventDot, { backgroundColor: CALENDAR_COLORS.textMuted }]} />
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
