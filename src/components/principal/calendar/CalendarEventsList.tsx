import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { CALENDAR_COLORS } from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { Event } from './types';

export interface CalendarEventsListProps {
  events: Event[];
  showHolidaysList: boolean;
  canEdit: boolean;
  onToggleList: () => void;
  onPreview: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string | number) => void;
}

export default function CalendarEventsList({
  events,
  showHolidaysList,
  canEdit,
  onToggleList,
  onPreview,
  onEdit,
  onDelete,
}: CalendarEventsListProps) {
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.holidaysListBtn}
        onPress={onToggleList}
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
            events.map((event) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={event.event_id || event.id}
                style={styles.holidayItemCard}
                activeOpacity={0.9}
                onPress={() => onPreview(event)}
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
                      <AppText
                        style={[
                          styles.eventTypeBadge,
                          { color: event.color_code || CALENDAR_COLORS[event.event_type] || CALENDAR_COLORS.primary },
                        ]}
                        weight="semibold"
                      >
                        {event.event_type}
                      </AppText>
                    )}
                  </View>
                  {canEdit && (
                    <View style={styles.holidayItemActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => onEdit(event)}
                        style={styles.actionButton}
                      >
                        <Edit2 size={16} color={CALENDAR_COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => onDelete(event.event_id || event.id || '')}
                      >
                        <Trash2 size={16} color={CALENDAR_COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </>
  );
}
