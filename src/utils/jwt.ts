import { Buffer } from 'buffer';

export const isJwtExpired = (token?: string | null): boolean => {
  try {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = parts[1];
    // Pad base64 if needed
    const pad = payload.length % 4;
    const padded = pad ? payload + '='.repeat(4 - pad) : payload;
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(decoded);
    if (!obj || typeof obj !== 'object') return true;
    const exp = obj.exp;
    if (!exp) return false; // no exp means non-expiring token
    const now = Math.floor(Date.now() / 1000);
    return Number(exp) <= now;
  } catch (err) {
    return true;
  }
};