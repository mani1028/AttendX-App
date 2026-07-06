import { useNavigation } from '@react-navigation/native';

/** True when the screen can pop the stack (not a root tab screen). */
export function useCanNavigateBack(): boolean {
  const navigation = useNavigation();
  return navigation.canGoBack();
}
