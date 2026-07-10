import { Theme } from '../../theme/tokens';
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Search, Users, User, Percent } from 'lucide-react-native';
import AppText from '../common/AppText';

interface ClassItem {
  id: string;
  name: string;
  students: number;
  teacher: string;
  attendance: number;
}

interface ClassSelectorProps {
  onSelectClass: (classData: ClassItem) => void;
  classes?: ClassItem[];
}

const DEFAULT_CLASSES: ClassItem[] = [
  { id: '1', name: 'Class 1', students: 45, teacher: 'Ms. Smith', attendance: 92 },
  { id: '2', name: 'Class 2', students: 48, teacher: 'Mr. Johnson', attendance: 88 },
  { id: '3', name: 'Class 3', students: 42, teacher: 'Mrs. Williams', attendance: 94 },
  { id: '4', name: 'Class 4', students: 47, teacher: 'Dr. Brown', attendance: 89 },
  { id: '5', name: 'Class 5', students: 44, teacher: 'Ms. Davis', attendance: 91 },
  { id: '6', name: 'Class 6', students: 46, teacher: 'Mr. Miller', attendance: 87 },
  { id: '7', name: 'Class 7', students: 43, teacher: 'Mrs. Wilson', attendance: 93 },
  { id: '8', name: 'Class 8', students: 45, teacher: 'Ms. Moore', attendance: 90 },
  { id: '9', name: 'Class 9', students: 47, teacher: 'Mr. Taylor', attendance: 86 },
  { id: '10', name: 'Class 10', students: 43, teacher: 'Mrs. Anderson', attendance: 95 },
];

const COLORS = [
  { bg: Theme.colors.skyLight, accent: '#0284c7' },
  { bg: '#dcfce7', accent: Theme.colors.success },
  { bg: '#fff1f2', accent: '#e11d48' },
  { bg: Theme.colors.amberLight, accent: Theme.colors.warning },
  { bg: '#f3e8ff', accent: '#9333ea' },
  { bg: '#ffedd5', accent: '#ea580c' },
  { bg: '#cffafe', accent: '#0891b2' },
  { bg: '#fce7f3', accent: '#db2777' },
  { bg: '#ecfccb', accent: '#4d7c0f' },
  { bg: '#fff7ed', accent: '#c2410c' },
];

export default function ClassSelector({ onSelectClass, classes = DEFAULT_CLASSES }: ClassSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) {return classes;}
    return classes.filter(cls =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Curved Navy Header with Search */}
      <LinearGradient
        colors={[Theme.colors.primary, Theme.colors.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerStandard, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard')}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={Theme.colors.card} />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.headerTitle}>Select Class</AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by class name..."
              placeholderTextColor={Theme.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText style={styles.subtitle}>
          Click on a class to view student attendance
        </AppText>

        <View style={styles.classGrid}>
          {filteredClasses.map((classItem, index) => {
            const themeColors = COLORS[index % COLORS.length];
            return (
              <TouchableOpacity accessibilityRole="button"
                key={classItem.id}
                style={styles.classCard}
                onPress={() => onSelectClass(classItem)}
                activeOpacity={0.7}
              >
                {/* Left accent border */}
                <View style={[styles.cardAccentLeft, { backgroundColor: themeColors.accent }]} />

                <AppText weight="bold" style={styles.className}>{classItem.name}</AppText>

                <View style={styles.classInfo}>
                  <View style={styles.infoRow}>
                    <Users size={14} color={Theme.colors.textSec} />
                    <AppText style={styles.infoText}>{classItem.students} Students</AppText>
                  </View>
                  <View style={styles.infoRow}>
                    <User size={14} color={Theme.colors.textSec} />
                    <AppText style={styles.infoText} numberOfLines={1}>
                      {classItem.teacher ? classItem.teacher : 'No Class Teacher'}
                    </AppText>
                  </View>
                  <View style={styles.infoRow}>
                    <Percent size={14} color={Theme.colors.textSec} />
                    <AppText style={styles.infoText}>Avg. Att: {classItem.attendance}%</AppText>
                  </View>
                </View>

                <View style={styles.viewButton}>
                  <AppText weight="bold" style={[styles.viewButtonText, { color: themeColors.accent }]}>
                    View Attendance
                  </AppText>
                  <AppText weight="bold" style={[styles.viewButtonArrow, { color: themeColors.accent }]}>→</AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {filteredClasses.length === 0 && (
          <AppText style={styles.noResults}>No classes found.</AppText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.card,
  },
  searchContainer: {
    marginTop: Theme.spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    ...Theme.typography.body,
    color: Theme.colors.text,
    paddingVertical: Theme.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: 40,
  },
  subtitle: {
    color: Theme.colors.textSec,
    ...Theme.typography.body,
    fontWeight: '500',
    marginBottom: Theme.spacing.md,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  classCard: {
    width: '48%',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccentLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  className: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
    marginBottom: 10,
    paddingLeft: Theme.spacing.xs,
  },
  classInfo: {
    marginVertical: Theme.spacing.xs,
    gap: 6,
    paddingLeft: Theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  infoText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingLeft: Theme.spacing.xs,
  },
  viewButtonText: {
    ...Theme.typography.caption,
  },
  viewButtonArrow: {
    ...Theme.typography.caption,
  },
  noResults: {
    textAlign: 'center',
    color: Theme.colors.textSec,
    marginTop: 40,
    ...Theme.typography.body,
  },
});
