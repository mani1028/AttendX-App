import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { Director_THEME } from '../../constants/directorTheme';

interface StandardPageHeaderProps {
  title: string;
  onBackPress: () => void;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  subtitle?: string;
  containerStyle?: ViewStyle;
  backgroundColor?: string;
}

const StandardPageHeader: React.FC<StandardPageHeaderProps> = ({
  title,
  onBackPress,
  rightIcon,
  onRightIconPress,
  subtitle,
  containerStyle,
  backgroundColor = Director_THEME.navy,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerStandard,
        { paddingTop: insets.top + 20, backgroundColor },
        containerStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <AppText style={styles.headerTitle} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
      </View>

      <TouchableOpacity
        style={styles.rightButton}
        onPress={onRightIconPress}
        disabled={!rightIcon}
        accessibilityLabel="Right action"
      >
        {rightIcon || <View style={{ width: 40 }} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerStandard: {
    paddingBottom: 30,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  rightButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StandardPageHeader;
