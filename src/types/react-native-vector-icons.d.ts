declare module 'react-native-vector-icons/MaterialIcons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';
  const Icon: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default Icon;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';
  const Icon: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default Icon;
}

declare module 'react-native-vector-icons/FontAwesome' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';
  const Icon: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default Icon;
}

// Fallback for any other icon imports
declare module 'react-native-vector-icons/*' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';
  const Icon: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default Icon;
}
