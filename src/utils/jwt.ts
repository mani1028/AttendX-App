import { Buffer } from 'buffer';

export const decodeJwt = (token?: string | null): any => {
  try {
    if (!token) {return null;}
    const parts = token.split('.');
    if (parts.length < 2) {return null;}

    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }

    try {
      // Try Buffer first
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      // Pure JS fallback for React Native
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = base64.replace(/[=]+$/, '');
      let output = '';
      for (let bc = 0, bs = 0, buffer, i = 0;
        buffer = str.charAt(i++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      const decoded = decodeURIComponent(output.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(decoded);
    }
  } catch (err) {
    console.error('[JWT Decode Error]', err);
    return null;
  }
};

export const isJwtExpired = (token?: string | null): boolean => {
  try {
    if (!token) {return true;}
    const parts = token.split('.');
    if (parts.length < 2) {return true;}
    const payload = parts[1];
    // Pad base64 if needed
    const pad = payload.length % 4;
    const padded = pad ? payload + '='.repeat(4 - pad) : payload;
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(decoded);
    if (!obj || typeof obj !== 'object') {return true;}
    const exp = obj.exp;
    if (!exp) {return false;} // no exp means non-expiring token
    const now = Math.floor(Date.now() / 1000);
    return Number(exp) <= now;
  } catch (err) {
    return true;
  }
};
