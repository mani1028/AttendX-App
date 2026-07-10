import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Settings, CheckCircle2, RefreshCw } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface ExamRulesCardProps {
  examSubjectId: string | null;
  isEditMode: boolean;
  inputMaxMarks: string;
  inputPassMarks: string;
  savingExamConfig: boolean;
  onMaxMarksChange: (value: string) => void;
  onPassMarksChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
}

export default function ExamRulesCard({
  examSubjectId,
  isEditMode,
  inputMaxMarks,
  inputPassMarks,
  savingExamConfig,
  onMaxMarksChange,
  onPassMarksChange,
  onSave,
  onEdit,
}: ExamRulesCardProps) {
  return (
    <AppCard style={styles.configCard} elevated={false}>
      <View style={styles.configHeader}>
        <View style={styles.configTitleRow}>
          <Settings size={18} color={Theme.colors.primary} />
          <AppText weight="bold" style={styles.configTitle}>Exam Rules</AppText>
        </View>
        {examSubjectId && !isEditMode ? (
          <View style={styles.savedBadge}>
            <CheckCircle2 size={12} color="#15803d" />
            <AppText weight="bold" style={styles.savedBadgeText}>Set</AppText>
          </View>
        ) : null}
      </View>

      {!examSubjectId || isEditMode ? (
        <View style={styles.configForm}>
          <View style={styles.configRow}>
            <View style={styles.configInputGroup}>
              <AppText weight="semibold" style={styles.configLabel}>Total Marks</AppText>
              <TextInput
                style={styles.configInput}
                placeholder="e.g. 100"
                keyboardType="numeric"
                value={inputMaxMarks}
                onChangeText={onMaxMarksChange}
              />
            </View>
            <View style={styles.configInputGroup}>
              <AppText weight="semibold" style={styles.configLabel}>Pass Marks</AppText>
              <TextInput
                style={styles.configInput}
                placeholder="e.g. 33"
                keyboardType="numeric"
                value={inputPassMarks}
                onChangeText={onPassMarksChange}
              />
            </View>
          </View>
          <AppButton
            title={savingExamConfig ? 'Saving...' : 'Confirm Rules'}
            onPress={onSave}
            disabled={savingExamConfig}
            style={styles.primaryButton}
          />
        </View>
      ) : (
        <View style={styles.configDisplay}>
          <View style={styles.configItem}>
            <AppText weight="bold" style={styles.configItemLabel}>Total</AppText>
            <AppText weight="bold" style={styles.configItemValue}>{inputMaxMarks}</AppText>
          </View>
          <View style={styles.configItem}>
            <AppText weight="bold" style={styles.configItemLabel}>Pass</AppText>
            <AppText weight="bold" style={styles.configItemValue}>{inputPassMarks}</AppText>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.editConfigBtn} onPress={onEdit}>
            <RefreshCw size={16} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </AppCard>
  );
}
