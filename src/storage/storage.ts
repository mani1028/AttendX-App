import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { StorageKeys } from './StorageKeys';

export const storage = {
  // Keychain for sensitive data
  async setSecure(key: string, value: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(key, value, { service: key });
    } catch (error) {
      console.error(`Secure storage set error for ${key}:`, error);
    }
  },

  async getSecure(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error(`Secure storage get error for ${key}:`, error);
      return null;
    }
  },

  async removeSecure(key: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: key });
    } catch (error) {
      console.error(`Secure storage remove error for ${key}:`, error);
    }
  },

  // AsyncStorage for non-sensitive data
  async set(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`AsyncStorage set error for ${key}:`, error);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`AsyncStorage get error for ${key}:`, error);
      return null;
    }
  },

  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`AsyncStorage getString error for ${key}:`, error);
      return null;
    }
  },

  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`AsyncStorage setString error for ${key}:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`AsyncStorage remove error for ${key}:`, error);
    }
  },

  // Specific helpers
  async getSession(): Promise<{ token: string | null; role: string | null }> {
    const token = await this.getSecure(StorageKeys.AUTH_TOKEN);
    const role = await this.getString(StorageKeys.USER_ROLE);
    return { token, role };
  },

  async clearSession(): Promise<void> {
    await this.removeSecure(StorageKeys.AUTH_TOKEN);
    await this.remove(StorageKeys.USER_ROLE);
    await this.remove(StorageKeys.USER_EMAIL);
    await this.remove(StorageKeys.USER_NAME);
    await this.remove(StorageKeys.EMPLOYEE_ID);
    await this.remove(StorageKeys.IS_CLASS_TEACHER);
    await this.remove(StorageKeys.CLASS_TEACHER_INFO);
  },
};
