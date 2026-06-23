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

  // Fix Duplicate useNavigation
  const useNavRegex = /import\s*\{\s*useNavigation\s*\}\s*from\s*['"]@react-navigation\/native['"];?\n/g;
  const matchesNav = content.match(useNavRegex);
  if (matchesNav && matchesNav.length > 1) {
    let first = true;
    content = content.replace(useNavRegex, (match) => {
      if (first) {
        first = false;
        return ''; // remove the first one (which we blindly added at top)
      }
      return match;
    });
    changed = true;
  }

  // Fix Duplicate Theme imports
  const themeRegex = /import\s*\{\s*Theme\s*\}\s*from\s*['"][^'"]+theme\/tokens['"];?\n/g;
  const matches = content.match(themeRegex);
  if (matches && matches.length > 1) {
    let first = true;
    content = content.replace(themeRegex, (match) => {
      if (first) {
        first = false;
        return ''; // remove first one
      }
      return match;
    });
    changed = true;
  }

  // Fix Duplicate navigation in StudentAttendanceScreen
  if (file.endsWith('StudentAttendanceScreen.tsx')) {
     const dupNavRegex = /const\s+navigation\s*=\s*useNavigation<any>\(\);\n\s*const\s+navigation\s*=\s*useNavigation<any>\(\);/g;
     if (content.match(dupNavRegex)) {
        content = content.replace(dupNavRegex, 'const navigation = useNavigation<any>();\n');
        changed = true;
     }
     
     // Also sometimes it's const { navigation } = props; and we added const navigation = useNavigation<any>();
     if (content.includes('const { navigation } = props') && content.includes('const navigation = useNavigation<any>();')) {
        content = content.replace(/const\s+navigation\s*=\s*useNavigation<any>\(\);\n/g, '');
        changed = true;
     }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
