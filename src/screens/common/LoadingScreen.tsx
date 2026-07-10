import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  Text,
} from 'react-native';
import { Theme } from '../../theme/tokens';
import { motion } from '../../theme/motion';

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: motion.durations.base, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    // Spin loader
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();

    // Pulse dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      {/* Background blobs */}
      <View style={styles.blobTL} />
      <View style={styles.blobBR} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.spinnerWrapper}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
        </View>

        <Animated.Text style={[styles.label, { opacity: pulseAnim }]}>
          Loading...
        </Animated.Text>
      </Animated.View>

      <Text style={styles.poweredBy}>Powered by Visys Cloud Technologies</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobTL: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(30,58,138,0.08)',
  },
  blobBR: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 64,
    marginBottom: 40,
  },
  spinnerWrapper: {
    width: 52,
    height: 52,
    marginBottom: Theme.spacing.xl,
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: 'rgba(30,58,138,0.15)',
    borderTopColor: Theme.colors.primary,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  poweredBy: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    textAlign: 'center',
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec, // Darker slate for better contrast on white
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
