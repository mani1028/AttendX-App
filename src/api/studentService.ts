import API from './client';

export const studentService = {
  getAttendanceRecords() {
    return API.get('/manage/student-dashboard/attendance');
  },
};