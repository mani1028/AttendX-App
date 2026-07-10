import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Edit2, Trash2, Plus } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { CALENDAR_COLORS } from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { Event } from './types';

export interface CalendarDayEventsModalProps {
  visible: boolean;
  date: Date | null;
  events: Event[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string | number) => void;
  onAddEvent: () => void;
}

export default function CalendarDayEventsModal({
  visible,
  date,
  events,
  canEdit,
  onClose,
  onEdit,
  onDelete,
  onAddEvent,
}: CalendarDayEventsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">
              📅 Events on {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={CALENDAR_COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={innerPageLayoutStyles.scrollViewFront}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: Theme.spacing.md, paddingBottom: Theme.spacing.md }}
          >
            {events.map((evt) => (
              <View
                key={evt.event_id || evt.id}
                style={[
                  styles.dayEventCard,
                  { borderLeftColor: evt.color_code || CALENDAR_COLORS[evt.event_type || ''] || CALENDAR_COLORS.primary },
                ]}
              >
                <View style={styles.dayEventCardHeader}>
                  <AppText style={styles.dayEventTitle} weight="bold">{evt.title}</AppText>
                  <AppText
                    style={[
                      styles.dayEventTypeBadge,
                      {
                        backgroundColor: (evt.color_code || CALENDAR_COLORS[evt.event_type || ''] || CALENDAR_COLORS.primary) + '15',
                        color: evt.color_code || CALENDAR_COLORS[evt.event_type || ''] || CALENDAR_COLORS.primary,
                      },
                    ]}
                    weight="bold"
                  >
                    {evt.event_type || 'event'}
                  </AppText>
                </View>
                {evt.description ? (
                  <AppText style={styles.dayEventDesc}>{evt.description}</AppText>
                ) : null}

                {canEdit && (
                  <View style={styles.dayEventCardActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => onEdit(evt)}
                      style={styles.dayEventActionBtn}
                    >
                      <Edit2 size={16} color={CALENDAR_COLORS.primary} />
                      <AppText style={styles.dayEventActionText} weight="bold">Edit</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => onDelete(evt.event_id || evt.id || '')}
                      style={[styles.dayEventActionBtn, styles.dayEventActionBtnDelete]}
                    >
                      <Trash2 size={16} color={CALENDAR_COLORS.danger} />
                      <AppText style={[styles.dayEventActionText, styles.dayEventActionTextDelete]} weight="bold">Delete</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonGroup}>
            {canEdit && (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.submitButton, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                onPress={onAddEvent}
              >
                <Plus size={18} color={Theme.colors.card} />
                <AppText style={styles.submitButtonText} weight="bold">Add Event</AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.cancelButton, { flex: 1 }]}
              onPress={onClose}
            >
              <AppText style={styles.cancelButtonText} weight="bold">Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
