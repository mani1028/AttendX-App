import React from 'react';
import { ScrollView, StyleSheet, ViewStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

export default function ScreenContainer({ children, contentStyle }: Props) {
  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Ensures the very bottom (navigation bar area) is white
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    gap: 12,
  },
});