export interface Student {
  id: string;
  name: string;
  roll: string;
  presentDays: number;
}

export interface ClassItem {
  class_grade: string;
  section: string;
}

export interface ViewedInfo {
  class: string;
  section: string;
  date: string;
  days: number;
}

export type PickerMode = 'class' | 'section' | null;
