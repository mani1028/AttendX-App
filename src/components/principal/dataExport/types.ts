export interface ClassSectionPair {
  class_grade?: string;
  section?: string;
}

export type AttendancePeriod = 'weekly' | 'monthly' | '3months' | '6months' | 'year' | 'custom';
export type CombinedPeriod = 'weekly' | 'monthly' | 'custom';

export interface Exam {
  exam_id: number;
  exam_name: string;
  academic_year: string;
}
