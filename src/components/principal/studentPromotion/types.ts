import {
  GraduationCap,
  History,
  CalendarDays,
  Settings,
  Wrench,
} from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';

export const STEPS = { SELECT: 1, PREVIEW: 2, CONFIRM: 3, DONE: 4 } as const;
export const STEP_LABELS = ['Select', 'Preview', 'Confirm', 'Done'];
export type PromoTab = 'promote' | 'history' | 'years' | 'settings' | 'tools';
export const TABS: { id: PromoTab; label: string; icon: typeof GraduationCap }[] = [
  { id: 'promote', label: 'Promote', icon: GraduationCap },
  { id: 'history', label: 'History', icon: History },
  { id: 'years', label: 'Years', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'tools', label: 'Tools', icon: Wrench },
];

export type PromoStudent = {
  roll_no: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
  final_action?: string;
  to_class_name?: string;
  to_section_name?: string;
  is_already_processed?: boolean;
};

export const PICKER_TEXT = Theme.colors.text;
export const PICKER_MUTED = Theme.colors.textMuted;
