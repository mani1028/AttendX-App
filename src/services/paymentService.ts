import API, { getWithRetry } from './api';
import { getAllSchools } from './adminService';

export interface AutoPaySchool {
  id: string;
  schoolName: string;
  planName: string;
  paymentMethod: 'card' | 'bank';
  lastPaymentDate: string;
  nextPaymentDate: string;
  nextPaymentAmount: string;
  status: 'active' | 'pending' | 'failed';
}

function isTruthyAutoRenew(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function formatShortDate(value?: string | null): string {
  if (!value) { return '—'; }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return String(value).slice(0, 10); }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function normalizeAutoPaySchool(raw: Record<string, any>): AutoPaySchool {
  const statusRaw = String(raw.subscription_status || raw.status || 'active').toLowerCase();
  let status: AutoPaySchool['status'] = 'active';
  if (statusRaw.includes('fail') || statusRaw.includes('cancel')) {
    status = 'failed';
  } else if (statusRaw.includes('pending') || statusRaw.includes('due') || statusRaw.includes('created')) {
    status = 'pending';
  }

  const subscription = raw.subscription && typeof raw.subscription === 'object' ? raw.subscription : {};
  const nextDate =
    raw.next_payment_date ||
    raw.subscription_end_at ||
    subscription.subscription_end_at ||
    raw.renewal_date;
  const lastDate =
    raw.last_payment_at ||
    raw.last_payment_date ||
    subscription.last_payment_at;
  const amount =
    raw.next_payment_amount ??
    raw.renewal_cost ??
    raw.last_payment_amount ??
    subscription.last_payment_amount ??
    subscription.renewal_cost;

  const method = String(raw.payment_method || raw.billing_method || 'card').toLowerCase();

  return {
    id: String(raw.id ?? raw.school_id ?? raw.school_code ?? ''),
    schoolName: raw.name ?? raw.school_name ?? raw.school_id ?? 'Unknown School',
    planName: raw.current_plan_name ?? raw.plan_name ?? raw.subscription_plan ?? subscription.current_plan_name ?? '—',
    paymentMethod: method.includes('bank') ? 'bank' : 'card',
    lastPaymentDate: formatShortDate(lastDate),
    nextPaymentDate: formatShortDate(nextDate),
    nextPaymentAmount: amount != null && amount !== '' ? `₹${Number(amount).toLocaleString('en-IN')}` : '—',
    status,
  };
}

export async function getAutoPaySchools(): Promise<AutoPaySchool[]> {
  const dedicatedEndpoints = [
    '/admin/autopay/schools',
    '/payment/auto-pay/schools',
  ];

  for (const endpoint of dedicatedEndpoints) {
    try {
      const res = await getWithRetry(endpoint, { suppressFallback404Log: true, suppressNetworkErrorLog: true });
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.items || res.data?.schools || [];
      if (Array.isArray(list)) {
        return list
          .filter(item => isTruthyAutoRenew(item?.auto_renew ?? item?.autoRenew))
          .map(item => normalizeAutoPaySchool(item));
      }
    } catch {
      // try next endpoint
    }
  }

  const allSchools = await getAllSchools();
  return allSchools
    .filter(school => {
      const subscription = school.subscription && typeof school.subscription === 'object' ? school.subscription : {};
      return isTruthyAutoRenew(
        school.auto_renew ??
        school.autoRenew ??
        subscription.auto_renew ??
        subscription.autoRenew,
      );
    })
    .map(school => normalizeAutoPaySchool(school));
}

export async function getPublicPaymentSettings(): Promise<Record<string, unknown>> {
  try {
    const res = await API.get('pricing/public/settings', { suppressFallback404Log: true } as any);
    return res.data || {};
  } catch {
    return {};
  }
}

export function isAutoPayGloballyEnabled(settings: Record<string, unknown>): boolean {
  const value = settings.enable_auto_pay;
  return value === true || value === 'true' || value === 1 || value === '1';
}

export async function getSubscriptionStatus(schoolId: string): Promise<Record<string, unknown>> {
  const res = await API.post('payment/subscription-status', { school_id: schoolId });
  return res.data || {};
}

export async function cancelAutoRenewal(schoolId: string): Promise<Record<string, unknown>> {
  const res = await API.post('payment/subscription/cancel', { school_id: schoolId });
  return res.data || {};
}

function directorReceiptHeaders(schoolCode: string) {
  return schoolCode ? { 'X-School-Code': schoolCode } : {};
}

export async function fetchDirectorReceiptHtml(
  paymentId: string | number,
  schoolCode: string,
): Promise<string> {
  const encodedPaymentId = encodeURIComponent(String(paymentId));
  const response = await API.get<string>(`director/payments/receipt/${encodedPaymentId}`, {
    headers: directorReceiptHeaders(schoolCode),
    params: { school_code: schoolCode },
    responseType: 'text',
  });
  return typeof response.data === 'string' ? response.data : String(response.data ?? '');
}

export async function downloadDirectorReceiptPdf(
  paymentId: string | number,
  schoolCode: string,
): Promise<ArrayBuffer> {
  const encodedPaymentId = encodeURIComponent(String(paymentId));
  const response = await API.get<ArrayBuffer>(`director/payments/receipt/${encodedPaymentId}`, {
    headers: directorReceiptHeaders(schoolCode),
    params: { school_code: schoolCode, download: true },
    responseType: 'arraybuffer',
  });
  return response.data;
}
