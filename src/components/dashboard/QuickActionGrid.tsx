import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export const QUICK_ACTION_COLUMNS = 4;

interface QuickActionGridProps {
  children: React.ReactNode;
  style?: ViewStyle;
  columns?: number;
}

interface QuickActionItemProps {
  children: React.ReactNode;
  style?: ViewStyle;
  columns?: number;
}

/** Four-column grid — last row keeps column alignment (no space-between gaps). */
export function QuickActionGrid({ children, style, columns = QUICK_ACTION_COLUMNS }: QuickActionGridProps) {
  return (
    <View style={[styles.grid, style]}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<QuickActionItemProps>, { columns })
          : child
      )}
    </View>
  );
}

export function QuickActionItem({ children, style, columns = QUICK_ACTION_COLUMNS }: QuickActionItemProps) {
  return (
    <View style={[styles.item, { width: `${100 / columns}%` as `${number}%` }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 16,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
});

export default QuickActionGrid;
