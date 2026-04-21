import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ================= BASE URL ================= */

const API_BASE = 'https://attendex-api.vshiftx.com/api';

let authToken: string | null = null;

export function setAuthToken(token?: string | null) {
  authToken = token ?? null;
}

/* ================= AXIOS INSTANCE ================= */

const API = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

/* ================= REQUEST INTERCEPTOR ================= */

API.interceptors.request.use(async config => {
  config.headers = config.headers || {};

  const token = authToken ?? (await AsyncStorage.getItem('token'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const schoolCode =
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode'));

  if (schoolCode) {
    config.headers['X-School-Code'] = schoolCode;
  }

  const branchId =
    (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId'));

  if (branchId) {
    config.headers['X-Branch-Id'] = branchId;
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

export default API;