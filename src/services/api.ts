import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/* ================= BASE URL ================= */

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000'; // Android emulator
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:5000'; // iOS simulator
    }
    return 'http://localhost:5000'; // default
  }
  return 'https://attendex-api.vshiftx.com/api'; // Production URL
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
