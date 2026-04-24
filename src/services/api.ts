import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/* ================= BASE URL ================= */

const getBaseUrl = (): string => {
  // Toggle this flag to route development builds to the deployed API.
  const useLiveServer = true;

  if (__DEV__ && !useLiveServer) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000'; // Android emulator
    }
    return 'http://localhost:5000'; // iOS simulator / default local
  }
  return 'https://attendex-api.vshiftx.com/api'; // Live server URL
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
});

/* ================= REQUEST INTERCEPTOR ================= */

API.interceptors.request.use(async config => {
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
  }

  const rawBranchId = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId'));
  if (rawBranchId && rawBranchId !== 'null') {
    config.headers['X-Branch-Id'] = rawBranchId;
  }

  return config;
});

/* ================= RESPONSE ================= */

API.interceptors.response.use(
  res => res,
  err => {
    console.log('API ERROR:', err?.response?.data || err.message);
    return Promise.reject(err);
  },
);

export const buildApiUrl = (path: string) => {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default API;
