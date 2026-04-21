import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

type Props = TouchableOpacityProps & {
	title: string;
	type?: 'primary' | 'secondary';
};

export default function AppButton({ title, type = 'primary', style, ...rest }: Props) {
	return (
		<TouchableOpacity
			{...rest}
			style={[styles.base, type === 'secondary' ? styles.secondary : styles.primary, style]}
			activeOpacity={0.85}>
			<Text style={[styles.text, type === 'secondary' ? styles.secondaryText : styles.primaryText]}>{title}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	base: {
		minHeight: 44,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 14,
	},
	primary: {
		backgroundColor: '#2563eb',
	},
	secondary: {
		backgroundColor: '#e2e8f0',
	},
	text: {
		fontWeight: '700',
		fontSize: 14,
	},
	primaryText: {
		color: '#ffffff',
	},
	secondaryText: {
		color: '#334155',
	},
});
