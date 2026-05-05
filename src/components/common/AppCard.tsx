import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { Platform } from 'react-native';

import { colors } from '../../constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onPress?: () => void;
};

export default function AppCard({ children, style, testID, onPress }: Props) {
	if (onPress) {
		return (
			<TouchableOpacity
				testID={testID}
				style={[styles.card, style]}
				onPress={onPress}
				activeOpacity={0.7}
			>
				{children}
			</TouchableOpacity>
		);
	}

	return (
		<View testID={testID} style={[styles.card, style]}>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: 18,
		padding: 16,
		borderWidth: 1,
		borderColor: colors.border,
		...Platform.select({
			ios: {
				shadowColor: '#0f172a',
				shadowOpacity: 0.08,
				shadowRadius: 14,
				shadowOffset: { width: 0, height: 6 },
			},
			android: {
				elevation: 4,
			},
		}),
	},
});
