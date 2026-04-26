import API from './api';

async function getFirstSuccessful<T>(endpoints: string[], headers: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { headers });
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('HM service endpoint not found');
}

export async function getHMStats(headers: any): Promise<any> {
  const endpoints = [
    '/hm/dashboard/stats',
    '/api/hm/dashboard/stats',
    '/manage/hm/dashboard/stats'
  ];
  return getFirstSuccessful(endpoints, headers);
}

export async function getHMClasses(headers: any): Promise<any[]> {
  const endpoints = [
    '/hm/classes',
    '/api/hm/classes',
    '/manage/hm/classes'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}
