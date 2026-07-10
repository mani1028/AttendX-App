import React from 'react';
import AppButton from './common/AppButton';
import { ViewStyle } from 'react-native';

type Props = {
  text: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
  loading?: boolean;
};

/** @deprecated Use AppButton instead. */
const GradientButton: React.FC<Props> = ({ text, onPress, disabled, style, loading }) => (
  <AppButton
    title={text}
    onPress={onPress}
    disabled={disabled}
    loading={loading}
    size="lg"
    style={style}
    accessibilityLabel={text}
  />
);

export default GradientButton;
