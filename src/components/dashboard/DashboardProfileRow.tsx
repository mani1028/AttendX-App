import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ViewStyle,
} from 'react-native';
import { Bell, RefreshCw } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import AvatarBubble from '../common/AvatarBubble';
import AppText from '../common/AppText';

function getAutoGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) { return 'MORNING'; }
  if (h < 17) { return 'AFTERNOON'; }
  return 'EVENING';
}

function getInitials(name: string): string {
  if (!name) { return '?'; }
  return name
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface DashboardProfileRowProps {
  userName: string;
  /** e.g. "GOOD EVENING" — auto-computed when omitted */
  greetingLine?: string;
  /** Shown under the name, e.g. formatted date */
  subtitle?: string;
  unreadCount?: number;
  onAvatarPress?: () => void;
  onGreetingPress?: () => void;
  onNotificationsPress?: () => void;
  onRefreshPress?: () => void;
  refreshing?: boolean;
  photoUri?: string | null;
  photoError?: boolean;
  onPhotoError?: () => void;
  style?: ViewStyle;
  showWave?: boolean;
  avatarSize?: number;
}

export default function DashboardProfileRow({
  userName,
  greetingLine,
  subtitle,
  unreadCount = 0,
  onAvatarPress,
  onGreetingPress,
  onNotificationsPress,
  onRefreshPress,
  refreshing = false,
  photoUri,
  photoError = false,
  onPhotoError,
  style,
  showWave = true,
}: DashboardProfileRowProps) {
  const displayName = (userName || 'User').split(' ')[0];
  const greeting = greetingLine || `GOOD ${getAutoGreeting()}`;
  const initials = getInitials(userName || 'U');

  const greetingContent = (
    <>
      <Text style={styles.greetingLabel}>{greeting}</Text>
      <Text style={styles.greetingName} numberOfLines={1}>
        {displayName}{showWave ? ' 👋' : ''}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </>
  );

  return (
    <View style={[styles.row, style]}>
      <View style={styles.leftCluster}>
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.85}
          onPress={onAvatarPress}
          disabled={!onAvatarPress}
          accessibilityLabel="Open profile"
        >
          {photoUri && !photoError ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.avatarImage}
              onError={onPhotoError}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <AppText style={styles.avatarText} weight="bold">{initials}</AppText>
            </View>
          )}
        </TouchableOpacity>

        {onGreetingPress ? (
          <TouchableOpacity style={styles.greetingStack} activeOpacity={0.7} onPress={onGreetingPress}>
            {greetingContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.greetingStack}>{greetingContent}</View>
        )}
      </View>

      <View style={styles.actions}>
        {onNotificationsPress && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onNotificationsPress}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={Theme.colors.card} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {onRefreshPress && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefreshPress}
            disabled={refreshing}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={18} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** Initials-only avatar variant for screens using AvatarBubble sizing */
export function DashboardProfileRowBubble({
  userName,
  greetingLine,
  subtitle,
  unreadCount = 0,
  onAvatarPress,
  onNotificationsPress,
  style,
  avatarSize = 44,
}: Omit<DashboardProfileRowProps, 'photoUri' | 'photoError' | 'onPhotoError' | 'onRefreshPress' | 'refreshing'>) {
  const displayName = (userName || 'User').split(' ')[0];
  const greeting = greetingLine || `GOOD ${getAutoGreeting()}`;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.leftCluster}>
        <TouchableOpacity activeOpacity={0.85} onPress={onAvatarPress} disabled={!onAvatarPress}>
          <AvatarBubble
            displayName={userName || 'User'}
            size={avatarSize}
            textSize={avatarSize * 0.38}
            primaryColor={Theme.colors.card}
          />
        </TouchableOpacity>
        <View style={styles.greetingStack}>
          <Text style={styles.greetingLabel}>{greeting}</Text>
          <Text style={styles.greetingName} numberOfLines={1}>{displayName} 👋</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {onNotificationsPress && (
        <TouchableOpacity style={styles.iconBtn} onPress={onNotificationsPress}>
          <Bell size={20} color={Theme.colors.card} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Theme.colors.card,
    fontSize: 16,
  },
  greetingStack: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  greetingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  greetingName: {
    fontSize: 16,
    color: Theme.colors.card,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  iconBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HEADER_CONSTANTS.ICON_BUTTON_BG,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Theme.colors.gradientStart,
  },
  badgeText: {
    color: Theme.colors.card,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
