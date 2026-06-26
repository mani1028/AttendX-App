import { buildApiUrl } from '../services/api';

/**
 * Normalizes a photo URL from the API into a full URI that React Native's
 * <Image> component can resolve.
 *
 * Handles:
 *   - Absolute URLs (http://, https://, data:, file://, content://) → returned as-is
 *   - Relative paths (/media/photos/abc.jpg) → resolved via buildApiUrl
 *   - API-prefixed paths (api/media/photos/abc.jpg) → resolved via buildApiUrl
 *   - Base64 strings (long alphanumeric with +/=) → wrapped as data:image/jpeg;base64,…
 *   - Empty / falsy → null
 */
export function normalizePhotoUri(value: unknown): string | null {
  const uri = String(value || '').trim();
  if (!uri) return null;

  if (
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://')
  ) {
    return uri;
  }

  if (uri.startsWith('/')) {
    return buildApiUrl(uri);
  }

  if (uri.toLowerCase().startsWith('api/')) {
    return buildApiUrl(`/${uri}`);
  }

  const compact = uri.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return buildApiUrl(`/${uri}`);
}
