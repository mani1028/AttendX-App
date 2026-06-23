import { Theme } from '../theme/tokens';
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  secure?: boolean;
  keyboardType?: any;
  leftIcon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
};

const CustomInput: React.FC<Props> = ({ placeholder, value, onChangeText, secure, keyboardType, leftIcon, onFocus, onBlur }) => {
  const [show, setShow] = useState(!secure);
  return (
    <View style={styles.wrap}>
      {leftIcon ? leftIcon : null}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure && !show}
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {secure ? (
        <Pressable onPress={() => setShow(!show)}>
          {show ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    height: 54,
    paddingHorizontal: Theme.spacing.md,
  },
  input: { flex: 1, marginLeft: 12, ...Theme.typography.bodyMd, color: Theme.colors.text },
});

export default CustomInput;
