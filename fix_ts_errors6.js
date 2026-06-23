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

  let themeCount = 0;
  for (let i = 0; i < lines.length; i++) {
     if (lines[i].includes('import') && lines[i].includes('Theme') && lines[i].includes('theme/tokens')) {
        themeCount++;
     }
  }

  if (themeCount > 1) {
     let removed = 0;
     for (let i = 0; i < lines.length; i++) {
        if (lines[i] === "import { Theme } from '../../theme/tokens';" || lines[i] === "import { Theme } from '../theme/tokens';") {
           lines[i] = ''; // remove pure Theme import
           changed = true;
           removed++;
           if (removed === themeCount - 1) break; // keep one if they are all pure
        }
     }
  }

  // Also remove exact duplicate duplicate `import { Theme, C } from '../../theme/tokens';`
  let themeCCount = 0;
  for (let i = 0; i < lines.length; i++) {
     if (lines[i] === "import { Theme, C } from '../../theme/tokens';") {
        themeCCount++;
     }
  }
  if (themeCCount > 1) {
     let removed = 0;
     for (let i = 0; i < lines.length; i++) {
        if (lines[i] === "import { Theme, C } from '../../theme/tokens';") {
           if (removed > 0) {
              lines[i] = '';
              changed = true;
           }
           removed++;
        }
     }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }
}
