import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.select({
  android: 'https://attendex-api.vshiftx.com/api',
  ios: 'https://attendex-api.vshiftx.com/api',
  default: 'https://attendex-api.vshiftx.com/api',
});

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export function setAuthToken(token?: string | null) {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete API.defaults.headers.common.Authorization;
}

export default API;