import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  text: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
  loading?: boolean;
};

const GradientButton: React.FC<Props> = ({ text, onPress, disabled, style, colors, loading }) => {
  const gradient = colors || ['#1e3a8a', '#3b82f6'];
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled} style={style}>
      <LinearGradient colors={gradient} style={[styles.btn, disabled && styles.disabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.txt}>{text}</Text>}
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
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  txt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1.4 },
  disabled: { opacity: 0.6 },
});

export default GradientButton;
