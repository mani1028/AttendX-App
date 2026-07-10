import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export async function getPromoHeaders() {
  const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const branchId = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
  return {
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  };
}

export function formatPromotionDate(value?: string): string {
  if (!value) { return '—'; }
  const trimmed = String(value).trim().slice(0, 10);
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) { return trimmed; }
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPromotionDateTime(value?: string): string {
  if (!value) { return '—'; }
  const trimmed = String(value).trim();
  const iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(iso);
  const parsed = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(parsed.getTime())) { return trimmed; }
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function canRollbackPromotionBatch(status: unknown): boolean {
  const normalized = String(status || '').trim().toUpperCase();
  if (!normalized || normalized.includes('ROLLBACK')) { return false; }
  return ['COMPLETED', 'COMPLETE', 'SUCCESS', 'PARTIAL', 'PARTIAL_SUCCESS', 'PROCESSED', 'DONE'].includes(normalized);
}
