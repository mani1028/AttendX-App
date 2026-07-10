import { Buffer } from 'buffer';
import { Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export function getDateRangeForAttendance(
  period: string,
  anchorDate: string,
  startDate: string,
  endDate: string,
) {
  switch (period) {
    case 'weekly': {
      const weekStart = new Date(anchorDate);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start_date: weekStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case 'monthly': {
      const monthStart = new Date(anchorDate);
      monthStart.setDate(1);
      return { start_date: monthStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case '3months': {
      const threeMonthsStart = new Date(anchorDate);
      threeMonthsStart.setMonth(threeMonthsStart.getMonth() - 3);
      return { start_date: threeMonthsStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case '6months': {
      const sixMonthsStart = new Date(anchorDate);
      sixMonthsStart.setMonth(sixMonthsStart.getMonth() - 6);
      return { start_date: sixMonthsStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case 'year': {
      const yearStart = new Date(anchorDate);
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      return { start_date: yearStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case 'custom':
      return { start_date: startDate, end_date: endDate };
    default:
      return { start_date: anchorDate, end_date: anchorDate };
  }
}

export function getDateRangeForCombined(
  period: string,
  anchorDate: string,
  startDate: string,
  endDate: string,
) {
  switch (period) {
    case 'weekly': {
      const weekStart = new Date(anchorDate);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start_date: weekStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case 'monthly': {
      const monthStart = new Date(anchorDate);
      monthStart.setDate(1);
      return { start_date: monthStart.toISOString().slice(0, 10), end_date: anchorDate };
    }
    case 'custom':
      return { start_date: startDate, end_date: endDate };
    default:
      return { start_date: anchorDate, end_date: anchorDate };
  }
}

export async function downloadAndShareFile(data: ArrayBuffer, filename: string) {
  try {
    const base64Data = Buffer.from(data).toString('base64');
    const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(filePath, base64Data, 'base64');
    const fileUri = Platform.OS === 'android' ? `file://${filePath}` : filePath;
    await Share.open({
      url: fileUri,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename,
      failOnCancel: false,
    });
    setTimeout(() => RNFS.unlink(filePath).catch(() => {}), 5000);
  } catch (error: any) {
    if (error?.message !== 'User did not share') {
      console.error('Error saving/sharing file:', error);
      Alert.alert('Error', 'Failed to save or share file');
    }
  }
}

export function resolveExportError(err: any): string {
  if (err?.response?.status === 401) {
    return 'Session expired. Please login again and retry export.';
  }
  if (err?.response?.status) {
    return `Export failed (${err.response.status}).`;
  }
  if (err?.message && err.message !== 'User did not share') {
    return err.message;
  }
  return 'Export failed. Please try again.';
}
