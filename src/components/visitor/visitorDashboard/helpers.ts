import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || '';
};
