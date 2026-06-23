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

const replacements = [
  { regex: /['"]#(fff|FFF|ffffff|FFFFFF)['"]/g, replace: 'Theme.colors.card' },
  { regex: /['"]#(1e3a8a|1E3A8A)['"]/g, replace: 'Theme.colors.primary' },
  { regex: /['"]#(64748B|64748b|475569)['"]/g, replace: 'Theme.colors.textSec' },
  { regex: /['"]#(0f172a|0F172A|0d1b2a)['"]/g, replace: 'Theme.colors.text' },
  { regex: /['"]#(e2e8f0|E2E8F0|e4e9f2)['"]/g, replace: 'Theme.colors.border' },
  { regex: /['"]#(059669|10b981)['"]/g, replace: 'Theme.colors.success' },
  { regex: /['"]#(dc2626|ef4444)['"]/g, replace: 'Theme.colors.error' },
  { regex: /['"]#(3b82f6)['"]/g, replace: 'Theme.colors.blue' },
  { regex: /['"]#(f1f5f9|F1F5F9|f8fafc|F8FAFC)['"]/g, replace: 'Theme.colors.background' },
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  let changed = false;
  for (const { regex, replace } of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }

  if (changed) {
    // Add import { Theme } from '../../theme/tokens' if it doesn't exist
    if (!content.includes('import { Theme }') && !content.includes('import {Theme}')) {
      // Calculate relative path to src/theme/tokens
      const relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'theme', 'tokens')).replace(/\\/g, '/');
      const importStatement = `import { Theme } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n`;
      
      // Find the last import statement to insert after it
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfLine + 1) + importStatement + content.substring(endOfLine + 1);
      } else {
        content = importStatement + content;
      }
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated colors in ${file}`);
  }
}
