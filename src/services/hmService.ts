import API from './api';

async function getFirstSuccessful<T>(endpoints: string[], headers: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { headers, suppressFallback404Log: true });
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('HM service endpoint not found');
}

function normalizeTeacherList(data: any): any[] {
  const rows = data?.items || data?.teachers || data?.records || data?.data || data;
  const items = Array.isArray(rows) ? rows : [];

  return items.filter(Boolean).map((teacher: any) => ({
    ...teacher,
    teacher_status: teacher.teacher_status || teacher.status || 'ACTIVE',
  }));
}

export async function getHMStats(headers: any): Promise<any> {
  const endpoints = ['hm/dashboard/stats'];
  return getFirstSuccessful(endpoints, headers);
}

export async function getHMClasses(headers: any): Promise<any[]> {
  const endpoints = ['hm/classes'];
  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getHMTeachers(headers: any): Promise<any[]> {
  const endpoints = ['hm/teachers'];

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
    const response = await API.get('hm/teachers/attendance', {
      headers,
      params: { on_date: new Date().toISOString().split('T')[0] },
      suppressFallback404Log: true,
    });
    const items = normalizeTeacherList(response.data);
    if (items.length) {
      return items;
    }
  } catch (err) {
    console.warn('Attendance-based teacher fetch failed:', err);
  }

  return [];
}
