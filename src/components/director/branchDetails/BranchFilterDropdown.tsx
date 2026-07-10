import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { branchDetailsStyles as styles } from './branchDetailsStyles';

interface BranchFilterDropdownProps {
  label: string;
  displayValue: string;
  onPress: () => void;
}

const BranchFilterDropdown: React.FC<BranchFilterDropdownProps> = ({ label, displayValue, onPress }) => (
  <View style={styles.filterField}>
    <AppText style={styles.filterLabel}>{label}</AppText>
    <TouchableOpacity accessibilityRole="button" style={styles.dropdownSelect} onPress={onPress}>
      <AppText style={styles.dropdownSelectText} numberOfLines={1}>{displayValue}</AppText>
      <ChevronDown size={18} color={Theme.colors.textSec} />
    </TouchableOpacity>
  </View>
);

export default BranchFilterDropdown;
