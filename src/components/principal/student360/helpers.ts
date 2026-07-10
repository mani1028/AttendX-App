export function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '—';
}
