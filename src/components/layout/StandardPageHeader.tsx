import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronLeft, Calendar, Bell, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import LinearGradient from 'react-native-linear-gradient';

// ────────────────────────────────────────────────────────────────────────────
// StandardPageHeader
//
// Unified header component used across ALL roles.
//
// Two modes:
//
// 1. Inner-page mode (default) — compact nav bar with back button + centred title.
//    Props: title, onBackPress, rightIcon?, subtitle?, showCalendar?
//
// 2. Dashboard mode — full-height hero with avatar, greeting, bell, date badge.
//    Activate by passing `dashboardMode={true}`. Requires: userName.
//    Optional: portalLabel, dateBadge, onNotificationsPress, onRefreshPress,
//              unreadCount, onAvatarPress, greeting (overrides auto-computed).
// ────────────────────────────────────────────────────────────────────────────

interface StandardPageHeaderProps {
  // ── Shared ──
  title: string;
  backgroundColor?: string;
  containerStyle?: ViewStyle;

  // ── Inner-page mode ──
  onBackPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  subtitle?: string;
  showCalendar?: boolean;
  /** @deprecated use greeting/greetingSubtext on dashboard mode */
  greeting?: string;
  /** @deprecated */
  greetingSubtext?: string;

  // ── Dashboard mode ──
  dashboardMode?: boolean;
  userName?: string;
  portalLabel?: string;
  /** Custom greeting line — defaults to "GOOD MORNING / AFTERNOON / EVENING" */
  greetingOverride?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  showDateBadge?: boolean;
  unreadCount?: number;
  onNotificationsPress?: () => void;
  onRefreshPress?: () => void;
  onAvatarPress?: () => void;
  refreshing?: boolean;
  /** Hide/show the back button in inner-page mode */
  showBack?: boolean;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
const StandardPageHeader: React.FC<StandardPageHeaderProps> = ({
  title,
  onBackPress,
  rightIcon,
  onRightIconPress,
  subtitle,
  containerStyle,
  backgroundColor = Theme.colors.primary,
  showCalendar,
  greeting,
  greetingSubtext,

  // Dashboard mode
  dashboardMode = false,
  userName,
  portalLabel,
  greetingOverride,
  pageTitle,
  pageSubtitle,
  showDateBadge = true,
  unreadCount = 0,
  onNotificationsPress,
  onRefreshPress,
  onAvatarPress,
  refreshing = false,
  showBack = true,
}) => {
  const insets = useSafeAreaInsets();

  const gradientColors =
    backgroundColor && backgroundColor !== Theme.colors.primary
      ? [backgroundColor, backgroundColor]
      : ([Theme.colors.gradientStart, Theme.colors.gradientEnd] as [string, string]);

  // ── Dashboard Mode ─────────────────────────────────────────────────────────
  if (dashboardMode) {
    const displayName = (userName || 'User').split(' ')[0];
    const initials = getInitials(userName || 'U');
    const greetingLine = greetingOverride || `GOOD ${getAutoGreeting()}`;
    const displayTitle = pageTitle || title;
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.dashboardHeader,
          {
            paddingTop: insets.top + 16,
            borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
            borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
          },
          containerStyle,
        ]}
      >
        {/* Row 1 — Avatar + Greeting + Actions */}
        <View style={styles.dashRow1}>
          <View style={styles.dashLeft}>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarCircle}
              activeOpacity={0.8}
              onPress={onAvatarPress}
              accessibilityLabel="Open profile"
            >
              <AppText style={styles.avatarText} weight="bold">{initials}</AppText>
            </TouchableOpacity>

            {/* Greeting copy */}
            <View style={styles.greetingStack}>
              <AppText style={styles.greetingLabel}>{greetingLine}</AppText>
              <AppText style={styles.greetingName} numberOfLines={1}>
                {displayName} 👋
              </AppText>
            </View>
          </View>

          {/* Action icons */}
          <View style={styles.dashActions}>
            {onNotificationsPress && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onNotificationsPress}
                accessibilityLabel="Notifications"
              >
                <Bell size={18} color={Theme.colors.card} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText} weight="bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {onRefreshPress && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onRefreshPress}
                accessibilityLabel="Refresh"
                disabled={refreshing}
              >
                <RefreshCw size={18} color={Theme.colors.card} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Portal label */}
        {portalLabel && (
          <AppText style={styles.portalLabel}>{portalLabel}</AppText>
        )}

        {/* Row 2 — Page title + Date badge */}
        <View style={styles.dashRow2}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={styles.dashTitle} numberOfLines={1} adjustsFontSizeToFit>
              {displayTitle}
            </AppText>
            {(pageSubtitle || subtitle) && (
              <AppText style={styles.dashSubtitle} numberOfLines={1}>
                {pageSubtitle || subtitle}
              </AppText>
            )}
          </View>

          {showDateBadge && (
            <View style={styles.dateBadge}>
              <Calendar size={11} color={Theme.colors.card} />
              <AppText style={styles.dateText} weight="bold">{today}</AppText>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ── Inner-page Mode ────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.headerStandard,
        { paddingTop: insets.top + 20, paddingHorizontal: 0 },
        containerStyle,
      ]}
    >
      <View style={[styles.navRow, { paddingHorizontal: 20 }]}>
        {/* Back button — shown when showBack=true and onBackPress provided */}
        {showBack && onBackPress ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.backButton}
            onPress={onBackPress}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} strokeWidth={2} color={Theme.colors.card} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: HEADER_CONSTANTS.ICON_BUTTON_SIZE }} />
        )}

        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
        </View>

        {(rightIcon || showCalendar) ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.rightButton}
            onPress={onRightIconPress}
            accessibilityLabel="Right action"
          >
            {showCalendar ? <Calendar size={22} color={Theme.colors.card} /> : rightIcon}
          </TouchableOpacity>
        ) : (
          <View style={{ width: HEADER_CONSTANTS.ICON_BUTTON_SIZE }} />
        )}
      </View>

      {/* Legacy greeting slot (kept for backward compat) */}
      {greeting && (
        <View style={[styles.greetingContainer, { paddingHorizontal: 20 }]}>
          <AppText style={styles.greetingText}>{greeting}</AppText>
          {greetingSubtext && (
            <AppText style={styles.greetingSubtext}>{greetingSubtext}</AppText>
          )}
        </View>
      )}
    </LinearGradient>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Inner-page ──────────────────────────────────────────────
  headerStandard: {
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: HEADER_CONSTANTS.TEXT_COLOR,
    textAlign: 'center',
  },
  subtitle: {
    ...Theme.typography.caption,
    color: `rgba(255,255,255,${HEADER_CONSTANTS.SUBTITLE_OPACITY})`,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  rightButton: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
  },
  greetingContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  greetingText: {
    ...Theme.typography.h2,
    color: Theme.colors.card,
    marginBottom: Theme.spacing.xs,
  },
  greetingSubtext: {
    ...Theme.typography.body,
    color: 'rgba(255,255,255,0.8)',
  },

  // ── Dashboard mode ──────────────────────────────────────────
  dashboardHeader: {
    paddingBottom: 24,
    paddingHorizontal: 18,
  },
  dashRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dashLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: Theme.colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  greetingStack: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greetingName: {
    fontSize: 16,
    color: Theme.colors.card,
    fontWeight: '700',
  },
  dashActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Theme.colors.error,
    borderWidth: 1.5,
    borderColor: Theme.colors.gradientStart,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: Theme.colors.card,
    fontSize: 8,
    textAlign: 'center',
  },
  portalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 2,
  },
  dashRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dashTitle: {
    fontSize: 20,
    color: Theme.colors.card,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dashSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateText: {
    fontSize: 11,
    color: Theme.colors.card,
    fontWeight: '700',
  },
});

export default StandardPageHeader;
