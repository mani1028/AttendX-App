import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/feather';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import AppCard from '../../components/common/AppCard';
import { RootStackParamList } from '../../navigation/AppNavigator';

export default function StudentDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const menuItems: { name: string; icon: string; screen: keyof RootStackParamList }[] = [
    { name: 'Attendance', icon: 'check-circle', screen: 'StudentAttendance' },
    { name: 'Marks', icon: 'bar-chart-2', screen: 'StudentMarks' },
    { name: 'Homework', icon: 'book', screen: 'StudentHomework' },
    { name: 'Fee', icon: 'credit-card', screen: 'StudentFee' },
    { name: 'Leave', icon: 'calendar', screen: 'StudentLeave' },
    { name: 'Question Papers', icon: 'file-text', screen: 'StudentQuestionPapers' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
            <AppText style={styles.welcomeSub}>Stay on top of your studies.</AppText>
          </View>
        </View>

        {/* Quick Links Grid */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <AppCard
              key={index}
              style={styles.itemCard}
              containerStyle={styles.gridItem}
              onPress={() => navigation.navigate(item.screen as any)}
            >
              <Icon name={item.icon} size={24} color={colors.primary} />
              <AppText style={styles.itemText}>{item.name}</AppText>
            </AppCard>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  itemCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
