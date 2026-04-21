import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

type Props = ViewProps;

export default function AppCard({ style, ...rest }: Props) {
	return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
});
