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

  // 1. Fix Duplicate identifier 'Theme'
  const themeImportRegex = /import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"];?\n/g;
  const matches = content.match(themeImportRegex);
  if (matches && matches.length > 1) {
    let first = true;
    content = content.replace(themeImportRegex, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return '';
    });
    changed = true;
  }
  
  const themeImportRegex2 = /import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/theme\/tokens['"];?\n/g;
  const matches2 = content.match(themeImportRegex2);
  if (matches2 && matches2.length > 1) {
    let first = true;
    content = content.replace(themeImportRegex2, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return '';
    });
    changed = true;
  }

  // If one has ../theme/tokens and another has ../../theme/tokens
  const hasOne = content.match(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/theme\/tokens['"];?/);
  const hasTwo = content.match(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"];?/);
  if (hasOne && hasTwo) {
    content = content.replace(/import\s*\{\s*Theme\s*\}\s*from\s*['"]\.\.\/\.\.\/theme\/tokens['"];?\n?/, '');
    changed = true;
  }

  // 2. Fix Cannot find name 'navigation'
  if (content.includes('navigation.goBack()') && !content.includes('const navigation =')) {
    // try to add it inside the main component
    const componentRegex = /(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{|const [a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/;
    if (componentRegex.test(content)) {
        content = content.replace(componentRegex, (match) => {
            return match + '\n  const navigation = useNavigation<any>();\n';
        });
        if (!content.includes('useNavigation')) {
            content = "import { useNavigation } from '@react-navigation/native';\n" + content;
        }
        changed = true;
    }
  }

  // 3. Fix 'fontWeight' is specified more than once
  if (content.includes('fontWeight')) {
     const before = content;
     // simple hack: find AppText or Text with weight="..." and fontWeight="..."
     // Actually the error is: 'fontWeight' is specified more than once
     // e.g., weight="bold" fontWeight="bold" -- maybe we just remove fontWeight="xxx" if weight="xxx" is present
     // Actually TS error means it's literally `fontWeight="bold" fontWeight="bold"` or something, 
     // or object `{ fontWeight: 'bold', fontWeight: 'normal' }`
     // Let's replace: fontWeight: Theme.typography.xxx.fontWeight, ... fontWeight: 'bold'
     // I'll just remove static `fontWeight: 'bold'` if it's near `...Theme.typography`
     // Let's use a simpler replace:
     content = content.replace(/fontWeight:\s*['"][a-zA-Z0-9]+['"],(\s*fontWeight:\s*['"][a-zA-Z0-9]+['"],)/g, '$1');
     content = content.replace(/fontWeight:\s*['"][a-zA-Z0-9]+['"],\s*fontWeight:\s*['"][a-zA-Z0-9]+['"]/g, "fontWeight: 'bold'");
     
     // What if it's in a style array: `[styles.text, { fontWeight: 'bold' }, { fontWeight: 'normal' }]`?
     // Actually the line number is provided, let's just let eslint fix it if possible, or I can run the script and see
     if (before !== content) changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
