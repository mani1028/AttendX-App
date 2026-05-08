import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventEmitter from '../utils/eventEmitter';
import { ENV } from '../config/api.config';
import { isOnline, initializeNetworkListener } from '../hooks/useNetworkState';
import { requestQueueManager } from './requestQueueManager';

/* ================= BASE URL ================= */

const getBaseUrl = (): string => {
  const rawUrl = String(ENV.API_URL || '').trim();
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

const API_BASE = getBaseUrl();

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
  timeout: 30000,
  // Token auth is used; avoid cookie/credential mode to prevent platform-specific request issues.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
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
  // Clean up URL to avoid double slashes if baseURL already ends with a slash
  if (config.baseURL?.endsWith('/') && config.url?.startsWith('/')) {
    config.url = config.url.substring(1);
  }

  // Log request for debugging
  if (__DEV__) {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
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
  if (rawSchoolCode) {
    config.headers['X-School-Code'] = rawSchoolCode;
    
    // CRITICAL: Add school_code as query parameter for all accountant routes
    // The backend requires school_code as a query param for multi-tenancy
    if (config.url?.toLowerCase().includes('accountant')) {
      if (!config.params) {
        config.params = {};
      }
      // Only set if not already explicitly provided
      if (!config.params.school_code) {
        config.params.school_code = rawSchoolCode;
      }
    }
  }

  const rawStudentId = await normalizeStorageKey(['student_id', 'studentId']);
  if (rawStudentId) {
    config.headers['X-Student-Id'] = rawStudentId;
  }

  const rawBranchId = await normalizeStorageKey(['branch_id', 'branchId']);
  if (rawBranchId) {
    config.headers['X-Branch-Id'] = rawBranchId;
  }

  config.url = normalizeUrl(config.url);
  return config;
});

/* ================= RESPONSE INTERCEPTOR ================= */

API.interceptors.response.use(
  res => {
    if (__DEV__) {
      console.log(`[API Response] ${res.status} ${res.config.url}`);
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
    const suppressFallback404Log = Boolean((err.config as any)?.suppressFallback404Log);
    if (suppressFallback404Log && (err.response?.status === 404 || err.response?.status === 405)) {
      return Promise.reject(err);
    }

    if (err.response) {
      // Handle 401 Unauthorized globally
      if (err.response.status === 401) {
        // Allow callers to suppress global logout on specific requests
        const suppress = Boolean((err.config as any)?.suppressLogoutOn401) || Boolean(err.config?.suppressLogoutOn401);
        // Skip global logout for login requests to allow LoginScreen to handle errors
        const isLoginRequest = err.config?.url?.includes('/login') || err.config?.url?.includes('/auth/login');
        if (!isLoginRequest && !suppress) {
          console.warn('[API] 401 Unauthorized detected. Emitting logout.');
          eventEmitter.emit('app-logout');
        } else {
          if (isLoginRequest) console.log('[API] 401 Unauthorized on login request. Skipping global logout.');
          if (suppress) console.log('[API] 401 Unauthorized suppressed by request config (suppressLogoutOn401).');
        }
      }

      // Suppress 405 errors during fallback attempts (they are expected)
      if ((err.response.status === 405 || err.response.status === 404) && suppressFallback404Log) {
        return Promise.reject(err);
      }

      // The server responded with a status code outside the 2xx range
      console.error('[API Error Response]:', {
        status: err.response.status,
        data: err.response.data,
        url: err.config?.url,
      });
    } else if (err.request) {
      // The request was made but no response was received
      // Queue non-GET requests for retry when offline
      if (err.config?.method !== 'get' && !isOnline()) {
        requestQueueManager.addToQueue(
          err.config?.method?.toUpperCase() || 'POST',
          err.config?.url || '',
          err.config?.data,
          err.config?.params
        ).catch(e => console.error('Failed to queue offline request:', e));
        
        console.log('[Offline] Request queued for retry:', err.config?.url);
      }
      
      console.error('[API No Response]:', {
        url: err.config?.url,
        method: err.config?.method,
        code: err.code,
        message: err.message,
        timeout: err.config?.timeout,
        isOnline: isOnline(),
      });
    } else {
      // Something happened in setting up the request
      console.error('[API Setup Error]:', err.message);
    }
    return Promise.reject(err);
  },
);

/* ================= INITIALIZE NETWORK LISTENER ================= */
initializeNetworkListener();

export const buildApiUrl = (path: string) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base.toLowerCase().endsWith('/api') && cleanPath.toLowerCase().startsWith('/api/')) {
    cleanPath = cleanPath.replace(/^\/api/i, '');
  }
  return `${base}${cleanPath}`;
};

export default API;
