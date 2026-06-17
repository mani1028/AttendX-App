import API from './api';

async function getFirstSuccessful<T>(endpoints: string[], headers: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { headers, suppressFallback404Log: true } as any);
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Principal service endpoint not found');
}

function normalizeTeacherList(data: any): any[] {
  const rows = data?.items || data?.teachers || data?.records || data?.data || data;
  const items = Array.isArray(rows) ? rows : [];

  return items.filter(Boolean).map((teacher: any) => ({
    ...teacher,
    teacher_status: teacher.teacher_status || teacher.status || 'ACTIVE',
  }));
}

export async function getPrincipalStats(headers: any): Promise<any> {
  const endpoints = [
    'principal/dashboard/stats',
    'principal/dashboard/stats'
  ];
  return getFirstSuccessful(endpoints, headers);
}

export async function getPrincipalClasses(headers: any): Promise<any[]> {
  const endpoints = [
    'principal/classes',
    'principal/classes'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    return (data as any).items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getPrincipalTeachers(headers: any): Promise<any[]> {
  const endpoints = [
    'principal/staff',
    'principal/teachers'
  ];

  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    const items = normalizeTeacherList(data);
    if (items.length) {
      return items;
    }
  } catch (err) {
    console.warn('Primary teacher endpoint failed:', err);
    // Fall through to the attendance-backed teacher list.
  }

  try {
    // Attempt fallback to principal/staff/attendance first
    const endpointsAttendance = [
      'principal/staff/attendance',
      'principal/staff/attendance'
    ];
    
    let responseData;
    for (const ep of endpointsAttendance) {
      try {
        const response = await API.get(ep, {
          headers,
          params: { on_date: new Date().toISOString().split('T')[0] },
          suppressFallback404Log: true,
        } as any);
        responseData = response.data;
        break;
      } catch (e) {}
    }

    if (responseData) {
      const items = normalizeTeacherList(responseData);
      if (items.length) {
        return items;
      }
    }
  } catch (err) {
    console.warn('Attendance-based teacher fetch failed:', err);
  }

  return [];
}
