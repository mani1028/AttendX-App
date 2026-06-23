const fs = require('fs');
const path = require('path');

const files = [
  'src/screens/principal/TeacherAssignmentsScreen.tsx',
  'src/screens/student/StudentDashboardScreen.tsx',
  'src/screens/common/NotificationsScreen.tsx',
  'src/screens/common/ProfileScreen.tsx',
  'src/screens/accountant/AccountantDashboardScreen.tsx',
  'src/screens/teacher/StudentRegistrationRequestsScreen.tsx'
];

for (const f of files) {
  const filePath = path.join(__dirname, f);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // We want to just remove borderBottomLeftRadius from the StyleSheet
  content = content.replace(/borderBottomLeftRadius:\s*\d+,?/g, '');
  content = content.replace(/borderBottomRightRadius:\s*\d+,?/g, '');
  changed = true;
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Removed borderBottomLeftRadius in ${filePath}`);
  }
}
