import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XCircle, CheckCircle2 } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';



interface CustomPickerModalProps {
  visible: boolean;
  title: string;
  options: { label: string; value: any }[];
  selectedValue: any;
  onValueChange: (value: any) => void;
  onClose: () => void;
}

const CustomPickerModal: React.FC<CustomPickerModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onValueChange,
  onClose,
}) => {
  const activeColor = Theme.colors.primary;
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const listMaxHeight = Math.min(350, Dimensions.get('window').height * 0.45);

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) {return options;}
    return (options || []).filter(opt =>
      opt && (opt.label || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.pickerOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.pickerCard, { marginBottom: insets.bottom }]}>
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>{title}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.pickerCloseBtn}>
              <XCircle size={22} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          {options && options.length > 5 && (
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={Theme.colors.textSec}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          )}

          <View style={styles.pickerShell}>
            <ScrollView style={{ maxHeight: listMaxHeight }} keyboardShouldPersistTaps="handled">
              {!Array.isArray(filteredOptions) || filteredOptions.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: Theme.colors.textSec }}>No matching options</Text>
                </View>
              ) : (
                filteredOptions.map((item, index) => {
                  if (!item) {return null;}
                  const isSelected = selectedValue === item.value;
                  const itemKey = item.value !== null && item.value !== undefined ? String(item.value) : `item-${index}`;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={itemKey}
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        onValueChange(item.value);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          isSelected && { fontWeight: '700', color: activeColor },
                        ]}
                      >
                        {item.label || 'Unknown'}
                      </Text>
                      {isSelected && <CheckCircle2 size={18} color={activeColor} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          <View style={styles.pickerActions}>
            <TouchableOpacity accessibilityRole="button" style={[styles.pickerCancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.pickerCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: Theme.colors.card,
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  pickerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
  },
  pickerCloseBtn: {
    padding: Theme.spacing.xs,
  },
  pickerShell: {
    padding: Theme.spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: Theme.spacing.xs,
  },
  pickerOptionActive: {
    backgroundColor: Theme.colors.background,
  },
  pickerOptionText: {
    fontSize: 16,
    color: Theme.colors.textSec,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
    color: '#4f46e5',
  },
  pickerActions: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
  },
  pickerCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
  },
  pickerCancelText: {
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  searchBarContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.background,
  },
});

export default CustomPickerModal;
