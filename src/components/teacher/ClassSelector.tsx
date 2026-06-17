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
  { bg: '#e0f2fe', accent: '#0284c7' },
  { bg: '#dcfce7', accent: '#10b981' },
  { bg: '#fff1f2', accent: '#e11d48' },
  { bg: '#fef3c7', accent: '#d97706' },
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
    if (!searchTerm.trim()) return classes;
    return classes.filter(cls =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Curved Navy Header with Search */}
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerStandard, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard')}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.headerTitle}>Select Class</AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by class name..."
              placeholderTextColor="#94a3b8"
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
              <TouchableOpacity
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
                    <Users size={14} color="#64748B" />
                    <AppText style={styles.infoText}>{classItem.students} Students</AppText>
                  </View>
                  <View style={styles.infoRow}>
                    <User size={14} color="#64748B" />
                    <AppText style={styles.infoText} numberOfLines={1}>
                      {classItem.teacher ? classItem.teacher : 'No Class Teacher'}
                    </AppText>
                  </View>
                  <View style={styles.infoRow}>
                    <Percent size={14} color="#64748B" />
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
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 24,
    paddingHorizontal: 16,
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
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFF',
  },
  searchContainer: {
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  classCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
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
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 10,
    paddingLeft: 4,
  },
  classInfo: {
    marginVertical: 4,
    gap: 6,
    paddingLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingLeft: 4,
  },
  viewButtonText: {
    fontSize: 12,
  },
  viewButtonArrow: {
    fontSize: 12,
  },
  noResults: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 40,
    fontSize: 14,
  },
});