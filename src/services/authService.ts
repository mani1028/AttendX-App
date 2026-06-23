import API from './api';
import { normalizeBackendRole } from '../utils/roleMapper';
import { AppRole } from '../constants/roles';

type LoginArgs = {
  username: string;
  password: string;
  fallbackRole: AppRole;
};

type LoginResult = {
  name: string;
  role: AppRole;
  token?: string;
};

const LOGIN_ENDPOINTS = ['/auth/login', '/login'];

function toStringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export async function loginWithBackend({ username, password, fallbackRole }: LoginArgs): Promise<LoginResult> {
  const payload = {
    username,
    password,
    role: fallbackRole,
  };

  for (const endpoint of LOGIN_ENDPOINTS) {
    try {
      const response = await API.post(endpoint, payload);
      const data = response.data as {
        access_token?: string;
        token?: string;
        role?: string;
        user_role?: string;
        name?: string;
        full_name?: string;
        username?: string;
      };

      const resolvedRole = normalizeBackendRole(data.role ?? data.user_role) ?? fallbackRole;
      const token = toStringOrEmpty(data.access_token ?? data.token) || undefined;
      const resolvedName =
        toStringOrEmpty(data.name) || toStringOrEmpty(data.full_name) || toStringOrEmpty(data.username) || username;

      return {
        role: resolvedRole,
        name: resolvedName,
        token,
      };
    } catch {
      // Try next configured endpoint.
    }
  }

  throw new Error('Unable to login. Check backend URL and auth route configuration.');
}
