export interface Teacher {
    teacher_id: string;
    teacher_full_name: string;
    subject?: string;
    avatar?: string;
    id?: string;
    staff_id?: string;
    is_class_teacher?: boolean;
    class_teacher?: boolean | string;
    classTeacher?: boolean | string;
    isClassTeacher?: boolean;
    role?: string;
    designation?: string;
    teacher_type?: string;
    type?: string;
}

export type LeaveType = 'ONE_DAY' | 'MULTIPLE_DAYS';

export interface LeaveRequest {
    leave_id: string;
    teacher_full_name?: string;
    teacher_id?: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at?: string;
    teacher_comment?: string;
}
