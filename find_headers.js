const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(screensDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.match(/borderBottomLeftRadius:\s*\d+/) && (content.includes('ChevronLeft') || content.includes('ArrowLeft') || content.includes('goBack'))) {
    console.log(`Needs refactoring: ${file}`);
  }
}
