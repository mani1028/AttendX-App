/**
 * Safely converts an API error message (which might be a string, array of strings,
 * or array of validation error objects) into a single displayable string.
 */
export const formatErrorMessage = (detail: any): string => {
  if (!detail) {return '';}

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {return item;}
        // Handle FastAPI-style validation errors: [{ msg: "...", loc: [...], type: "..." }]
        if (item && typeof item === 'object' && item.msg) {
          // If there's a location, prepend it for more context (e.g., "body -> username: field required")
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
          return field ? `${field}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .join('\n');
  }

  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  return String(detail);
};

/** Present / Absent / Half Day only — maps legacy LATE to HALF_DAY. */
export function coerceAttendanceStatus(value: unknown): string {
  const raw = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!raw) { return 'ABSENT'; }
  if (raw === 'PRESENT' || raw === 'P') { return 'PRESENT'; }
  if (raw === 'ABSENT' || raw === 'A') { return 'ABSENT'; }
  if (raw === 'HALF_DAY' || raw === 'HALFDAY' || raw === 'HALF' || raw === 'LATE' || raw === 'HD') {
    return 'HALF_DAY';
  }
  if (raw === 'LEAVE' || raw === 'ON_LEAVE' || raw === 'ONLEAVE') { return 'LEAVE'; }
  if (raw === 'HOLIDAY' || raw === 'SUNDAY_HOLIDAY' || raw === 'SUNDAY') { return 'HOLIDAY'; }
  return raw;
}

export function attendanceStatusLabel(status: string): string {
  switch (coerceAttendanceStatus(status)) {
    case 'PRESENT': return 'Present';
    case 'ABSENT': return 'Absent';
    case 'HALF_DAY': return 'Half Day';
    case 'LEAVE': return 'On Leave';
    case 'HOLIDAY': return 'Holiday';
    default: return status || 'Unknown';
  }
}

/** Strip nginx/HTML error pages and map common HTTP statuses to readable copy. */
export function formatHttpErrorMessage(error: any, fallback = 'Something went wrong. Please try again.'): string {
  const status = error?.response?.status;
  if (status === 413) {
    return 'The file is too large to upload. Please use a smaller photo (under 1 MB).';
  }

  const raw =
    error?.response?.data?.detail
    ?? error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? (typeof error?.response?.data === 'string' ? error.response.data : null);

  let text = formatErrorMessage(raw);
  if (text.includes('<html') || text.includes('<center>') || text.includes('<title>')) {
    if (status === 413 || text.includes('413')) {
      return 'The photo is too large for the server. Please use a smaller image or upload from gallery.';
    }
    if (status === 502 || status === 503 || status === 504) {
      return 'Server is temporarily unavailable. Please try again in a moment.';
    }
    return `Request failed${status ? ` (${status})` : ''}. Please try again.`;
  }

  if (error?.code === 'IMAGE_TOO_LARGE') {
    return 'Photo is too large. Move closer, retake, or upload from gallery.';
  }

  return text || fallback;
}

const PLACEHOLDER_ROLL_VALUES = new Set(['-', '—', '–', 'n/a', 'na', 'null', 'undefined', 'none']);

/** Returns true when a value looks like a real roll number (not a UI placeholder). */
export function isValidRollNumber(value: unknown): boolean {
  const text = String(value ?? '').trim();
  if (!text) {
    return false;
  }
  return !PLACEHOLDER_ROLL_VALUES.has(text.toLowerCase());
}

/** Picks the first usable roll number from multiple candidate fields. */
export function resolveStudentRollNumber(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (isValidRollNumber(text)) {
      return text;
    }
  }
  return '';
}

/** User-friendly message from axios / fetch errors. */
export function resolveApiErrorMessage(error: any, fallback: string): string {
  if (!error) { return fallback; }

  const message = String(error?.message || '');
  if (message.includes('Network Error') || message.includes('timeout')) {
    return 'Could not connect to the server. Check your internet and try again.';
  }

  const status = error?.response?.status;
  if (status === 401) { return 'Your session expired. Please log in again.'; }
  if (status === 403) { return 'You do not have permission to view this content.'; }
  if (status === 404) { return 'This feature is not available on the server yet.'; }

  const detail = formatErrorMessage(
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.response?.data?.error,
  );
  if (detail) { return detail; }

  return fallback;
}
