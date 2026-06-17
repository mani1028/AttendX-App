import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ArrowLeft, Menu } from 'lucide-react-native';
import { Theme } from '../../theme/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNotifications?: () => void;
  onMenu?: () => void;
  unreadCount?: number;
  rightComponent?: React.ReactNode;
  transparent?: boolean;
  accentColor?: string;
}

export default function Header({
  title,
  subtitle,
  onBack,
  onNotifications,
  onMenu,
  unreadCount = 0,
  rightComponent,
  transparent = false,
  accentColor,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const accent = accentColor ?? Theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        !transparent && styles.solid,
        { paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.inner}>
        {/* Left */}
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ArrowLeft size={22} color={Theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
          ) : onMenu ? (
            <TouchableOpacity onPress={onMenu} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Menu size={22} color={Theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Center */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right */}
        <View style={[styles.side, styles.sideRight]}>
          {rightComponent ?? (
            onNotifications ? (
              <TouchableOpacity onPress={onNotifications} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Bell size={22} color={Theme.colors.text} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  solid: {
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 44,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444', // Red as seen in image
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff', // Thick white border as seen in image
    zIndex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
