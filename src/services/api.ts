import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventEmitter from '../utils/eventEmitter';
import { ENV } from '../config/api.config';
import { isOnline, initializeNetworkListener } from '../hooks/useNetworkState';
import { requestQueueManager } from './requestQueueManager';
import { decodeJwt } from '../utils/jwt';

/* ================= BASE URL ================= */

const computeBaseUrl = (raw?: string): string => {
  const rawUrl = String((raw ?? ENV.API_URL) || '').trim();
  const cleaned = rawUrl.replace(/\/$/, '');
  const protocolSeparator = '://';
  let normalized = cleaned;

  if (cleaned.includes(protocolSeparator)) {
    const [protocol, rest] = cleaned.split(protocolSeparator);
    normalized = `${protocol}${protocolSeparator}${rest.replace(/\/+/g, '/')}`;
  } else {
    normalized = cleaned.replace(/\/+/g, '/');
  }

  const stripped = normalized.replace(/\/api$/i, '');
  return `${stripped}/api/`;
};

const API_BASE = computeBaseUrl();
let RUNTIME_API_BASE = API_BASE;

let authToken: string | null = null;

// Log the API base URL on startup
if (__DEV__) {
  console.log(`[API Config] Base URL: ${API_BASE}`);
}

export function setAuthToken(token?: string | null) {
  authToken = token ?? null;
}

/* ================= AXIOS INSTANCE ================= */

const API = axios.create({
  baseURL: API_BASE,
  // Increase timeout to account for tunnel latency during development
  timeout: 60000,
  // Token auth is used; avoid cookie/credential mode to prevent platform-specific request issues.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    // Bypass Dev Tunnel anti-phishing landing page which can return HTML instead of JSON
    'X-Tunnel-Skip-Anti-Phishing-Page': 'true',
  },
});

const normalizeStorageKey = async (keys: string[]) => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value && value !== 'null') {
      return value;
    }
  }
  return null;
};

const normalizeUrl = (configUrl?: string) => {
  if (!configUrl) return configUrl;
  let normalized = configUrl.replace(/\/+/g, '/');
  if (normalized.toLowerCase().startsWith('/api/')) {
    normalized = normalized.replace(/^\/api\//i, '/');
  }
  return normalized;
};

/* ================= REQUEST INTERCEPTOR ================= */

API.interceptors.request.use(async config => {
  // Allow per-installation override of the API base via AsyncStorage keys
  try {
    const override = await normalizeStorageKey(['api_url', 'API_URL', 'API_BASE_URL']);
    if (override && String(override).trim()) {
      const computed = computeBaseUrl(String(override).trim());
      config.baseURL = computed;
      RUNTIME_API_BASE = computed;
    } else {
      // ensure axios uses the current runtime base
      config.baseURL = RUNTIME_API_BASE;
    }
  } catch (e) {
    config.baseURL = RUNTIME_API_BASE;
  }

  // Clean up URL to avoid double slashes if baseURL already ends with a slash
  if (config.baseURL?.endsWith('/') && config.url?.startsWith('/')) {
    config.url = config.url.substring(1);
  }

  const token = authToken || (await normalizeStorageKey(['token', 'auth_token', 'authToken']));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (!authToken) {
      authToken = token; // Cache in memory for performance
    }
  }

  const rawSchoolCode = await normalizeStorageKey([
    'school_code',
    'schoolCode',
    'school_id',
    'schoolId',
  ]);
  let finalSchoolCode = rawSchoolCode;

  if (token && !finalSchoolCode) {
    const decoded = decodeJwt(token);
    if (decoded?.school_code) finalSchoolCode = String(decoded.school_code);
    else if (decoded?.schoolId) finalSchoolCode = String(decoded.schoolId);
  }

  if (finalSchoolCode || true) {
    const sc = (finalSchoolCode || 'default').trim();
    config.headers['X-School-Code'] = sc;
    
    // Ensure school_code is in params for routes that require it (Accountant, Student Dashboard, etc.)
    const lowerUrl = config.url?.toLowerCase() || '';
    if (
      lowerUrl.includes('accountant') || 
      lowerUrl.includes('student-dashboard') || 
      lowerUrl.includes('student/') ||
      lowerUrl.includes('profile-photo')
    ) {
      if (!config.params) config.params = {};
      if (!config.params.school_code) config.params.school_code = sc;
      if (!config.params.school_id) config.params.school_id = sc;
    }
  }

  const rawStudentId = await normalizeStorageKey(['student_id', 'studentId']);
  let finalStudentId = rawStudentId;
  
  if (token && !finalStudentId) {
    const decoded = decodeJwt(token);
    if (decoded?.roll_no) finalStudentId = String(decoded.roll_no);
    else if (decoded?.sub) finalStudentId = String(decoded.sub);
  }

  if (finalStudentId) {
    const sid = finalStudentId.trim();
    const sidUpper = sid.toUpperCase();
    
    config.headers['X-Student-Id'] = sidUpper;
    config.headers['X-Roll-No'] = sidUpper;
    
    // Also ensure roll_no is in params for dashboard routes if missing, and always uppercase
    const lowerUrl = config.url?.toLowerCase() || '';
    if (lowerUrl.includes('student-dashboard') || lowerUrl.includes('student/')) {
      if (!config.params) config.params = {};
      
      if (config.params.roll_no) {
        config.params.roll_no = String(config.params.roll_no).toUpperCase();
      } else {
        config.params.roll_no = sidUpper;
      }
      
      if (config.params.student_id) {
        config.params.student_id = String(config.params.student_id).toUpperCase();
      } else {
        config.params.student_id = sidUpper;
      }
    }
  }

  const rawBranchId = await normalizeStorageKey(['branch_id', 'branchId']);
  let finalBranchId = rawBranchId;

  if (token && !finalBranchId) {
    const decoded = decodeJwt(token);
    if (decoded?.branch_id) finalBranchId = String(decoded.branch_id);
    else if (decoded?.branchId) finalBranchId = String(decoded.branchId);
  }

  config.headers['X-Branch-Id'] = (finalBranchId || 'default').trim();
  
  // Add Academic Year header if available, or try to guess/default
  const academicYear = await normalizeStorageKey(['academic_year', 'academicYear', 'active_year']);
  if (academicYear) {
    config.headers['X-Academic-Year'] = academicYear;
  }

  config.url = normalizeUrl(config.url);

  if ((config as any).suppressFallback404Log) {
    if (!config.headers) config.headers = {} as any;
    config.headers['X-Suppress-Fallback-404-Log'] = 'true';
  }

  // Log request for debugging
  if (__DEV__) {
    const hasAuth = !!config.headers.Authorization;
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} | auth=${hasAuth}`);
  }

  return config;
});

/* ================= RESPONSE INTERCEPTOR ================= */

API.interceptors.response.use(
  res => {
    if (__DEV__) {
      console.log(`[API Response] ${res.status} ${res.config.url}`);
    }
    // Detect HTML responses (e.g., Dev Tunnel landing page) to aid debugging
    const contentType = (res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || '';
    if (typeof contentType === 'string' && contentType.toLowerCase().includes('text/html')) {
      console.warn('[API] Received HTML response from server; this may indicate a tunnel landing page or proxy. URL:', res.config.url);
      // Attach a flag for callers that want to handle this specially
      (res as any).__receivedHtmlResponse = true;
    }
    
    // ENHANCED LOGGING for notifications endpoints
    if (res.config.url?.includes('/notifications/')) {
      console.log(`[NOTIFICATION API] ${res.config.method?.toUpperCase()} ${res.config.baseURL}${res.config.url}`);
      console.log(`[NOTIFICATION Response] Status: ${res.status}, Items: ${res.data?.items?.length || 0}`);
      if (res.data?.items?.length > 0) {
        console.log(`[NOTIFICATION Data Sample] First notification:`, {
          id: res.data.items[0].id,
          title: res.data.items[0].title,
          created_at: res.data.items[0].created_at,
          type: res.data.items[0].type,
        });
      }
    }
    
    // Cache successful GET responses
    if (res.config.method === 'get' && res.status === 200) {
      requestQueueManager.setCacheResponse(
        res.config.method,
        res.config.url || '',
        res.data,
        (res.config as any)?.cacheTTL || 5 * 60 * 1000 // Default 5 min cache
      );
    }
    
    return res;
  },
  err => {
    // Hermes / React Native AxiosError fix for "Error.stack getter called with an invalid receiver"
    // Instead of mutating the Axios error, we rebuild it as a pure Error object.
    let safeError = err;
    if (err && typeof err === 'object' && err.isAxiosError) {
      safeError = new Error(err.message);
      safeError.name = err.name || 'AxiosError';
      safeError.isAxiosError = true;
      safeError.response = err.response;
      safeError.request = err.request;
      safeError.config = err.config;
      safeError.status = err.status;
      safeError.code = err.code;
    }

    const suppressFallback404Log = Boolean((safeError.config as any)?.suppressFallback404Log) ||
      safeError.config?.headers?.['X-Suppress-Fallback-404-Log'] === 'true' ||
      safeError.config?.headers?.['x-suppress-fallback-404-log'] === 'true';
    if (suppressFallback404Log && (safeError.response?.status === 404 || safeError.response?.status === 405)) {
      return Promise.reject(safeError);
    }

    if (safeError.response) {
      // Handle 401 Unauthorized globally
      if (safeError.response.status === 401) {
        // Allow callers to suppress global logout on specific requests
        const suppress = Boolean((safeError.config as any)?.suppressLogoutOn401) || Boolean(safeError.config?.suppressLogoutOn401);
        // Skip global logout for login requests to allow LoginScreen to handle errors
        const isLoginRequest = safeError.config?.url?.includes('/login') || safeError.config?.url?.includes('/auth/login');
        if (!isLoginRequest && !suppress) {
          const detail = safeError.response?.data?.detail || safeError.response?.data?.message || '(no detail)';
          const hadAuth = !!(safeError.config?.headers?.Authorization);
          console.warn(`[API] 401 Unauthorized | url=${safeError.config?.url} | hadToken=${hadAuth} | detail=${JSON.stringify(detail)}`);
          eventEmitter.emit('app-logout');
        } else {
          if (isLoginRequest) console.log('[API] 401 Unauthorized on login request. Skipping global logout.');
          if (suppress) console.log('[API] 401 Unauthorized suppressed by request config (suppressLogoutOn401).');
        }
      }

      const suppressFallback404Log = (safeError.config as any)?.suppressFallback404Log;
      // Suppress 405/404 errors during fallback attempts (they are expected)
      if ((safeError.response.status === 405 || safeError.response.status === 404) && suppressFallback404Log) {
        return Promise.reject(safeError);
      }

      // The server responded with a status code outside the 2xx range
      console.error('[API Error Response]:', {
        status: safeError.response.status,
        data: safeError.response.data,
        url: safeError.config?.url,
      });
    } else if (safeError.request) {
      // The request was made but no response was received
      // Queue non-GET requests for retry when offline
      if (safeError.config?.method !== 'get' && !isOnline()) {
        requestQueueManager.addToQueue(
          safeError.config?.method?.toUpperCase() || 'POST',
          safeError.config?.url || '',
          safeError.config?.data,
          safeError.config?.params
        ).catch(e => console.error('Failed to queue offline request:', e));
        
        console.log('[Offline] Request queued for retry:', safeError.config?.url);
      }
      
      const suppressNetworkErrorLog = (safeError.config as any)?.suppressNetworkErrorLog;
      if (!suppressNetworkErrorLog) {
        console.error('[API No Response]:', {
          url: safeError.config?.url,
          method: safeError.config?.method,
          code: safeError.code,
          message: safeError.message,
          timeout: safeError.config?.timeout,
          isOnline: isOnline(),
        });
      }
    } else {
      // Something happened in setting up the request
      console.error('[API Setup Error]:', safeError.message);
    }
    return Promise.reject(safeError);
  },
);

/* ================= INITIALIZE NETWORK LISTENER ================= */
initializeNetworkListener();

export const buildApiUrl = (path: string) => {
  const base = (RUNTIME_API_BASE || API_BASE).endsWith('/') ? (RUNTIME_API_BASE || API_BASE).slice(0, -1) : (RUNTIME_API_BASE || API_BASE);
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base.toLowerCase().endsWith('/api') && cleanPath.toLowerCase().startsWith('/api/')) {
    cleanPath = cleanPath.replace(/^\/api/i, '');
  }
  return `${base}${cleanPath}`;
};

export default API;
