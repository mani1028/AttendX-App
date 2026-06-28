import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import AppText from '../common/AppText';
import DashboardProfileRow, { DashboardProfileRowProps } from './DashboardProfileRow';
import HeroHeaderShell from '../layout/HeroHeaderShell';

export interface DashboardHeroHeaderProps extends DashboardProfileRowProps {
  pageTitle?: string;
  pageSubtitle?: string;
  showDateBadge?: boolean;
  footer?: React.ReactNode;
  style?: ViewStyle;
  innerStyle?: ViewStyle;
  fullBleed?: boolean;
}

function formatTodayBadge(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardHeroHeader({
  pageTitle,
  pageSubtitle,
  showDateBadge = false,
  footer,
  style,
  innerStyle,
  fullBleed = false,
  ...profileProps
}: DashboardHeroHeaderProps) {
  const showTitleRow = Boolean(pageTitle || pageSubtitle || showDateBadge);

  return (
    <View style={[styles.headerBack, fullBleed && styles.fullBleed, style]}>
      <HeroHeaderShell>
        <View style={[styles.inner, innerStyle]}>
          <DashboardProfileRow {...profileProps} />

          {showTitleRow && (
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                {pageTitle ? (
                  <AppText style={styles.pageTitle} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                    {pageTitle}
                  </AppText>
                ) : null}
                {pageSubtitle ? (
                  <AppText style={styles.pageSubtitle} numberOfLines={1}>
                    {pageSubtitle}
                  </AppText>
                ) : null}
              </View>
              {showDateBadge && (
                <View style={styles.dateBadge}>
                  <Calendar size={12} color={Theme.colors.card} />
                  <AppText style={styles.dateText} weight="bold">
                    {formatTodayBadge()}
                  </AppText>
                </View>
              )}
            </View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </HeroHeaderShell>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    zIndex: 0,
    position: 'relative',
  },
  fullBleed: {
    marginHorizontal: -HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
    marginBottom: 20,
  },
  inner: {
    minHeight: HEADER_CONSTANTS.DASHBOARD_MIN_BODY_HEIGHT,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  titleCopy: {
    flex: 1,
    marginRight: 12,
  },
  pageTitle: {
    fontSize: HEADER_CONSTANTS.HERO_TITLE_SIZE,
    color: Theme.colors.card,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: HEADER_CONSTANTS.HERO_SUBTITLE_SIZE,
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
  },
  footer: {
    marginTop: 16,
  },
});
