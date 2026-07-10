import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Teacher } from './types';

export const isClassTeacherEntry = (teacher: Teacher): boolean => {
    const candidates = [
        teacher.is_class_teacher,
        teacher.class_teacher,
        teacher.classTeacher,
        teacher.isClassTeacher,
        teacher.role,
        teacher.designation,
        teacher.teacher_type,
        teacher.type,
        teacher.subject,
    ];

    return candidates.some((value) => {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return (
                normalized === 'class teacher' ||
                normalized === 'class_teacher' ||
                normalized === 'classteacher' ||
                normalized.includes('class teacher')
            );
        }

        return false;
    });
};

export const getAutoSelectedTeacher = (teacherList: Teacher[]): Teacher | undefined => {
    return teacherList.find(isClassTeacherEntry) || teacherList[0];
};

export const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (from === to) {
        return fromDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }
    return `${fromDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })} - ${toDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;
};

export const getDuration = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const formatPickerDate = (date: Date): string => {
    return date
        .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
        .replace(/\//g, '-');
};

export const getSchoolCode = async (): Promise<string> => {
    const code = await AsyncStorage.getItem('school_code');
    return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

export const getStudentId = async (): Promise<string> => {
    const id = await AsyncStorage.getItem('student_id');
    return id || (await AsyncStorage.getItem('studentId')) || '';
};

export const getParentId = async (): Promise<string> => {
    const id = await AsyncStorage.getItem('parent_id');
    return id || (await AsyncStorage.getItem('parentId')) || '';
};
