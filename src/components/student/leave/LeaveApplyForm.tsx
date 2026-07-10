import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { formatPickerDate } from './helpers';
import { leaveStyles as styles } from './leaveStyles';
import type { LeaveType, Teacher } from './types';

interface LeaveApplyFormProps {
    leaveType: LeaveType;
    onLeaveTypeChange: (type: LeaveType) => void;
    selectedTeacher: Teacher | undefined;
    onTeacherPress: () => void;
    fromDate: Date | null;
    toDate: Date | null;
    reason: string;
    onReasonChange: (text: string) => void;
    showFromDatePicker: boolean;
    showToDatePicker: boolean;
    onShowFromDatePicker: () => void;
    onShowToDatePicker: () => void;
    onFromDateChange: (event: unknown, selectedDate?: Date) => void;
    onToDateChange: (event: unknown, selectedDate?: Date) => void;
    submitting: boolean;
    onSubmit: () => void;
}

export default function LeaveApplyForm({
    leaveType,
    onLeaveTypeChange,
    selectedTeacher,
    onTeacherPress,
    fromDate,
    toDate,
    reason,
    onReasonChange,
    showFromDatePicker,
    showToDatePicker,
    onShowFromDatePicker,
    onShowToDatePicker,
    onFromDateChange,
    onToDateChange,
    submitting,
    onSubmit,
}: LeaveApplyFormProps) {
    return (
        <View style={styles.formCard}>
            <Text style={styles.cardTitle}>APPLY LEAVE</Text>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Leave Type</Text>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, leaveType === 'ONE_DAY' && styles.toggleButtonActive]}
                        onPress={() => onLeaveTypeChange('ONE_DAY')}
                    >
                        <Text
                            style={[
                                styles.toggleButtonText,
                                leaveType === 'ONE_DAY' && styles.toggleButtonTextActive,
                            ]}
                        >
                            One Day
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            leaveType === 'MULTIPLE_DAYS' && styles.toggleButtonActive,
                        ]}
                        onPress={() => onLeaveTypeChange('MULTIPLE_DAYS')}
                    >
                        <Text
                            style={[
                                styles.toggleButtonText,
                                leaveType === 'MULTIPLE_DAYS' && styles.toggleButtonTextActive,
                            ]}
                        >
                            Multiple Days
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Class Teacher</Text>
                <TouchableOpacity
                    style={styles.autoTeacherCard}
                    onPress={onTeacherPress}
                    activeOpacity={0.8}
                >
                    <View style={styles.autoTeacherTextBlock}>
                        <Text style={[styles.dropdownText, !selectedTeacher && styles.dropdownPlaceholder]}>
                            {selectedTeacher
                                ? selectedTeacher.teacher_full_name
                                : 'Class teacher will be selected automatically'}
                        </Text>
                        <Text style={styles.autoTeacherHint}>
                            {selectedTeacher
                                ? 'Auto-selected for your class'
                                : 'No class teacher available yet'}
                        </Text>
                    </View>
                    <Icon name="user-check" size={20} color={C.colors.blue} />
                </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                    {leaveType === 'ONE_DAY' ? 'Select Date' : 'From Date'}
                </Text>
                <TouchableOpacity style={styles.inputField} onPress={onShowFromDatePicker}>
                    <Text style={[styles.inputText, !fromDate && styles.dropdownPlaceholder]}>
                        {fromDate ? formatPickerDate(fromDate) : 'dd-mm-yy'}
                    </Text>
                    <Icon name="calendar" size={18} color={C.colors.textSec} />
                </TouchableOpacity>
                {showFromDatePicker && (
                    <DateTimePicker
                        value={fromDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onFromDateChange}
                        minimumDate={new Date()}
                    />
                )}
            </View>

            {leaveType === 'MULTIPLE_DAYS' && (
                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>To Date</Text>
                    <TouchableOpacity
                        style={styles.inputField}
                        onPress={onShowToDatePicker}
                        disabled={!fromDate}
                    >
                        <Text style={[styles.inputText, (!toDate || !fromDate) && styles.dropdownPlaceholder]}>
                            {toDate ? formatPickerDate(toDate) : 'dd-mm-yy'}
                        </Text>
                        <Icon name="calendar" size={18} color={C.colors.textSec} />
                    </TouchableOpacity>
                    {showToDatePicker && (
                        <DateTimePicker
                            value={toDate || fromDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onToDateChange}
                            minimumDate={fromDate || new Date()}
                        />
                    )}
                </View>
            )}

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason for Leave</Text>
                <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={4}
                    value={reason}
                    onChangeText={onReasonChange}
                    placeholder="Reason"
                    placeholderTextColor={C.colors.textMuted}
                    textAlignVertical="top"
                />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={submitting}>
                {submitting ? (
                    <ActivityIndicator size="small" color={C.colors.card} />
                ) : (
                    <>
                        <Icon name="send" size={20} color={C.colors.card} style={styles.submitIcon} />
                        <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}
