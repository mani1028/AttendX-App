import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Theme } from '../theme/tokens';

type Props = {
  text: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
  loading?: boolean;
};

const GradientButton: React.FC<Props> = ({ text, onPress, disabled, style, colors, loading }) => {
  const gradient = colors || [Theme.colors.primary, Theme.colors.blue];
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onPress} disabled={disabled} style={style}>
      <LinearGradient colors={gradient} style={[styles.btn, disabled && styles.disabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {loading ? <ActivityIndicator color={Theme.colors.card} /> : <Text style={styles.txt}>{text}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  txt: { color: Theme.colors.card, fontWeight: '800', fontSize: 16, letterSpacing: 1.4 },
  disabled: { opacity: 0.6 },
});

export default GradientButton;
