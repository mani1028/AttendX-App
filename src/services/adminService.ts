import API from './api';

async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { 
        ...params, 
        suppressFallback404Log: true,
        suppressNetworkErrorLog: true 
      });
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

export async function verifySuperAdminPassword(schoolId: string, password: string): Promise<any> {
  const res = await API.post('/schools/super-admin/verify-password', {
    school_id: schoolId,
    super_admin_password: password,
  }, {
    suppressLogoutOn401: true,
  } as any);
  return res.data;
}

export async function deleteSchoolComplete(schoolId: string, password: string, confirmationText: string): Promise<any> {
  const res = await API.post('/schools/super-admin/delete-school-complete', {
    school_id: schoolId,
    super_admin_password: password,
    confirmation_text: confirmationText,
  }, {
    suppressLogoutOn401: true,
  } as any);
  return res.data;
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

export async function getAllAgents(): Promise<any[]> {
  const endpoints = [
    '/schools/agents/all',
    '/admin/schools/agents/all',
    '/manage/schools/agents/all',
    'schools/agents/all'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return Array.isArray(data) ? data : (data.agents || data.items || []);
  } catch (err) {
    return [];
  }
}

export async function createAgent(formData: any): Promise<any> {
  const endpoints = ['/schools/agents', '/admin/schools/agents', 'schools/agents'];
  for (const endpoint of endpoints) {
    try {
      const res = await API.post(endpoint, formData);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to create agent');
}

export async function updateAgent(id: string, formData: any): Promise<any> {
  const endpoints = [`/schools/agents/${id}`, `/admin/schools/agents/${id}`, `schools/agents/${id}`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.put(endpoint, formData);
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to update agent');
}

export async function toggleAgentStatus(id: string, isActive: boolean): Promise<any> {
  const endpoints = [`/schools/agents/${id}`, `/admin/schools/agents/${id}`, `schools/agents/${id}`];
  for (const endpoint of endpoints) {
    try {
      const res = await API.put(endpoint, { is_active: isActive });
      return res.data;
    } catch (err) {}
  }
  throw new Error('Failed to update agent status');
}

export async function getRevenueStats(): Promise<any> {
  const endpoints = [
    '/schools/revenue/stats',
    '/admin/schools/revenue/stats',
    '/manage/schools/revenue/stats'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}

export async function getAllPlans(): Promise<any[]> {
  try {
    const res = await API.get('/pricing/admin/all');
    return res.data;
  } catch (err) {
    return [];
  }
}

export async function createPlan(planData: any): Promise<any> {
  const res = await API.post('/pricing/admin', planData);
  return res.data;
}

export async function updatePlan(id: string, planData: any): Promise<any> {
  const res = await API.put(`/pricing/admin/${id}`, planData);
  return res.data;
}

export async function deletePlan(id: string): Promise<any> {
  const res = await API.delete(`/pricing/admin/${id}`);
  return res.data;
}
