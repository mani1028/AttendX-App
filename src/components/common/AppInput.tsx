import React, { useState } from 'react';
import {
	StyleSheet,
	TextInput,
	TextInputProps,
	View,
	Text,
	ViewStyle,
	TextStyle,
	TouchableOpacity,
	Platform,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Eye, EyeOff } from 'lucide-react-native';

interface AppInputProps extends TextInputProps {
	label?: string;
	error?: string;
	containerStyle?: ViewStyle;
	inputStyle?: TextStyle;
}

export const AppInput: React.FC<AppInputProps> = ({
	label,
	error,
	containerStyle,
	inputStyle,
	secureTextEntry,
	...props
}) => {
	const inputProps = { ...props } as TextInputProps;
	const finalEditable = inputProps.editable ?? true;
	// showSoftInputOnFocus may not be present on all RN versions; ensure keyboard shows by default
	const finalShowSoftInputOnFocus = (inputProps as any).showSoftInputOnFocus ?? true;

	// preserve user handlers and add lightweight logging for on-device debugging
	const { onFocus: userOnFocus, onBlur: userOnBlur } = inputProps as any;
	const handleFocus = (e: any) => {
		try {
			console.log(`[AppInput] focus label=${label} editable=${finalEditable} showSoftInputOnFocus=${finalShowSoftInputOnFocus} platform=${Platform.OS}`);
		} catch (err) {}
		if (typeof userOnFocus === 'function') userOnFocus(e);
	};
	const handleBlur = (e: any) => {
		try {
			console.log(`[AppInput] blur label=${label} platform=${Platform.OS}`);
		} catch (err) {}
		if (typeof userOnBlur === 'function') userOnBlur(e);
	};
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	const isPassword = secureTextEntry;

	return (
		<View style={[styles.container, containerStyle]}>
			{label && <Text style={styles.label}>{label}</Text>}
			<View style={styles.inputWrapper}>
				<TextInput
					style={[
						styles.input,
						error ? styles.inputError : null,
						inputStyle,
						isPassword && { paddingRight: 45 }
					]}
					placeholderTextColor={colors.mutedText}
					secureTextEntry={isPassword && !isPasswordVisible}
					{...inputProps}
					editable={finalEditable}
					showSoftInputOnFocus={finalShowSoftInputOnFocus}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>
				{isPassword && (
					<TouchableOpacity
						style={styles.iconContainer}
						onPress={togglePasswordVisibility}
					>
						{isPasswordVisible ? (
							<Eye size={20} color={colors.mutedText} />
						) : (
							<EyeOff size={20} color={colors.mutedText} />
						)}
					</TouchableOpacity>
				)}
			</View>
			{error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 6,
	},
	inputWrapper: {
		position: 'relative',
		justifyContent: 'center',
	},
	input: {
		height: 48,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingHorizontal: 14,
		fontSize: 16,
		color: colors.text,
	},
	iconContainer: {
		position: 'absolute',
		right: 14,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	inputError: {
		borderColor: colors.danger,
	},
	errorText: {
		color: colors.danger,
		fontSize: 12,
		marginTop: 4,
	},
});

export default AppInput;
