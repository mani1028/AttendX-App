import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/feather';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import { colors } from '../../constants/theme';
import AppCard from '../../components/common/AppCard';
import { RootStackParamList } from '../../navigation/AppNavigator';

export default function TeacherDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Teacher'}!</AppText>
            <AppText style={styles.welcomeSub}>Manage your classes and students today.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        <AppCard style={styles.card} onPress={() => navigation.navigate('TeacherAttendance')}>
          <AppText style={styles.cardTitle}>Take Attendance</AppText>
        </AppCard>

        <AppCard style={styles.card} onPress={() => navigation.navigate('TeacherStudentList')}>
          <AppText style={styles.cardTitle}>View Students</AppText>
        </AppCard>

        <AppCard style={styles.card} onPress={() => navigation.navigate('TeacherRegisterPublic', { school_code: '', branch_id: '' })}>
          <AppText style={styles.cardTitle}>Teacher Registration</AppText>
        </AppCard>
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
    paddingTop: 20,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    marginBottom: 12,
    padding: 14,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
