import { useState, useCallback } from 'react';
import API from '../services/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    endpoint: string,
    data?: any
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let response: any;
      switch (method) {
        case 'get':
          response = await API.get(endpoint);
          break;
        case 'post':
          response = await API.post(endpoint, data);
          break;
        case 'put':
          response = await API.put(endpoint, data);
          break;
        case 'delete':
          response = await API.delete(endpoint);
          break;
        case 'patch':
          response = await API.patch(endpoint, data);
          break;
      }

      const responseData = response?.data as T;
      setState({ data: responseData, loading: false, error: null });
      return responseData;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const get = useCallback((endpoint: string) => request('get', endpoint), [request]);
  const post = useCallback((endpoint: string, data?: any) => request('post', endpoint, data), [request]);
  const put = useCallback((endpoint: string, data?: any) => request('put', endpoint, data), [request]);
  const del = useCallback((endpoint: string) => request('delete', endpoint), [request]);
  const patch = useCallback((endpoint: string, data?: any) => request('patch', endpoint, data), [request]);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
    patch,
  };
}
