import { Theme } from '../../theme/tokens';
// src/components/common/AttendXIntro.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { motion } from '../../theme/motion';

interface AttendXIntroProps {
  onComplete: () => void;
  duration?: number;
}

const AttendXIntro: React.FC<AttendXIntroProps> = ({ onComplete, duration = 3200 }) => {
  const { width } = useWindowDimensions();

  const cloudTranslateX = useSharedValue(-150);
  const cloudOpacity = useSharedValue(0);

  const xTranslateX = useSharedValue(-80);
  const xOpacity = useSharedValue(0);

  const taglineTranslateX = useSharedValue(-80);
  const taglineOpacity = useSharedValue(0);

  const containerOpacity = useSharedValue(1);

  // Initialize letters — declared individually at top level (hooks cannot be in callbacks)
  const l0tx = useSharedValue(-80); const l0op = useSharedValue(0);
  const l1tx = useSharedValue(-80); const l1op = useSharedValue(0);
  const l2tx = useSharedValue(-80); const l2op = useSharedValue(0);
  const l3tx = useSharedValue(-80); const l3op = useSharedValue(0);
  const l4tx = useSharedValue(-80); const l4op = useSharedValue(0);
  const l5tx = useSharedValue(-80); const l5op = useSharedValue(0);

  const lettersTranslateX = [l0tx, l1tx, l2tx, l3tx, l4tx, l5tx];
  const lettersOpacity    = [l0op, l1op, l2op, l3op, l4op, l5op];

  useEffect(() => {
    // 1. Cloud slides in
    cloudTranslateX.value = withDelay(100, withTiming(0, { duration: 800, easing: motion.easings.standard }));
    cloudOpacity.value = withDelay(100, withTiming(1, { duration: 600, easing: motion.easings.standard }));

    // 2. Letters staggered slide
    lettersTranslateX.forEach((val, i) => {
      val.value = withDelay(700 + i * 70, withTiming(0, { duration: 600, easing: motion.easings.standard }));
    });
    lettersOpacity.forEach((val, i) => {
      val.value = withDelay(700 + i * 70, withTiming(1, { duration: 400, easing: motion.easings.standard }));
    });

    // 3. Gradient X slides in
    xTranslateX.value = withDelay(1120, withTiming(0, { duration: 600, easing: motion.easings.standard }));
    xOpacity.value = withDelay(1120, withTiming(1, { duration: 400, easing: motion.easings.standard }));

    // 4. Tagline slides in
    taglineTranslateX.value = withDelay(1100, withTiming(0, { duration: 600, easing: motion.easings.standard }));
    taglineOpacity.value = withDelay(1100, withTiming(1, { duration: 400, easing: motion.easings.standard }));

    // 5. Fade out container
    const finish = () => { onComplete?.(); };
    containerOpacity.value = withDelay(duration, withTiming(0, { duration: 800 }, () => {
      runOnJS(finish)();
    }));
  }, []);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudTranslateX.value }],
    opacity: cloudOpacity.value,
  }));

  const xStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: xTranslateX.value },
      { translateY: Platform.OS === 'ios' ? 0 : -2 },
    ],
    opacity: xOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: taglineTranslateX.value }],
    opacity: taglineOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Pre-compute letter animated styles at top level (hooks cannot be called inside render callbacks)
  const letterStyles = [
    useAnimatedStyle(() => ({ transform: [{ translateX: l0tx.value }], opacity: l0op.value })),
    useAnimatedStyle(() => ({ transform: [{ translateX: l1tx.value }], opacity: l1op.value })),
    useAnimatedStyle(() => ({ transform: [{ translateX: l2tx.value }], opacity: l2op.value })),
    useAnimatedStyle(() => ({ transform: [{ translateX: l3tx.value }], opacity: l3op.value })),
    useAnimatedStyle(() => ({ transform: [{ translateX: l4tx.value }], opacity: l4op.value })),
    useAnimatedStyle(() => ({ transform: [{ translateX: l5tx.value }], opacity: l5op.value })),
  ];

  const letterColors = ['#0652a8', '#05388b', '#032d76', '#032867', '#021a48', '#021a46'];

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.content, { maxWidth: width * 0.9 }]}>
        {/* Cloud Logo */}
        <Animated.Image
          source={require('../../assets/logo2.png')}
          style={[styles.cloudLogo, cloudStyle]}
          resizeMode="contain"
        />

        {/* Text side */}
        <View style={styles.textSide}>
          {/* Letters row */}
          <View style={styles.lettersRow}>
            {['A', 't', 't', 'e', 'n', 'd'].map((ch, i) => (
              <Animated.Text
                key={i}
                style={[styles.letter, { color: letterColors[i] }, letterStyles[i]]}
              >
                {ch}
              </Animated.Text>
            ))}

            {/* Gradient X as SVG */}
            <Animated.View style={xStyle}>
              <Svg width={48} height={60} viewBox="0 0 60 60">
                <Defs>
                  <SvgGradient id="xGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1565c0" />
                    <Stop offset="50%" stopColor="#06265c" />
                    <Stop offset="50%" stopColor="#0b203f" />
                    <Stop offset="100%" stopColor="#031024" />
                  </SvgGradient>
                </Defs>
                <SvgText
                  x="30"
                  y={Platform.OS === 'ios' ? 50 : 52}
                  textAnchor="middle"
                  fontFamily={Platform.OS === 'ios' ? 'System' : 'sans-serif'}
                  fontWeight="800"
                  fontSize={68}
                  fill="url(#xGrad)"
                >
                  X
                </SvgText>
              </Svg>
            </Animated.View>
          </View>

          {/* Tagline */}
          <Animated.Text style={[styles.tagline, taglineStyle]}>
            Attendance in One Click
          </Animated.Text>
        </View>
      </View>

      <Text style={styles.poweredBy}>Powered By Visys Cloud Technologies</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    transform: [{ translateY: -24 }],
  },
  cloudLogo: {
    width: 80,
    height: 80,
    flexShrink: 0,
  },
  textSide: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  letter: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '800',
    fontSize: 48,
    lineHeight: 52,
  },
  tagline: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    fontSize: Theme.typography.h4.fontSize,
    color: '#3a9fd6',
    marginTop: 6,
  },
  poweredBy: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    textAlign: 'center',
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default AttendXIntro;
