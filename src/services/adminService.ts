import API from './api';

async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Admin service endpoint not found');
}

export async function getAllSchools(): Promise<any[]> {
  const endpoints = [
    '/schools/all',
    '/admin/schools/all',
    '/manage/schools/all',
    'schools/all'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return Array.isArray(data) ? data : (data.items || []);
  } catch (err) {
    return [];
  }
}

export async function getSubscriptionStats(): Promise<any> {
  const endpoints = [
    '/schools/subscription/stats',
    '/admin/subscription/stats',
    '/manage/subscription/stats'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data.stats || data;
  } catch (err) {
    return null;
  }
}

export async function createSchool(formData: any): Promise<any> {
  const endpoints = ['/schools', '/admin/schools'];
  for (const endpoint of endpoints) {
    try {
      const res = await API.post(endpoint, formData);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to create school');
}

export async function updateSchool(id: string, formData: any): Promise<any> {
  const endpoints = [`/schools/${id}`, `/admin/schools/${id}`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.put(endpoint, formData);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to update school');
}

export async function deleteSchool(id: string): Promise<any> {
  const endpoints = [`/schools/${id}`, `/admin/schools/${id}`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.delete(endpoint);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to delete school');
}

export async function resendCredentials(id: string): Promise<any> {
  const endpoints = [`/schools/${id}/resend-credentials`, `/admin/schools/${id}/resend-credentials`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.post(endpoint);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to resend credentials');
}

export async function sendReminder(id: string): Promise<any> {
  const endpoints = [`/schools/${id}/send-reminder`, `/admin/schools/${id}/send-reminder`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.post(endpoint);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to send reminder');
}

export async function getSchoolSubscription(id: string): Promise<any> {
  const endpoints = [
    `/schools/${id}/subscription`,
    `/admin/schools/${id}/subscription`
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data.subscription || data;
  } catch (err) {
    return null;
  }
}

export async function getSchoolPayments(id: string): Promise<any[]> {
  const endpoints = [
    `/schools/${id}/payments`,
    `/admin/schools/${id}/payments`
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data.payments || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function updateSubscription(id: string, payload: any): Promise<any> {
  const endpoints = [
    `/schools/${id}/subscription`,
    `/admin/schools/${id}/subscription`
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await API.put(endpoint, payload);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to update subscription');
}
