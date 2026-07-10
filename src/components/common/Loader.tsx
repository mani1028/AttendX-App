import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, ViewStyle } from 'react-native';
import { Theme } from '../../theme/tokens';



interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
}

export default function Loader({
  size = 'md',
  color = Theme.colors.primary,
  label,
  style,
  fullScreen = false,
}: LoaderProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.8, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const dim = size === 'sm' ? 24 : size === 'lg' ? 56 : 38;
  const bw = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;

  const content = (
    <View style={[styles.container, style]}>
      <Animated.View
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          borderWidth: bw,
          borderColor: `${color}22`,
          borderTopColor: color,
          transform: [{ rotate }],
        }}
      />
      {label && (
        <Animated.Text
          style={[styles.label, { opacity: pulse }]}
        >
          {label}
        </Animated.Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
});
