import { Theme } from '../theme/tokens';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import type { StoredAccount } from '../services/accountStorage';

type Props = {
  account: StoredAccount;
  onPress?: (a: StoredAccount) => void;
  onDelete?: (a: StoredAccount) => void;
};

const AccountCard: React.FC<Props> = ({ account, onPress, onDelete }) => {
  const scale = useSharedValue(1);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12, stiffness: 150 }) }],
  }));

  const initials = account.avatar || account.username?.slice(0, 2).toUpperCase();

  return (
    <Pressable
      onPress={() => onPress && onPress(account)}
      onPressIn={() => (scale.value = 0.96)}
      onPressOut={() => (scale.value = 1)}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.card, aStyle]}>
        <View style={styles.left}>
          <View style={styles.avatar}>{/* initials */}
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
        </View>

        <View style={styles.mid}>
          <Text style={styles.name}>{account.username}</Text>
          <Text style={styles.role}>{account.role}</Text>
          {account.schoolId ? <Text style={styles.school}>{account.schoolId}</Text> : null}
        </View>

        <View style={styles.right}>
          <Pressable onPress={() => onDelete && onDelete(account)} hitSlop={8}>
            <X size={20} color={Theme.colors.textMuted} />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: Theme.spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#eef2ff',
    shadowColor: '#6a5af9',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  left: { marginRight: Theme.spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6a5af9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: Theme.colors.card, fontWeight: '800', fontSize: Theme.typography.h3.fontSize },
  mid: { flex: 1 },
  name: { fontWeight: '800', color: Theme.colors.text },
  role: { ...Theme.typography.caption, color: '#8b9bb4', marginTop: 2, textTransform: 'uppercase' },
  school: { ...Theme.typography.caption, color: Theme.colors.textMuted, marginTop: Theme.spacing.xs },
  right: { marginLeft: Theme.spacing.md },
});

export default AccountCard;
