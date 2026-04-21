import API from './api';

type AttendanceData = {
  percentage: number;
  presentDays: number;
  absentDays: number;
};

type MarksData = {
  subjects: Array<{ subject: string; score: number }>;
};

type FeeData = {
  totalFee: number;
  paidFee: number;
  pendingFee: number;
};

const ATTENDANCE_ENDPOINTS = ['/student/attendance', '/students/attendance'];
const MARKS_ENDPOINTS = ['/student/marks', '/students/marks'];
const FEE_ENDPOINTS = ['/student/fee', '/student/fees', '/student/fee-summary', '/students/fees'];

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

async function getFirstSuccessful<T>(endpoints: string[]) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint);
      return response.data;
    } catch {
      // Try next endpoint variant.
    }
  }
  throw new Error('No backend endpoint responded for this resource.');
}

export async function getStudentAttendance(): Promise<AttendanceData> {
  const data = (await getFirstSuccessful<
    | {
        attendance_percentage?: number | string;
        percentage?: number | string;
        present_days?: number | string;
        absent_days?: number | string;
        present?: number | string;
        absent?: number | string;
      }
    | Array<{ status?: string }>
  >(ATTENDANCE_ENDPOINTS)) as any;

  if (Array.isArray(data)) {
    const presentDays = data.filter(item => String(item.status).toLowerCase() === 'present').length;
    const total = data.length || 1;
    const absentDays = Math.max(total - presentDays, 0);
    return {
      percentage: Math.round((presentDays / total) * 100),
      presentDays,
      absentDays,
    };
  }

  const presentDays = toNumber(data.present_days ?? data.present);
  const absentDays = toNumber(data.absent_days ?? data.absent);
  const fallbackTotal = Math.max(presentDays + absentDays, 1);
  const percentage = toNumber(data.attendance_percentage ?? data.percentage, Math.round((presentDays / fallbackTotal) * 100));

  return {
    percentage,
    presentDays,
    absentDays,
  };
}

export async function getStudentMarks(): Promise<MarksData> {
  const data = (await getFirstSuccessful<
    | { subjects?: Array<{ subject?: string; name?: string; score?: number | string; marks?: number | string }> }
    | Array<{ subject?: string; name?: string; score?: number | string; marks?: number | string }>
  >(MARKS_ENDPOINTS)) as any;

  const list = Array.isArray(data) ? data : data.subjects ?? [];

  return {
    subjects: list.map((item: any) => ({
      subject: String(item.subject ?? item.name ?? 'Subject'),
      score: toNumber(item.score ?? item.marks),
    })),
  };
}

export async function getStudentFee(): Promise<FeeData> {
  const data = (await getFirstSuccessful<
    | {
        total_fee?: number | string;
        paid_fee?: number | string;
        pending_fee?: number | string;
        total?: number | string;
        paid?: number | string;
        pending?: number | string;
      }
    | Array<{ amount?: number | string; status?: string }>
  >(FEE_ENDPOINTS)) as any;

  if (Array.isArray(data)) {
    const totalFee = data.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const paidFee = data
      .filter(item => String(item.status).toLowerCase() === 'paid')
      .reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
      totalFee,
      paidFee,
      pendingFee: Math.max(totalFee - paidFee, 0),
    };
  }

  const totalFee = toNumber(data.total_fee ?? data.total);
  const paidFee = toNumber(data.paid_fee ?? data.paid);
  const pendingFee = toNumber(data.pending_fee ?? data.pending, Math.max(totalFee - paidFee, 0));

  return {
    totalFee,
    paidFee,
    pendingFee,
  };
}