import { ENV } from '../../../config/api.config';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

const API_BASE_URL = ENV.API_URL.replace(/\/$/, '');

export const salariesApi = {
  get: async (endpoint: string, config?: { params?: Record<string, string> }) => {
    const token = await storage.getSecure(StorageKeys.AUTH_TOKEN);
    let url = `${API_BASE_URL}${endpoint}`;
    if (config?.params) {
      url += `?${new URLSearchParams(config.params).toString()}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },
  put: async (endpoint: string, data: any, config?: { params?: Record<string, string> }) => {
    const token = await storage.getSecure(StorageKeys.AUTH_TOKEN);
    let url = `${API_BASE_URL}${endpoint}`;
    if (config?.params) {
      url += `?${new URLSearchParams(config.params).toString()}`;
    }
    const response = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  },
};
