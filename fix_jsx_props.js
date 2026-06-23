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

  // We are looking for attributes like color=Theme.colors.xxx or backgroundColor=Theme.colors.xxx without braces
  // Regex: (\w+)=Theme\.colors\.([a-zA-Z0-9]+)
  // If it's already in braces, it would be {\s*Theme.colors.xxx\s*} or color={Theme.colors.xxx}
  // Let's replace ONLY when it is directly after =
  const regex = /([a-zA-Z0-9_]+)=Theme\.([a-zA-Z0-9_.]+)(?!\s*\})/g;

  content = content.replace(regex, (match, prop, value) => {
    changed = true;
    return `${prop}={Theme.${value}}`;
  });
  
  // also check spacing like padding=Theme.spacing.md
  const regex2 = /([a-zA-Z0-9_]+)=Theme\.spacing\.([a-zA-Z0-9_]+)(?!\s*\})/g;
  content = content.replace(regex2, (match, prop, value) => {
    changed = true;
    return `${prop}={Theme.spacing.${value}}`;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed JSX props in ${file}`);
  }
}
