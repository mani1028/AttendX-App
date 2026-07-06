import API, { getApiBaseUrl, getWithRetry, isTransientNetworkError } from './api';

const WEBSITE_API_SILENT = {
  suppressFallback404Log: true,
  suppressNetworkErrorLog: true,
} as const;

// ponytail: portal-api often ships without /blogs,/forms; api.{domain} has them on same DB/JWT
function getWebsiteContentApiBase(): string | null {
  const primary = getApiBaseUrl().replace(/\/+$/, '');
  const match = primary.match(/^https?:\/\/portal-api\.(.+?)\/api$/i);
  if (match) {
    return `https://api.${match[1]}/api/`;
  }
  return null;
}

async function requestWithWebsiteFallback(config: {
  url: string;
  method?: string;
  data?: unknown;
}) {
  try {
    return await API.request({
      method: 'get',
      ...config,
      ...WEBSITE_API_SILENT,
    });
  } catch (error: any) {
    const status = error?.response?.status;
    if (status && status !== 404 && status !== 405) {
      throw error;
    }
    const fallbackBase = getWebsiteContentApiBase();
    if (!fallbackBase) {
      throw error;
    }
    if (__DEV__) {
      console.log(
        `[API] Website route missing on primary host; retrying ${config.method || 'GET'} ${config.url} via ${fallbackBase}`,
      );
    }
    return await API.request({
      method: 'get',
      ...config,
      baseURL: fallbackBase,
      ...WEBSITE_API_SILENT,
    });
  }
}

async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await getWithRetry<T>(endpoint, {
        ...params,
        suppressFallback404Log: true,
        suppressNetworkErrorLog: true,
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
    'schools/all',
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
    '/manage/subscription/stats',
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

export async function getSchoolDetails(schoolDbId: string): Promise<any> {
  const endpoints = [`/schools/${schoolDbId}`, `/admin/schools/${schoolDbId}`];
  return getFirstSuccessful<any>(endpoints);
}

export async function getSchoolSubscription(id: string): Promise<any> {
  const endpoints = [
    `/schools/${id}/subscription`,
    `/admin/schools/${id}/subscription`,
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
    `/admin/schools/${id}/payments`,
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
    `/admin/schools/${id}/subscription`,
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
    'schools/agents/all',
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

export async function getAgentMe(): Promise<any> {
  const endpoints = [
    '/schools/agents/me',
    '/admin/schools/agents/me',
    '/agents/me',
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}

export async function getRevenueStats(): Promise<any> {
  const endpoints = [
    '/schools/revenue/stats',
    '/admin/schools/revenue/stats',
    '/manage/schools/revenue/stats',
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}

export async function getAllPlatformPayments(): Promise<any[]> {
  try {
    const stats = await getRevenueStats();
    if (Array.isArray(stats?.recent_payments) && stats.recent_payments.length > 0) {
      return stats.recent_payments;
    }
  } catch {
    // fall through
  }

  try {
    const schools = await getAllSchools();
    const paymentLists = await Promise.all(
      schools.slice(0, 50).map(async (school) => {
        const schoolId = school.id || school.school_id;
        if (!schoolId) return [];
        const payments = await getSchoolPayments(String(schoolId));
        return payments.map((p: any) => ({
          ...p,
          school_name: school.name || school.school_name || p.school_name,
          school_id: school.school_id || schoolId,
        }));
      }),
    );
    return paymentLists.flat().sort((a, b) => {
      const aDate = new Date(a.paid_at || a.created_at || 0).getTime();
      const bDate = new Date(b.paid_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  } catch {
    return [];
  }
}

async function adminMutate<T>(endpoints: string[], method: 'post' | 'put' | 'patch' | 'delete', body?: any): Promise<T> {
  for (const endpoint of endpoints) {
    try {
      const res = await API.request<T>({ url: endpoint, method, data: body });
      return res.data;
    } catch {
      // try next
    }
  }
  throw new Error(`Admin API ${method} failed`);
}

async function websiteAdminMutate<T>(
  endpoints: string[],
  method: 'post' | 'put' | 'patch' | 'delete',
  body?: any,
): Promise<T> {
  let lastError: any = null;
  for (const endpoint of endpoints) {
    try {
      const res = await requestWithWebsiteFallback({ url: endpoint, method, data: body });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(formatApiErrorDetail(lastError, `Admin API ${method} failed`));
}

function extractAdminListPayload(data: unknown): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return [];
  }
  const record = data as Record<string, unknown>;
  for (const key of ['items', 'blogs', 'data', 'results', 'records']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function formatApiErrorDetail(error: any, fallback: string): string {
  if (isTransientNetworkError(error)) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  const detail = error?.response?.data?.detail ?? error?.response?.data?.message;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean)
      .join(', ');
  }
  if (error?.message) {
    return String(error.message);
  }
  return fallback;
}

export function normalizeAdminBlog(raw: Record<string, any>) {
  return {
    id: raw.id ?? raw.blog_id ?? raw._id,
    title: raw.title || raw.name || 'Untitled',
    author: raw.author || '',
    category: raw.category || '',
    desc: raw.desc || raw.description || '',
    content: raw.content || '',
    status: raw.status || 'draft',
    featured: Boolean(raw.featured),
    date: raw.date || '',
    image: raw.image || '',
    url: raw.url || '',
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export async function getAdminBlogs(): Promise<any[]> {
  const endpoints = ['/blogs/admin/all', '/admin/blogs/all'];
  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await requestWithWebsiteFallback({ url: endpoint, method: 'get' });
      return extractAdminListPayload(response.data).map(normalizeAdminBlog);
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404 && status !== 405) {
        break;
      }
    }
  }

  throw new Error(
    formatApiErrorDetail(
      lastError,
      'Unable to load blogs. Ensure admin_portal.website_blogs exists and the portal API exposes /blogs/admin/* routes.',
    ),
  );
}

export async function createAdminBlog(payload: Record<string, unknown>): Promise<any> {
  return websiteAdminMutate(['/blogs/admin', '/admin/blogs'], 'post', payload);
}

export async function updateAdminBlog(id: string, payload: Record<string, unknown>): Promise<any> {
  return websiteAdminMutate([`/blogs/admin/${id}`, `/admin/blogs/${id}`], 'put', payload);
}

export async function deleteAdminBlog(id: string): Promise<any> {
  return websiteAdminMutate([`/blogs/admin/${id}`, `/admin/blogs/${id}`], 'delete');
}

export async function getAdminForms(): Promise<any[]> {
  const endpoints = ['/forms/admin/all', '/admin/forms/all'];
  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await requestWithWebsiteFallback({ url: endpoint, method: 'get' });
      return extractAdminListPayload(response.data);
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404 && status !== 405) {
        break;
      }
    }
  }

  throw new Error(
    formatApiErrorDetail(
      lastError,
      'Unable to load form leads. Ensure admin_portal.website_forms exists and the portal API exposes /forms/admin/* routes.',
    ),
  );
}

export async function updateAdminFormStatus(id: string, status: string): Promise<any> {
  return websiteAdminMutate(
    [`/forms/admin/${id}/status`, `/admin/forms/${id}/status`],
    'patch',
    { status },
  );
}

export async function getAllAttendanceModes(): Promise<any[]> {
  const endpoints = [
    '/schools/all/attendance-modes',
    '/admin/schools/all/attendance-modes',
    'schools/all/attendance-modes',
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints);
    return Array.isArray(data?.schools) ? data.schools : (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

export async function updateSchoolAttendanceSettings(
  schoolDbId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const endpoints = [
    `/schools/${schoolDbId}/attendance-settings`,
    `/admin/schools/${schoolDbId}/attendance-settings`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await API.put(endpoint, payload);
      return res.data;
    } catch {
      // try next
    }
  }
  throw new Error('Failed to update attendance settings');
}

export async function getAllPlans(): Promise<any[]> {
  try {
    const res = await getWithRetry('/pricing/admin/all', {
      suppressFallback404Log: true,
      suppressNetworkErrorLog: true,
    });
    const data = res.data;
    const plans = Array.isArray(data)
      ? data
      : (data?.plans || data?.items || data?.data || []);
    return [...plans].sort(
      (a, b) =>
        Number(a?.sort_order ?? a?.sortOrder ?? 999) -
        Number(b?.sort_order ?? b?.sortOrder ?? 999),
    );
  } catch (err: any) {
    throw new Error(
      formatApiErrorDetail(err, 'Unable to load pricing plans from public.pricing_plans.'),
    );
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
