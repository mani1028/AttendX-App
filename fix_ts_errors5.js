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
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let changed = false;

  // 1. Remove duplicate useNavigation at line 0
  if (lines[0] === "import { useNavigation } from '@react-navigation/native';") {
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('useNavigation') && lines[i].includes('import')) count++;
      }
      if (count > 1) {
          lines.splice(0, 1);
          changed = true;
      }
  }

  // 2. Remove duplicate Theme imports
  // Find all lines that import Theme from theme/tokens
  let themeImportLines = [];
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import') && lines[i].includes('{ Theme }') && lines[i].includes('theme/tokens')) {
          themeImportLines.push(i);
      }
  }
  if (themeImportLines.length > 1) {
      // remove all but the last one
      for (let i = 0; i < themeImportLines.length - 1; i++) {
          lines[themeImportLines[i]] = ''; // Empty out the line
          changed = true;
      }
  }

  // 3. Fix StudentAttendanceScreen duplicate navigation
  if (file.endsWith('StudentAttendanceScreen.tsx')) {
      for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('const { navigation } = props')) {
             // look ahead for const navigation = useNavigation<any>();
             for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                 if (lines[j].includes('const navigation = useNavigation<any>();')) {
                     lines[j] = '';
                     changed = true;
                 }
             }
          }
      }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }
}
