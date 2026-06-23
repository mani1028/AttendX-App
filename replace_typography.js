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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace { fontSize: 28, fontWeight: '800' } or variations.
  // Note: We need a complex regex or parser, but simple regex on lines usually works.
  
  const replacements = [
    { regex: /fontSize\s*:\s*28\s*,\s*fontWeight\s*:\s*['"](?:800|bold)['"]/g, replace: '...Theme.typography.h1' },
    { regex: /fontWeight\s*:\s*['"](?:800|bold)['"]\s*,\s*fontSize\s*:\s*28/g, replace: '...Theme.typography.h1' },
    
    { regex: /fontSize\s*:\s*22\s*,\s*fontWeight\s*:\s*['"](?:700|bold)['"]/g, replace: '...Theme.typography.h2' },
    { regex: /fontWeight\s*:\s*['"](?:700|bold)['"]\s*,\s*fontSize\s*:\s*22/g, replace: '...Theme.typography.h2' },
    
    { regex: /fontSize\s*:\s*18\s*,\s*fontWeight\s*:\s*['"](?:700|bold|600)['"]/g, replace: '...Theme.typography.h3' },
    { regex: /fontWeight\s*:\s*['"](?:700|bold|600)['"]\s*,\s*fontSize\s*:\s*18/g, replace: '...Theme.typography.h3' },
    
    { regex: /fontSize\s*:\s*16\s*,\s*fontWeight\s*:\s*['"](?:600|500|bold)['"]/g, replace: '...Theme.typography.h4' },
    { regex: /fontWeight\s*:\s*['"](?:600|500|bold)['"]\s*,\s*fontSize\s*:\s*16/g, replace: '...Theme.typography.h4' },
    
    // Fallbacks if only fontSize is specified, we might leave extra fontWeight hanging if it's separate,
    // but the prompt explicitly said to replace inline fontSize+fontWeight pairs with spread syntax:
    // "Preserve any additional style properties (color, marginBottom, etc.) alongside the spread"
    { regex: /fontSize\s*:\s*14/g, replace: '...Theme.typography.body' },
    { regex: /fontSize\s*:\s*12/g, replace: '...Theme.typography.caption' },
    { regex: /fontSize\s*:\s*15/g, replace: '...Theme.typography.bodyMd' },
    { regex: /fontSize\s*:\s*11/g, replace: '...Theme.typography.label' },
    
    // What if there is still a fontWeight hanging after we replace just fontSize: 14?
    // It's technically okay, it will override the spread if it comes after, or be overridden if before.
    // The prompt just said to replace { fontSize: 14 } with { ...Theme.typography.body }
  ];

  for (let r of replacements) {
    if (r.regex.test(content)) {
      content = content.replace(r.regex, r.replace);
      changed = true;
    }
  }

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
    console.log(`Updated typography in ${file}`);
  }
}
