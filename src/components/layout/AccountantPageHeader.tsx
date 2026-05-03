import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { HM_THEME } from '../../constants/hmTheme';

type AccountantPageHeaderProps = {
  title: string;
  onBackPress: () => void;
};

const AccountantPageHeader: React.FC<AccountantPageHeaderProps> = ({ title, onBackPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}> 
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <AppText style={styles.headerTitle} numberOfLines={1}>{title}</AppText>
      </View>

      <View style={styles.headerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    paddingBottom: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
});

export default AccountantPageHeader;