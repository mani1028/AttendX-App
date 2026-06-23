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

  // If the file uses Theme but doesn't import Theme
  if (content.includes('Theme.') && !content.includes('import { Theme }') && !content.includes('import { Theme,')) {
     content = "import { Theme } from '../../theme/tokens';\n" + content;
     changed = true;
  }

  // Same for C
  if (content.includes('C.') && !content.includes('import { C }') && !content.includes(', C }') && !content.includes('{ C, ')) {
     if (content.includes("import { Theme } from '../../theme/tokens';")) {
        content = content.replace("import { Theme } from '../../theme/tokens';", "import { Theme, C } from '../../theme/tokens';");
     } else {
        content = "import { C } from '../../theme/tokens';\n" + content;
     }
     changed = true;
  }

  if (file.endsWith('PayrollScreen.tsx')) {
     if (content.includes('styles.addButtonText')) {
        content = content.replace(/styles\.addButtonText/g, 'styles.addButtonTextRed');
        changed = true;
     }
     if (content.includes('styles.actionBtnTextBlue')) {
        content = content.replace(/styles\.actionBtnTextBlue/g, 'styles.actionBtnText');
        changed = true;
     }
     if (content.includes('styles.actionBtnText')) {
        content = content.replace(/styles\.actionBtnText/g, 'styles.actionBtn');
        changed = true;
     }
     if (content.includes('styles.hoursGrossAmount')) {
        content = content.replace(/styles\.hoursGrossAmount/g, 'styles.hoursAmount');
        changed = true;
     }
  }

  if (file.endsWith('AdminAgentsScreen.tsx') || file.endsWith('AdminPlansScreen.tsx')) {
     if (content.includes('navigation.goBack()') && !content.includes('const navigation =')) {
        content = content.replace(/export\s+default\s+function\s+[a-zA-Z0-9_]+\s*\(\)\s*\{/g, (match) => {
           return match + "\n  const navigation = useNavigation<any>();";
        });
        changed = true;
     }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
