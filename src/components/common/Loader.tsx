import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from './AppText';

type Props = {
	text?: string;
};

export default function Loader({ text = 'Loading...' }: Props) {
	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#10b981" />
			<AppText style={styles.text}>{text}</AppText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	text: {
		marginTop: 10,
		color: '#888',
		fontSize: 14,
	},
});
