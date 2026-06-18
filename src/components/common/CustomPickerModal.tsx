import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { XCircle, CheckCircle2 } from 'lucide-react-native';
import { Theme } from '../../theme/theme';

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
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    return (options || []).filter(opt =>
      opt && (opt.label || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn}>
              <XCircle size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {options && options.length > 5 && (
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#64748B"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          )}

          <View style={styles.pickerShell}>
            <ScrollView style={{ maxHeight: 350 }}>
              {!Array.isArray(filteredOptions) || filteredOptions.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B' }}>No matching options</Text>
                </View>
              ) : (
                filteredOptions.map((item, index) => {
                  if (!item) return null;
                  const isSelected = selectedValue === item.value;
                  const itemKey = item.value !== null && item.value !== undefined ? String(item.value) : `item-${index}`;
                  return (
                    <TouchableOpacity
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
            <TouchableOpacity style={[styles.pickerCancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.pickerCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: '#fff',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerShell: {
    padding: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#475569',
  },
  pickerOptionTextActive: {
    fontWeight: '700',
    color: '#4f46e5',
  },
  pickerActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pickerCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  pickerCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
});

export default CustomPickerModal;
