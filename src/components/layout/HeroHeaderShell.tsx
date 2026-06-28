import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

interface HeroHeaderShellProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override gradient colors */
  colors?: [string, string];
  /** Inner-page hero header — tall curve with overlap zone (Marks Entry style) */
  innerPage?: boolean;
}

/** Shared curved gradient header container — matches Notifications hero style. */
export default function HeroHeaderShell({
  children,
  style,
  colors = [HEADER_CONSTANTS.GRADIENT_START, HEADER_CONSTANTS.GRADIENT_END],
  innerPage = false,
}: HeroHeaderShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradient,
        innerPage && styles.gradientInnerPage,
        { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) },
        style,
      ]}
    >
      <View style={styles.decCircle1} />
      <View style={styles.decCircle2} />
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

export const heroHeaderStyles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: HEADER_CONSTANTS.HERO_TOP_BAR_GAP,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: HEADER_CONSTANTS.ICON_BUTTON_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnSpacer: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  titleIconRing: {
    width: HEADER_CONSTANTS.TITLE_ICON_RING_SIZE,
    height: HEADER_CONSTANTS.TITLE_ICON_RING_SIZE,
    borderRadius: HEADER_CONSTANTS.TITLE_ICON_RING_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  titleIconLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: HEADER_CONSTANTS.HERO_TITLE_SIZE,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: HEADER_CONSTANTS.HERO_SUBTITLE_SIZE,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
    fontWeight: '500',
  },
  titleBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  titleBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: HEADER_CONSTANTS.HERO_PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
    shadowColor: HEADER_CONSTANTS.GRADIENT_START,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 0,
  },
  gradientInnerPage: {
    paddingBottom: HEADER_CONSTANTS.INNER_PAGE_PADDING_BOTTOM,
    elevation: 0,
    zIndex: 0,
  },
  inner: {
    paddingHorizontal: HEADER_CONSTANTS.DASHBOARD_HORIZONTAL,
  },
  decCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  decCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: 60,
  },
});
