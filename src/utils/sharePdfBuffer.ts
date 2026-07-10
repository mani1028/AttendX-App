import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';

// ponytail: matches file_paths.xml files-path name; same pattern as fee/receipt exports
const ANDROID_FILE_PROVIDER = 'com.visys.attendx.fileprovider';

function toBase64(data: ArrayBuffer | unknown): string {
  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data)).toString('base64');
  }
  return Buffer.from(data as any).toString('base64');
}

function sanitizeFileName(name: string): string {
  const base = (name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

/**
 * Write a PDF buffer to disk and open the system share sheet (view/save).
 * Android uses the app FileProvider content URI (see file_paths.xml).
 */
export async function sharePdfBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  title: string,
): Promise<void> {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Received an empty file from the server.');
  }

  const safeName = sanitizeFileName(fileName);
  const filePath = `${RNFS.DocumentDirectoryPath}/${safeName}`;
  const base64 = toBase64(buffer);

  await RNFS.writeFile(filePath, base64, 'base64');
  const exists = await RNFS.exists(filePath);
  if (!exists) {
    throw new Error('Could not save the file on this device.');
  }

  const shareUrl =
    Platform.OS === 'android'
      ? `content://${ANDROID_FILE_PROVIDER}/internal_files/${safeName}`
      : `file://${filePath}`;

  try {
    await Share.open({
      url: shareUrl,
      type: 'application/pdf',
      title,
      failOnCancel: false,
      showAppsToView: true,
    });
  } catch (err: any) {
    const message = String(err?.message || '').toLowerCase();
    if (message.includes('user did not share') || message.includes('cancel')) {
      return;
    }
    throw err;
  }
}
