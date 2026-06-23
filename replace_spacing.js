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

const files = [
  ...walk(path.join(__dirname, 'src', 'screens')),
  ...walk(path.join(__dirname, 'src', 'components'))
];

const tokenMap = {
  '4': 'Theme.spacing.xs',
  '8': 'Theme.spacing.sm',
  '16': 'Theme.spacing.md',
  '24': 'Theme.spacing.lg',
  '32': 'Theme.spacing.xl',
  '48': 'Theme.spacing.xxl'
};

const regex = /(margin|padding)(Top|Bottom|Left|Right|Horizontal|Vertical)?\s*:\s*(4|8|16|24|32|48)(?!\d)/g;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(regex, (match, p1, p2, val) => {
    changed = true;
    const prop = p1 + (p2 || '');
    return `${prop}: ${tokenMap[val]}`;
  });

  if (changed) {
    if (!content.includes('import { Theme }') && !content.includes('import {Theme}')) {
      const relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'theme', 'tokens')).replace(/\\/g, '/');
      const importStatement = `import { Theme } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n`;
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfLine + 1) + importStatement + content.substring(endOfLine + 1);
      } else {
        content = importStatement + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated spacing in ${file}`);
  }
}
