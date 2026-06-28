import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronLeft, Calendar, Bell, RefreshCw } from 'lucide-react-native';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import HeroHeaderShell, { heroHeaderStyles } from './HeroHeaderShell';
import { innerPageLayoutStyles } from './innerPageLayoutStyles';

interface StandardPageHeaderProps {
  title: string;
  backgroundColor?: string;
  containerStyle?: ViewStyle;

  onBackPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  /** Multiple right-side action buttons (Notifications-style) */
  rightActions?: React.ReactNode;
  subtitle?: string;
  showCalendar?: boolean;
  /** @deprecated No longer shown — title sits beside back button */
  titleIcon?: React.ReactNode;
  /** Numeric badge beside title (e.g. unread count) */
  titleBadge?: number;
  greeting?: string;
  greetingSubtext?: string;

  dashboardMode?: boolean;
  userName?: string;
  portalLabel?: string;
  greetingOverride?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  showDateBadge?: boolean;
  unreadCount?: number;
  onNotificationsPress?: () => void;
  onRefreshPress?: () => void;
  onAvatarPress?: () => void;
  refreshing?: boolean;
  showBack?: boolean;
  /** When true, render without overlap wrapper — place as first child inside ScrollView. */
  scrollWithContent?: boolean;
  /** When false, fixed header without pulling scroll content into the hero curve. */
  overlapContent?: boolean;
}

function getAutoGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) { return 'MORNING'; }
  if (h < 17) { return 'AFTERNOON'; }
  return 'EVENING';
}

function getInitials(name: string): string {
  if (!name) { return '?'; }
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const StandardPageHeader: React.FC<StandardPageHeaderProps> = ({
  title,
  onBackPress,
  rightIcon,
  onRightIconPress,
  rightActions,
  subtitle,
  containerStyle,
  backgroundColor = Theme.colors.primary,
  showCalendar,
  titleBadge,
  greeting,
  greetingSubtext,
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
  scrollWithContent = false,
  overlapContent = true,
}) => {
  const useInnerPage = !scrollWithContent && overlapContent;
  const useOverlapWrapper = !scrollWithContent && overlapContent;
  const gradientColors =
    backgroundColor && backgroundColor !== Theme.colors.primary
      ? ([backgroundColor, backgroundColor] as [string, string])
      : ([HEADER_CONSTANTS.GRADIENT_START, HEADER_CONSTANTS.GRADIENT_END] as [string, string]);

  const renderRightActions = () => {
    if (rightActions) { return rightActions; }
    if (rightIcon || showCalendar) {
      return (
        <TouchableOpacity
          accessibilityRole="button"
          style={heroHeaderStyles.iconBtn}
          onPress={onRightIconPress}
          accessibilityLabel="Right action"
        >
          {showCalendar ? <Calendar size={20} color={Theme.colors.card} /> : rightIcon}
        </TouchableOpacity>
      );
    }
    return null;
  };

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
      <HeroHeaderShell colors={gradientColors} style={containerStyle}>
        <View style={heroHeaderStyles.topBar}>
          <View style={heroHeaderStyles.iconBtnSpacer} />
          <View style={heroHeaderStyles.actions}>
            {onNotificationsPress && (
              <TouchableOpacity
                style={heroHeaderStyles.iconBtn}
                onPress={onNotificationsPress}
                accessibilityLabel="Notifications"
              >
                <Bell size={20} color={Theme.colors.card} />
                {unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <AppText style={styles.notifDotText} weight="bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {onRefreshPress && (
              <TouchableOpacity
                style={heroHeaderStyles.iconBtn}
                onPress={onRefreshPress}
                disabled={refreshing}
                accessibilityLabel="Refresh"
              >
                <RefreshCw size={18} color={Theme.colors.card} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={heroHeaderStyles.contentRow}>
          <TouchableOpacity
            style={heroHeaderStyles.titleIconRing}
            activeOpacity={0.85}
            onPress={onAvatarPress}
            disabled={!onAvatarPress}
          >
            <AppText style={heroHeaderStyles.titleIconLetter} weight="bold">{initials}</AppText>
          </TouchableOpacity>
          <View style={heroHeaderStyles.textBlock}>
            <AppText style={heroHeaderStyles.subtitle}>{greetingLine}</AppText>
            <AppText style={heroHeaderStyles.title} numberOfLines={1}>
              {displayName} 👋
            </AppText>
          </View>
        </View>

        {portalLabel ? (
          <AppText style={styles.portalLabel}>{portalLabel}</AppText>
        ) : null}

        <View style={styles.dashFooterRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={heroHeaderStyles.title} numberOfLines={1} adjustsFontSizeToFit>
              {displayTitle}
            </AppText>
            {(pageSubtitle || subtitle) ? (
              <AppText style={heroHeaderStyles.subtitle} numberOfLines={1}>
                {pageSubtitle || subtitle}
              </AppText>
            ) : null}
          </View>
          {showDateBadge && (
            <View style={styles.dateBadge}>
              <Calendar size={11} color={Theme.colors.card} />
              <AppText style={styles.dateText} weight="bold">{today}</AppText>
            </View>
          )}
        </View>
      </HeroHeaderShell>
    );
  }

  const hasRightSlot =
    !!rightActions ||
    !!rightIcon ||
    showCalendar ||
    (titleBadge != null && titleBadge > 0);

  const headerShell = (
    <HeroHeaderShell
      colors={gradientColors}
      innerPage={useInnerPage}
      style={containerStyle}
    >
      <View style={styles.navRow}>
        <View style={styles.navLeading}>
          {showBack && onBackPress ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onBackPress}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={22} strokeWidth={2} color={Theme.colors.card} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.titleBlock}>
            <AppText style={styles.pageTitle} numberOfLines={1}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText style={styles.pageSubtitle} numberOfLines={1}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </View>

        {hasRightSlot ? (
          <View style={heroHeaderStyles.actions}>
            {titleBadge != null && titleBadge > 0 && (
              <View style={heroHeaderStyles.titleBadge}>
                <AppText style={heroHeaderStyles.titleBadgeText}>{titleBadge}</AppText>
              </View>
            )}
            {renderRightActions()}
          </View>
        ) : null}
      </View>

      {greeting ? (
        <View style={styles.legacyGreeting}>
          <AppText style={styles.legacyGreetingTitle}>{greeting}</AppText>
          {greetingSubtext ? (
            <AppText style={heroHeaderStyles.subtitle}>{greetingSubtext}</AppText>
          ) : null}
        </View>
      ) : null}
    </HeroHeaderShell>
  );

  // ── Inner-page Mode — fixed overlap OR scroll-embedded header ───────────────
  if (scrollWithContent) {
    return headerShell;
  }

  if (useOverlapWrapper) {
    return (
      <View style={innerPageLayoutStyles.headerWrapper}>
        {headerShell}
      </View>
    );
  }

  return headerShell;
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
  },
  navLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: HEADER_CONSTANTS.INNER_PAGE_TITLE_SIZE,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    textAlign: 'left',
    lineHeight: 28,
  },
  pageSubtitle: {
    fontSize: HEADER_CONSTANTS.HERO_SUBTITLE_SIZE,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'left',
  },
  portalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  dashFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
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
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Theme.colors.error,
    borderWidth: 1.5,
    borderColor: HEADER_CONSTANTS.GRADIENT_START,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notifDotText: {
    color: Theme.colors.card,
    fontSize: 8,
    textAlign: 'center',
  },
  legacyGreeting: {
    marginTop: 16,
  },
  legacyGreetingTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.card,
    marginBottom: Theme.spacing.xs,
  },
});

export default StandardPageHeader;
