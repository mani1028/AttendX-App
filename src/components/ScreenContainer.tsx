import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme/tokens';



interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  bgColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
  statusBarBg?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export default function ScreenContainer({
  children,
  style,
  contentStyle,
  bgColor = Theme.colors.background,
  statusBarStyle = 'dark-content',
  edges = ['top', 'bottom'],
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: bgColor }, style]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent={true}
      />
      <View
        style={[
          styles.content,
          {
            paddingTop: edges.includes('top') ? insets.top : 0,
            paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
            paddingLeft: edges.includes('left') ? insets.left : 0,
            paddingRight: edges.includes('right') ? insets.right : 0,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
