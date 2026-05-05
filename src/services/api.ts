import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventEmitter from '../utils/eventEmitter';
import { ENV } from '../config/api.config';
import { isOnline, initializeNetworkListener } from '../hooks/useNetworkState';
import { requestQueueManager } from './requestQueueManager';

/* ================= BASE URL ================= */

const getBaseUrl = (): string => {
  const baseUrl = ENV.API_URL.replace(/\/$/, '');
  // If the provided ENV.API_URL already contains an /api segment at the end,
  // avoid appending another /api to prevent double /api/api paths.
  if (baseUrl.toLowerCase().endsWith('/api')) {
    return `${baseUrl}/`;
  }
  return `${baseUrl}/api/`;
};

const API_BASE = getBaseUrl();

let authToken: string | null = null;

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

  const token = authToken || (await AsyncStorage.getItem('token'));
  if (token && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
    if (!authToken) {
      authToken = token; // Cache in memory for performance
    }
  }

  const rawSchoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode'));
  if (rawSchoolCode && rawSchoolCode !== 'null') {
    config.headers['X-School-Code'] = rawSchoolCode;
    // Automatically inject school_code into query params if not already present
    // Avoid double injection for multipart/form-data where it's usually in the body
    const isMultipart = config.headers?.['Content-Type'] === 'multipart/form-data';
    if (!isMultipart) {
      config.params = { school_code: rawSchoolCode, ...config.params };
    }
  }

  const rawStudentId = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId'));
  if (rawStudentId && rawStudentId !== 'null') {
    config.headers['X-Student-Id'] = rawStudentId;
    // Automatically inject student_id into query params if not already present
    config.params = { student_id: rawStudentId, ...config.params };
  }

  const rawBranchId = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId'));
  if (rawBranchId && rawBranchId !== 'null') {
    config.headers['X-Branch-Id'] = rawBranchId;
  }

  return config;
});

/* ================= RESPONSE INTERCEPTOR ================= */

API.interceptors.response.use(
  res => {
    if (__DEV__) {
      console.log(`[API Response] ${res.status} ${res.config.url}`);
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
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default API;
