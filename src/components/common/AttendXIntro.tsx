import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Text,
} from 'react-native';

const { width } = Dimensions.get('window');

interface AttendXIntroProps {
  onComplete: () => void;
  duration?: number;
}

const AttendXIntro: React.FC<AttendXIntroProps> = ({
  onComplete,
  duration = 2800,
}) => {
  // --- Animation values ---
  const scaleAnim   = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(18)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // 1. Fade in + scale up the logo circle
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration * 0.18,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: duration * 0.32,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),

      // 2. Settle logo to 1.0 + reveal text + expand ring
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: duration * 0.12,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: duration * 0.2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: duration * 0.2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.45,
          duration: duration * 0.3,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.25,
          duration: duration * 0.15,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 3. Hold
      Animated.delay(duration * 0.1),

      // 4. Fade ring out
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: duration * 0.08,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),

      // 5. Exit — scale punch + fade out everything
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: duration * 0.06,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: duration * 0.18,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start(() => onComplete());
    return () => sequence.stop();
  }, []);

  const CIRCLE = width * 0.38;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <Animated.View style={[styles.everything, { opacity: exitOpacity }]}>

        {/* Pulse ring behind the circle */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: CIRCLE,
              height: CIRCLE,
              borderRadius: CIRCLE / 2,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* Logo circle + play icon */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              width: CIRCLE,
              height: CIRCLE,
              borderRadius: CIRCLE / 2,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Play triangle — pure View trick */}
          <View style={styles.playOuter}>
            <View style={styles.playTriangle} />
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={[
            styles.textWrap,
            {
              opacity: textOpacity,
              transform: [{ translateY: textSlide }],
            },
          ]}
        >
          <Text style={styles.appName}>
            Attend<Text style={styles.appNameAccent}>X</Text>
          </Text>
          <Text style={styles.tagline}>Smart Attendance</Text>
        </Animated.View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  everything: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pulse ring
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#2563EB',
    backgroundColor: 'transparent',
  },

  // Circle logo
  logoWrap: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow for depth
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },

  // Play button triangle using border trick
  playOuter: {
    marginLeft: 6, // optical centering of triangle
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 26,
    borderRightWidth: 0,
    borderTopWidth: 18,
    borderBottomWidth: 18,
    borderLeftColor: '#FFFFFF',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  playTriangle: {}, // kept for future override

  // Text
  textWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  appNameAccent: {
    color: '#2563EB',
  },
  tagline: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
});

export default AttendXIntro;