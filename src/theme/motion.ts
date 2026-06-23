import { Easing } from 'react-native-reanimated';
import { Animated } from 'react-native';
import { useRef, useEffect } from 'react';

export const motion = {
  durations: {
    fast: 150,
    base: 250,
    slow: 400,
  },
  easings: {
    standard: Easing.out(Easing.cubic),
    enter: Easing.out(Easing.back(1.5)),
    exit: Easing.in(Easing.cubic),
  },
  springs: {
    snappy: { damping: 15, stiffness: 200, mass: 1 },
    gentle: { damping: 20, stiffness: 100, mass: 1 },
    bouncy: { damping: 10, stiffness: 150, mass: 1 },
  },
};

export function useScreenEntrance() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: motion.durations.base, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...motion.springs.snappy, useNativeDriver: true }),
    ]).start();
  }, []);
  return { fadeAnim, slideAnim };
}
