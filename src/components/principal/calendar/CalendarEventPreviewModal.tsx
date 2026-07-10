import React from 'react';
import { View, Modal, TouchableOpacity } from 'react-native';
import { X, Edit2, Trash2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { CALENDAR_COLORS } from './helpers';
import { calendarStyles as styles } from './calendarStyles';
import type { Event } from './types';

export interface CalendarEventPreviewModalProps {
  visible: boolean;
  event: Event | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string | number) => void;
}

export default function CalendarEventPreviewModal({
  visible,
  event,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: CalendarEventPreviewModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">📌 Event Details</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={CALENDAR_COLORS.text} />
            </TouchableOpacity>
          </View>

          {event && (
            <>
              <View style={styles.previewField}>
                <AppText style={styles.previewLabel} weight="semibold">Event Title</AppText>
                <AppText style={styles.previewValue} weight="bold">{event.title}</AppText>
              </View>

              <View style={styles.previewField}>
                <AppText style={styles.previewLabel} weight="semibold">Date</AppText>
                <AppText style={styles.previewValue}>
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </AppText>
              </View>

              <View style={styles.previewField}>
                <AppText style={styles.previewLabel} weight="semibold">Event Type</AppText>
                <AppText style={styles.previewValue} weight="bold">
                  {event.event_type || 'Event'}
                </AppText>
              </View>

              {event.description && (
                <View style={styles.previewField}>
                  <AppText style={styles.previewLabel} weight="semibold">Description</AppText>
                  <AppText style={styles.previewDescription}>{event.description}</AppText>
                </View>
              )}

              <View style={styles.previewButtonGroup}>
                {canEdit && (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.previewEditBtn}
                      onPress={() => onEdit(event)}
                    >
                      <Edit2 size={16} color={Theme.colors.card} />
                      <AppText style={styles.previewEditBtnText} weight="bold">Edit Event</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.previewDeleteBtn}
                      onPress={() => onDelete(event.event_id || event.id || '')}
                    >
                      <Trash2 size={16} color={CALENDAR_COLORS.danger} />
                      <AppText style={styles.previewDeleteBtnText} weight="bold">Delete</AppText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
