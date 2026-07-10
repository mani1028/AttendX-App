import React from 'react';
import { View, Text } from 'react-native';
import { fmt } from './helpers';
import { payrollStyles as styles } from './payrollStyles';

type BulkSummaryProps = {
  genCount: number;
  totalEmployees: number;
  totalGross: number;
  totalDed: number;
  totalNet: number;
};

export function PayrollBulkSummaryBar({ genCount, totalEmployees, totalGross, totalDed, totalNet }: BulkSummaryProps) {
  if (genCount <= 0) {
    return null;
  }
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Generated</Text>
        <Text style={styles.summaryValue}>{genCount}/{totalEmployees}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Gross</Text>
        <Text style={styles.summaryValue}>₹{fmt(totalGross)}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Deductions</Text>
        <Text style={[styles.summaryValue, styles.summaryValueRed]}>₹{fmt(totalDed)}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Net</Text>
        <Text style={[styles.summaryValue, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text>
      </View>
    </View>
  );
}

type HoursSummaryProps = {
  generatedCount: number;
  totalHoursAll: number;
  totalNet: number;
};

export function PayrollHoursSummaryBar({ generatedCount, totalHoursAll, totalNet }: HoursSummaryProps) {
  if (generatedCount <= 0) {
    return null;
  }
  return (
    <View style={styles.summaryBarHours}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Part-Time Staff</Text>
        <Text style={styles.summaryValueLarge}>{generatedCount}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Est. Total Hours</Text>
        <Text style={styles.summaryValueLarge}>{totalHoursAll.toFixed(1)}h</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Net Payable</Text>
        <Text style={[styles.summaryValueLarge, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text>
      </View>
    </View>
  );
}

type IndividualSummaryProps = {
  gross: number;
  totalDeductions: number;
  net: number;
};

export function PayrollIndividualSummary({ gross, totalDeductions, net }: IndividualSummaryProps) {
  return (
    <View style={styles.resultSummary}>
      <View style={styles.resultItem}>
        <Text style={styles.resultLabel}>Gross</Text>
        <Text style={styles.resultValue}>₹{fmt(gross)}</Text>
      </View>
      <View style={styles.resultItem}>
        <Text style={styles.resultLabel}>Deductions</Text>
        <Text style={[styles.resultValue, styles.resultValueRed]}>–₹{fmt(totalDeductions)}</Text>
      </View>
      <View style={styles.resultItem}>
        <Text style={styles.resultLabel}>Net Pay</Text>
        <Text style={[styles.resultValue, styles.resultValueGreen]}>₹{fmt(net)}</Text>
      </View>
    </View>
  );
}
