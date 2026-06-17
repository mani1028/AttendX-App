import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  secure?: boolean;
  keyboardType?: any;
  leftIcon?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

const CustomInput: React.FC<Props> = ({ placeholder, value, onChangeText, secure, keyboardType, leftIcon, onFocus, onBlur }) => {
  const [show, setShow] = useState(!secure);
  return (
    <View style={styles.wrap}>
      {leftIcon ? <Icon name={leftIcon} size={18} color="#94a3b8" /> : null}
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
          <Icon name={show ? 'eye-off' : 'eye'} size={18} color="#94a3b8" />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    height: 54,
    paddingHorizontal: 16,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: '#0f172a' },
});

export default CustomInput;
