import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { payrollStyles as styles } from './payrollStyles';

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  genCount: number;
  totalEmployees: number;
  savingAll: boolean;
  sendingEmails: boolean;
  onGenerateAll: () => void;
  onSaveAll: () => void;
  onSendEmails: () => void;
};

export default function PayrollFiltersBar({
  searchQuery,
  onSearchChange,
  genCount,
  totalEmployees,
  savingAll,
  sendingEmails,
  onGenerateAll,
  onSaveAll,
  onSendEmails,
}: Props) {
  return (
    <View style={styles.actionBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search staff…"
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholderTextColor={Theme.colors.textMuted}
      />
      <View style={styles.actionButtonsRow}>
        {genCount < totalEmployees && genCount > 0 ? (
          <TouchableOpacity accessibilityRole="button" style={styles.generateAllButton} onPress={onGenerateAll}>
            <Text style={styles.generateAllButtonText}>Generate All ({totalEmployees})</Text>
          </TouchableOpacity>
        ) : null}
        {genCount > 0 ? (
          <>
            <TouchableOpacity accessibilityRole="button" style={styles.saveAllButton} onPress={onSaveAll} disabled={savingAll}>
              {savingAll ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <Text style={styles.saveAllButtonText}>Save All ({genCount})</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.emailAllButton} onPress={onSendEmails} disabled={sendingEmails}>
              {sendingEmails ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <Text style={styles.emailAllButtonText}>Send Mail ({genCount})</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}
