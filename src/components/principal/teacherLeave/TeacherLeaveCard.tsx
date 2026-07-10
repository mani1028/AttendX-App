import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import TeacherLeaveStatusBadge from './TeacherLeaveStatusBadge';
import { teacherLeaveStyles as styles } from './teacherLeaveStyles';
import type { TeacherLeave } from './types';

export interface TeacherLeaveCardProps {
  leave: TeacherLeave;
  onPress: (leave: TeacherLeave) => void;
}

export default function TeacherLeaveCard({ leave, onPress }: TeacherLeaveCardProps) {
  return (
    <TouchableOpacity
      style={styles.leaveCard}
      onPress={() => onPress(leave)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.teacherInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{leave.teacher_full_name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.teacherName}>{leave.teacher_full_name}</Text>
            <Text style={styles.teacherSubject}>{leave.subject || 'Teacher'}</Text>
          </View>
        </View>
        <TeacherLeaveStatusBadge status={leave.status} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateInfo}>
          <Calendar size={14} color={Theme.colors.textSec} />
          <Text style={styles.dateText}>
            {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.reasonText} numberOfLines={2}>{leave.reason}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.appliedOn}>Applied: {new Date(leave.created_at).toLocaleDateString()}</Text>
        <View style={styles.viewDetailsBtn}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ChevronRight size={16} color={Theme.colors.primaryLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
