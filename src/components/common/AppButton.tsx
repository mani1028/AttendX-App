import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { colors } from '../../constants/theme';

type Props = TouchableOpacityProps & {
	title: string;
	type?: 'primary' | 'secondary' | 'danger';
};

export default function AppButton({ title, type = 'primary', style, ...rest }: Props) {
	return (
		<TouchableOpacity
			{...rest}
			style={[
				styles.base,
				type === 'secondary' ? styles.secondary : type === 'danger' ? styles.danger : styles.primary,
				style
			]}
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
		backgroundColor: colors.accent,
	},
	secondary: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	danger: {
		backgroundColor: colors.error,
	},
	text: {
		fontWeight: '700',
		fontSize: 14,
	},
	primaryText: {
		color: '#ffffff',
	},
	secondaryText: {
		color: colors.textPrimary,
	},
});
