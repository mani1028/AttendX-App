// src/components/common/AttendXIntro.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface AttendXIntroProps {
  onComplete: () => void;
  duration?: number; // total duration in ms before fade out starts
}

const AttendXIntro: React.FC<AttendXIntroProps> = ({ onComplete, duration = 3200 }) => {
  // Cloud animations
  const cloudTranslateX = useRef(new Animated.Value(-150)).current;
  const cloudOpacity = useRef(new Animated.Value(0)).current;

  // Individual letter animations (6 letters: A t t e n d)
  const lettersState = useRef(
    Array(6).fill(null).map(() => ({
      translateX: new Animated.Value(-80),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // Gradient "X" animation
  const xTranslateX = useRef(new Animated.Value(-80)).current;
  const xOpacity = useRef(new Animated.Value(0)).current;

  // Tagline animation
  const taglineTranslateX = useRef(new Animated.Value(-80)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Container fade-out
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Cloud slides in (delay 100ms)
    Animated.parallel([
      Animated.timing(cloudTranslateX, {
        toValue: 0,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cloudOpacity, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Letters staggered slide (delay 700ms, each 70ms increment)
    lettersState.forEach((letter, i) => {
      const delay = 700 + i * 70;
      Animated.parallel([
        Animated.timing(letter.translateX, {
          toValue: 0,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(letter.opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // 3. Gradient X slides in (delay 700 + 6*70 = 1120ms)
    Animated.parallel([
      Animated.timing(xTranslateX, {
        toValue: 0,
        duration: 600,
        delay: 1120,
        useNativeDriver: true,
      }),
      Animated.timing(xOpacity, {
        toValue: 1,
        duration: 400,
        delay: 1120,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Tagline slides in (delay 1100ms)
    Animated.parallel([
      Animated.timing(taglineTranslateX, {
        toValue: 0,
        duration: 600,
        delay: 1100,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        delay: 1100,
        useNativeDriver: true,
      }),
    ]).start();

    // 5. Fade out container after total duration, then call onComplete
    setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        onComplete?.();
      });
    }, duration);
  }, []);

  const letterColors = ['#0652a8', '#05388b', '#032d76', '#032867', '#021a48', '#021a46'];

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        {/* Cloud Logo */}
        <Animated.Image
          source={require('../../assets/logo2.png')} // adjust path to your actual logo
          style={[
            styles.cloudLogo,
            {
              transform: [{ translateX: cloudTranslateX }],
              opacity: cloudOpacity,
            },
          ]}
          resizeMode="contain"
        />

        {/* Text side */}
        <View style={styles.textSide}>
          {/* Letters row */}
          <View style={styles.lettersRow}>
            {['A', 't', 't', 'e', 'n', 'd'].map((ch, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.letter,
                  { color: letterColors[i] },
                  {
                    transform: [{ translateX: lettersState[i].translateX }],
                    opacity: lettersState[i].opacity,
                  },
                ]}
              >
                {ch}
              </Animated.Text>
            ))}

            {/* Gradient X as SVG */}
            <Animated.View
              style={{
                transform: [
                  { translateX: xTranslateX },
                  { translateY: Platform.OS === 'ios' ? 0 : -2 } // Keep the X aligned with the wordmark baseline
                ],
                opacity: xOpacity,
              }}
            >
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
                  y={Platform.OS === 'ios' ? 50 : 52} // Fine-tune baseline per platform
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
          <Animated.Text
            style={[
              styles.tagline,
              {
                transform: [{ translateX: taglineTranslateX }],
                opacity: taglineOpacity,
              },
            ]}
          >
            Attendance in One Click
          </Animated.Text>
        </View>
      </View>
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: width * 0.9,
    paddingHorizontal: 20,
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
    gap: 4,
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
    fontSize: 16,
    color: '#3a9fd6',
    marginTop: 6,
  },
});

export default AttendXIntro;