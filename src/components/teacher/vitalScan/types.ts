export type ScanType = 'teeth' | 'eye';

export interface ImageItem {
  uri: string;
  type?: string;
  name?: string;
}

export interface ScanResult {
  health_status: 'Good' | 'Bad';
  prediction: string;
  recommendation: string;
}

export interface FeverResult {
  status: string;
  rec: string;
  color: string;
  temp: number;
}

export interface ToastState {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
}

export const TEETH_STEPS = ['Center View', 'Left View', 'Right View'] as const;
