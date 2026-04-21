import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';

type AttendanceRow = {
	id: string;
	name: string;
	status: 'present' | 'absent';
};

const initialRows: AttendanceRow[] = [
	{ id: '1', name: 'Alice Johnson', status: 'present' },
	{ id: '2', name: 'Bob Smith', status: 'present' },
	{ id: '3', name: 'Charlie Brown', status: 'absent' },
	{ id: '4', name: 'Diana Prince', status: 'present' },
	{ id: '5', name: 'Ethan Hunt', status: 'absent' },
];

export default function AttendanceScreen() {
	const [rows, setRows] = useState<AttendanceRow[]>(initialRows);

	const summary = useMemo(() => {
		const present = rows.filter((r) => r.status === 'present').length;
		const absent = rows.length - present;
		return { present, absent, total: rows.length };
	}, [rows]);

	const toggleStatus = (id: string) => {
		setRows((prev) =>
			prev.map((row) =>
				row.id === id
					? { ...row, status: row.status === 'present' ? 'absent' : 'present' }
					: row,
			),
		);
	};

	return (
		<ScreenContainer>
			<View style={styles.headerCard}>
				<Text style={styles.title}>Attendance</Text>
				<Text style={styles.meta}>Present: {summary.present}</Text>
				<Text style={styles.meta}>Absent: {summary.absent}</Text>
				<Text style={styles.meta}>Total: {summary.total}</Text>
			</View>

			<FlatList
				data={rows}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				renderItem={({ item }) => (
					<View style={styles.rowCard}>
						<View>
							<Text style={styles.name}>{item.name}</Text>
							<Text style={styles.statusLabel}>Status: {item.status.toUpperCase()}</Text>
						</View>
						<Pressable style={styles.toggleBtn} onPress={() => toggleStatus(item.id)}>
							<Text style={styles.toggleText}>Toggle</Text>
						</Pressable>
					</View>
				)}
			/>
		</ScreenContainer>
	);
}

const styles = StyleSheet.create({
	headerCard: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		marginBottom: 12,
		gap: 4,
	},
	title: {
		color: colors.textPrimary,
		fontSize: 20,
		fontWeight: '800',
		marginBottom: 2,
	},
	meta: {
		color: colors.textMuted,
		fontSize: 13,
	},
	list: {
		paddingBottom: 16,
		gap: 10,
	},
	rowCard: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	name: {
		color: colors.textPrimary,
		fontWeight: '700',
		fontSize: 15,
	},
	statusLabel: {
		color: colors.textMuted,
		marginTop: 4,
	},
	toggleBtn: {
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 14,
	},
	toggleText: {
		color: '#ffffff',
		fontWeight: '700',
	},
});
