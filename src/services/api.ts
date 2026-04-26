import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import eventEmitter from '../utils/eventEmitter';

/* ================= BASE URL ================= */

const getBaseUrl = (): string => {
  // Toggle this flag to route development builds to the deployed API.
  const useLiveServer = true;

  if (__DEV__ && !useLiveServer) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api/'; // Android emulator
    }
    return 'http://localhost:5000/api/'; // iOS simulator / default local
  }
  return 'https://attendex-api.vshiftx.com/api/'; // Live server URL
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
    config.params = { school_code: rawSchoolCode, ...config.params };
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
    return res;
  },
  err => {
    const suppressFallback404Log = Boolean((err.config as any)?.suppressFallback404Log);
    if (suppressFallback404Log && err.response?.status === 404) {
      return Promise.reject(err);
    }

    if (err.response) {
      // Handle 401 Unauthorized globally
      if (err.response.status === 401) {
        console.warn('[API] 401 Unauthorized detected. Emitting logout.');
        eventEmitter.emit('app-logout');
      }

      // The server responded with a status code outside the 2xx range
      console.error('[API Error Response]:', {
        status: err.response.status,
        data: err.response.data,
        url: err.config?.url,
      });
    } else if (err.request) {
      // The request was made but no response was received
      console.error('[API No Response]:', {
        url: err.config?.url,
        method: err.config?.method,
        code: err.code,
        message: err.message,
        timeout: err.config?.timeout,
        responseSnippet: err.request?._response,
        readyState: err.request?.readyState,
        status: err.request?.status,
        withCredentials: err.request?.withCredentials,
      });
    } else {
      // Something happened in setting up the request
      console.error('[API Setup Error]:', err.message);
    }
    return Promise.reject(err);
  },
);

export const buildApiUrl = (path: string) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default API;
