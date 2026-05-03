/**
 * Safely converts an API error message (which might be a string, array of strings,
 * or array of validation error objects) into a single displayable string.
 */
export const formatErrorMessage = (detail: any): string => {
  if (!detail) return '';

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
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
