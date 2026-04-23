import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { colors } from '../../constants/colors';
import AppCard from '../common/AppCard';

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

  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    return classes.filter(cls =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Class</Text>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by class name..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <Text style={styles.subtitle}>
        Click on a class to view student attendance
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.classGrid}>
          {filteredClasses.map((classItem, index) => {
            const colors = COLORS[index % COLORS.length];
            return (
              <TouchableOpacity
                key={classItem.id}
                style={[styles.classCard, { backgroundColor: colors.bg }]}
                onPress={() => onSelectClass(classItem)}
              >
                <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
                <Text style={styles.className}>{classItem.name}</Text>
                
                <View style={styles.classInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👥</Text>
                    <Text style={styles.infoText}>{classItem.students} Students</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👨‍🏫</Text>
                    <Text style={styles.infoText}>Class Teacher: {classItem.teacher}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📊</Text>
                    <Text style={styles.infoText}>Avg. Attendance: {classItem.attendance}%</Text>
                  </View>
                </View>

                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Attendance</Text>
                  <Text style={styles.viewButtonArrow}>→</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {filteredClasses.length === 0 && (
          <Text style={styles.noResults}>No classes found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#94a3b8',
  },
  searchInput: {
    width: 200,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 20,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  classCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  classInfo: {
    marginVertical: 8,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  viewButtonArrow: {
    fontSize: 12,
    color: '#10b981',
  },
  noResults: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  },
});