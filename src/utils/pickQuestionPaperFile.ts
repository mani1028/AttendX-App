import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';

export type PickedQuestionPaperFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function pickQuestionPaperFile(): Promise<PickedQuestionPaperFile | null> {
  try {
    const [result] = await pick({
      type: [types.pdf, types.images],
      allowMultiSelection: false,
    });

    if (!result?.uri) {
      return null;
    }

    const name = result.name || `question_paper_${Date.now()}.pdf`;
    const type = result.type || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const size = result.size ?? undefined;

    if (size && size > MAX_FILE_BYTES) {
      throw new Error('File size exceeds 10 MB. Please choose a smaller file.');
    }

    return { uri: result.uri, name, type, size };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
}
