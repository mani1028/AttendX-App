import React, { useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Calendar, Clock, Trash2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { getTypeConfig, formatDate, formatFullDate } from './helpers';
import { notificationsStyles as styles } from './notificationsStyles';
import type { Notification } from './helpers';


// ─── Notification Card ────────────────────────────────────────────────────────
export default function NotificationCard({
  item,
  onPress,
  onDelete,
}: {
  item: Notification;
  onPress: () => void;
  onDelete: () => void;
}) {
  const cfg = getTypeConfig(item.type);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: pressAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.card, !item.is_read && styles.cardUnread]}>
          {/* Unread accent bar */}
          {!item.is_read && <View style={[styles.unreadBar, { backgroundColor: cfg.color }]} />}

          <View style={styles.cardInner}>
            {/* Icon badge */}
            <View style={[styles.iconBadge, { backgroundColor: cfg.bg }]}>
              {cfg.icon}
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                  <AppText style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</AppText>
                </View>
                <View style={styles.timeRow}>
                  <Clock size={10} color={Theme.colors.textMuted} />
                  <AppText style={styles.timeText}>{formatDate(item.created_at)}</AppText>
                </View>
              </View>

              <AppText style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </AppText>

              {item.event_date && (
                <View style={styles.eventChip}>
                  <Calendar size={11} color={cfg.color} />
                  <AppText style={[styles.eventChipText, { color: cfg.color }]}>
                    {formatFullDate(item.event_date)}
                  </AppText>
                </View>
              )}
            </View>

            {/* Actions column */}
            <View style={styles.cardActions}>
              {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={14} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
