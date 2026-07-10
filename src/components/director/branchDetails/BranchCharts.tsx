import React from 'react';
import { View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { getSubjectColor, screenWidth } from './helpers';
import { branchDetailsStyles as styles } from './branchDetailsStyles';

export const PassFailChart: React.FC<{ passed: number; failed: number; title: string }> = ({ passed, failed, title }) => {
  const total = passed + failed;
  if (total === 0) { return null; }

  const data = [
    { name: 'Passed', population: passed, color: Theme.colors.success, legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Failed', population: failed, color: Theme.colors.error, legendFontColor: '#333', legendFontSize: 12 },
  ];

  return (
    <View style={styles.chartCard}>
      <AppText style={styles.chartTitle}>{title}</AppText>
      <PieChart
        data={data}
        width={screenWidth - 80}
        height={200}
        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
      <View style={styles.chartStats}>
        <View style={styles.chartStat}>
          <AppText style={[styles.chartStatValue, { color: Theme.colors.success }]}>{passed}</AppText>
          <AppText style={styles.chartStatLabel}>Passed</AppText>
        </View>
        <View style={styles.chartStat}>
          <AppText style={[styles.chartStatValue, { color: Theme.colors.error }]}>{failed}</AppText>
          <AppText style={styles.chartStatLabel}>Failed</AppText>
        </View>
        <View style={styles.chartStat}>
          <AppText style={styles.chartStatValue}>{total}</AppText>
          <AppText style={styles.chartStatLabel}>Total</AppText>
        </View>
      </View>
    </View>
  );
};

interface BarChartPoint {
  subject: string;
  percentage: number;
}

export const SubjectBarChart: React.FC<{ data: BarChartPoint[]; title: string }> = ({ data, title }) => (
  <View style={styles.chartContainer}>
    <AppText style={styles.chartSubtitle}>{title}</AppText>
    <BarChart
      data={{
        labels: data.map(d => d.subject),
        datasets: [{ data: data.map(d => d.percentage) }],
      }}
      width={screenWidth - 80}
      height={250}
      yAxisLabel=""
      yAxisSuffix="%"
      chartConfig={{
        backgroundColor: Theme.colors.background,
        backgroundGradientFrom: Theme.colors.card,
        backgroundGradientTo: Theme.colors.card,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
        style: { borderRadius: Theme.radius.lg },
      }}
      verticalLabelRotation={45}
      showValuesOnTopOfBars
    />
  </View>
);

export const ExamTrendChart: React.FC<{
  lineChartData: Array<Record<string, string | number>>;
  allSubjects: string[];
}> = ({ lineChartData, allSubjects }) => (
  <View style={styles.chartContainer}>
    <AppText style={styles.chartSubtitle}>Trend Across Exams</AppText>
    <LineChart
      data={{
        labels: lineChartData.map(d => String(d.exam_name)),
        datasets: allSubjects.map((subject, idx) => ({
          data: lineChartData.map(d => Number(d[subject]) || 0),
          color: () => getSubjectColor(subject, idx),
          strokeWidth: 2,
        })),
        legend: allSubjects,
      }}
      width={screenWidth - 80}
      height={300}
      chartConfig={{
        backgroundColor: Theme.colors.background,
        backgroundGradientFrom: Theme.colors.card,
        backgroundGradientTo: Theme.colors.card,
        decimalPlaces: 1,
        color: (opacity = 1, index = 0) => getSubjectColor(allSubjects[index] || '', index),
        labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
        style: { borderRadius: Theme.radius.lg },
      }}
      bezier
      style={styles.chart}
    />
  </View>
);
