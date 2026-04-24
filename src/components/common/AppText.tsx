import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

type Props = TextProps & {
	children: React.ReactNode;
	weight?: 'normal' | 'bold' | 'semiBold' | 'medium' | 'light' | 'thin' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
};

export default function AppText({ children, style, weight, ...rest }: Props) {
	const getFontWeight = (): TextStyle['fontWeight'] => {
		switch (weight) {
			case 'bold': return '700';
			case 'semiBold': return '600';
			case 'medium': return '500';
			case 'light': return '300';
			case 'normal': return '400';
			default: return weight as TextStyle['fontWeight'];
		}
	};

	return (
		<Text
			{...rest}
			style={[
				style,
				weight ? { fontWeight: getFontWeight() } : undefined
			]}
		>
			{children}
		</Text>
	);
}
