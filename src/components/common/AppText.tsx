import React from 'react';
import { Text, TextProps } from 'react-native';

type Props = TextProps & {
	children: React.ReactNode;
};

export default function AppText({ children, style, ...rest }: Props) {
	return (
		<Text {...rest} style={style}>
			{children}
		</Text>
	);
}
