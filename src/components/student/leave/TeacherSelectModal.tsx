import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { leaveStyles as styles } from './leaveStyles';
import type { Teacher } from './types';

interface TeacherSelectModalProps {
    visible: boolean;
    teachers: Teacher[];
    teacherId: string;
    onSelect: (teacherId: string) => void;
    onClose: () => void;
}

export default function TeacherSelectModal({
    visible,
    teachers,
    teacherId,
    onSelect,
    onClose,
}: TeacherSelectModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.teacherModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Teacher</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="x" size={24} color={C.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.teacherList}>
                        {teachers.map((teacher, index) => (
                            <TouchableOpacity
                                key={teacher.teacher_id || teacher.id || teacher.staff_id || `teacher-${index}`}
                                style={[
                                    styles.teacherItem,
                                    String(teacherId) === String(teacher.teacher_id) && styles.teacherItemSelected,
                                ]}
                                onPress={() => onSelect(teacher.teacher_id)}
                            >
                                <View style={styles.teacherItemAvatar}>
                                    <Text style={styles.teacherItemAvatarText}>
                                        {teacher.teacher_full_name.charAt(0)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.teacherItemName}>{teacher.teacher_full_name}</Text>
                                    {teacher.subject && (
                                        <Text style={styles.teacherItemSubject}>{teacher.subject}</Text>
                                    )}
                                </View>
                                {String(teacherId) === String(teacher.teacher_id) && (
                                    <Icon name="check" size={20} color={C.colors.blue} style={styles.checkIcon} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
