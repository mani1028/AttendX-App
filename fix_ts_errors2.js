const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix Duplicate Theme imports
  const themeRegex = /import\s*\{\s*Theme\s*\}\s*from\s*['"][^'"]+theme\/tokens['"];?\n/g;
  const matches = content.match(themeRegex);
  if (matches && matches.length > 1) {
    let first = true;
    content = content.replace(themeRegex, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return '';
    });
    changed = true;
  }

  // Also catch mixed path duplicate Theme imports
  const t1 = content.match(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/theme\/tokens['"];?\n/g);
  const t2 = content.match(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"];?\n/g);
  if (t1 && t2) {
    content = content.replace(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"];?\n?/, '');
    changed = true;
  }

  // Fix duplicate navigation
  const navRegex = /const\s+navigation\s*=\s*useNavigation<any>\(\);\n\s*const\s+navigation\s*=\s*useNavigation<any>\(\);/g;
  if (content.match(navRegex)) {
     content = content.replace(navRegex, 'const navigation = useNavigation<any>();\n');
     changed = true;
  }

  const navRegex2 = /const\s+navigation\s*=\s*useNavigation<any>\(\);\n([^\n]+)\n\s*const\s+navigation\s*=\s*useNavigation<any>\(\);/g;
  if (content.match(navRegex2)) {
     content = content.replace(navRegex2, 'const navigation = useNavigation<any>();\n$1\n');
     changed = true;
  }

  // Add missing useNavigation import if useNavigation is used
  if (content.includes('useNavigation') && !content.includes('import { useNavigation }')) {
     content = "import { useNavigation } from '@react-navigation/native';\n" + content;
     changed = true;
  }

  // Fix TeacherAssignmentsScreen.tsx line 691 error
  if (file.endsWith('TeacherAssignmentsScreen.tsx')) {
     if (content.includes('rightIcon={Theme}')) {
        content = content.replace(/rightIcon=\{Theme\}/g, '');
        changed = true;
     }
  }

  // Fix PayrollScreen.tsx line 1278 error
  if (file.endsWith('PayrollScreen.tsx')) {
     if (content.includes('styles.fetchHoursButtonText')) {
        content = content.replace(/styles\.fetchHoursButtonText/g, 'styles.fetchHoursButton');
        changed = true;
     }
  }

  // Fix StaffAttendanceScreen.tsx line 277 error
  if (file.endsWith('StaffAttendanceScreen.tsx')) {
     if (content.includes('styles.saveBtnText')) {
        content = content.replace(/styles\.saveBtnText/g, 'styles.saveBtn');
        changed = true;
     }
  }

  // Fix TeacherFaceReviewScreen.tsx line 617 error
  if (file.endsWith('TeacherFaceReviewScreen.tsx')) {
     if (content.includes('styles.markCompleteBtnText')) {
        content = content.replace(/styles\.markCompleteBtnText/g, 'styles.markCompleteBtn');
        changed = true;
     }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
