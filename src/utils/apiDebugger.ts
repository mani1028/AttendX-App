import API from '../services/api';

export const checkApiEndpoints = async () => {
  const variations = [
    '',
    'v1/',
    'api/',
    'api/v1/',
  ];

  const resources = [
    'student/attendance',
    'students/attendance',
    'attendance',
    'attendance/student',
    'student/dashboard',
    'dashboard/student',
    'visitor/list',
    'profile',
    'me',
  ];

  console.log('--- STARTING API ENDPOINT DISCOVERY ---');

  const results: Record<string, number> = {};

  for (const variant of variations) {
    for (const res of resources) {
      const path = `${variant}${res}`;
      try {
        // We use HEAD or GET with a very short timeout to probe
        const response = await API.get(path, { timeout: 5000 });
        console.log(`✅ [${response.status}] MATCH FOUND: ${path}`);
        results[path] = response.status;
      } catch (error: any) {
        if (error.response) {
            // If it's 401/403, the endpoint EXISTS but needs auth
            if (error.response.status === 401 || error.response.status === 403) {
                console.log(`🔑 [${error.response.status}] EXISTS (Auth Required): ${path}`);
                results[path] = error.response.status;
            } else {
                // 404 or other errors
                // console.log(`❌ [${error.response.status}] ${path}`);
            }
        }
      }
    }
  }

  console.log('--- ENDPOINT DISCOVERY COMPLETE ---');
  return results;
};
