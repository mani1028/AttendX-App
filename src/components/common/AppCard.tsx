import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../constants/theme';

type Props = ViewProps;

export default function AppCard({ style, ...rest }: Props) {
	return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
});
