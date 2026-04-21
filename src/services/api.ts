import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your base URL is perfectly fine for production
const API_BASE_URL = 'https://attendex-api.vshiftx.com/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically injects Auth and Tenant headers before the request leaves the app.
 */
API.interceptors.request.use(
  async (config) => {
    try {
      // Fetch stored session data
      const token = await AsyncStorage.getItem('userToken');
      const schoolCode = await AsyncStorage.getItem('schoolCode');
      const branchId = await AsyncStorage.getItem('branchId');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // CRITICAL: Your backend needs these for schema isolation
      if (schoolCode) {
        config.headers['X-School-Code'] = schoolCode;
      }
      
      if (branchId) {
        config.headers['X-Branch-Id'] = branchId;
      }

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

export default API;