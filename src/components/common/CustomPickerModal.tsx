import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { XCircle, CheckCircle2 } from 'lucide-react-native';

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

          <View style={styles.pickerShell}>
            <ScrollView style={{ maxHeight: 350 }}>
              {!Array.isArray(options) || options.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B' }}>No options available</Text>
                </View>
              ) : (
                options.map((item, index) => {
                  if (!item) return null;
                  const itemKey = item.value !== null && item.value !== undefined ? String(item.value) : `item-${index}`;
                  return (
                    <TouchableOpacity
                      key={itemKey}
                      style={[
                        styles.pickerOption,
                        selectedValue === item.value && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        onValueChange(item.value);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          selectedValue === item.value && styles.pickerOptionTextActive,
                        ]}
                      >
                        {item.label || 'Unknown'}
                      </Text>
                      {selectedValue === item.value && <CheckCircle2 size={18} color="#4f46e5" />}
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
});

export default CustomPickerModal;
