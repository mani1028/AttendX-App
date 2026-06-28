export type AttendanceColor = 'green' | 'red' | 'orange' | 'gray';

export interface AttendanceDisplayStatus {
  status: string;
  label: string;
  color: AttendanceColor;
}

export interface SessionDisplayStatus {
  label: string;
  color: AttendanceColor;
  marked: boolean;
}

export function getAttendanceDisplayStatus(
  attendance: Record<string, unknown> | null | undefined,
  dailySessions: number,
): AttendanceDisplayStatus {
  const s1 = String(attendance?.session1_status || '').toUpperCase();
  const s2 = String(attendance?.session2_status || '').toUpperCase();
  const overallStatus = String(attendance?.status || '').toUpperCase();

  if (dailySessions === 1) {
    const isPresent = s1 === 'PRESENT' || overallStatus === 'PRESENT';
    return {
      status: isPresent ? 'PRESENT' : 'ABSENT',
      label: isPresent ? 'Present' : 'Absent',
      color: isPresent ? 'green' : 'red',
    };
  }

  if (overallStatus === 'PRESENT' || (s1 === 'PRESENT' && s2 === 'PRESENT')) {
    return { status: 'PRESENT', label: 'Present', color: 'green' };
  }
  if (
    overallStatus === 'HALF_DAY' ||
    (s1 === 'PRESENT' && s2 !== 'PRESENT') ||
    (s2 === 'PRESENT' && s1 !== 'PRESENT')
  ) {
    return { status: 'HALF_DAY', label: 'Half Day', color: 'orange' };
  }
  return { status: 'ABSENT', label: 'Absent', color: 'red' };
}

export function getSessionDisplayStatus(
  attendance: Record<string, unknown> | null | undefined,
  dailySessions: number,
): { session1: SessionDisplayStatus; session2: SessionDisplayStatus } {
  const s1 = String(attendance?.session1_status || '').toUpperCase();
  const s2 = String(attendance?.session2_status || '').toUpperCase();

  if (dailySessions === 1) {
    const isPresent = s1 === 'PRESENT';
    return {
      session1: {
        label: isPresent ? 'Present' : 'Absent',
        color: isPresent ? 'green' : 'red',
        marked: Boolean(attendance?.session1_status),
      },
      session2: { label: 'N/A', color: 'gray', marked: false },
    };
  }

  return {
    session1: {
      label: s1 === 'PRESENT' ? 'Present' : s1 === 'ABSENT' ? 'Absent' : '—',
      color: s1 === 'PRESENT' ? 'green' : s1 === 'ABSENT' ? 'red' : 'gray',
      marked: Boolean(attendance?.session1_status),
    },
    session2: {
      label: s2 === 'PRESENT' ? 'Present' : s2 === 'ABSENT' ? 'Absent' : '—',
      color: s2 === 'PRESENT' ? 'green' : s2 === 'ABSENT' ? 'red' : 'gray',
      marked: Boolean(attendance?.session2_status),
    },
  };
}

export function colorToTheme(color: AttendanceColor): string {
  switch (color) {
    case 'green': return '#059669';
    case 'red': return '#dc2626';
    case 'orange': return '#d97706';
    default: return '#8898aa';
  }
}
