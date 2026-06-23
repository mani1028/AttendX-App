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

const files = walk(path.join(__dirname, 'src', 'screens'));

for (const file of files) {
  if (file.includes('LoginScreen.tsx')) continue; // Keep it here
  if (file.includes('LoadingScreen.tsx')) continue; // Keep it here

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Remove StatusBar from imports
  if (content.includes('StatusBar')) {
     content = content.replace(/,\s*StatusBar/, '');
     content = content.replace(/StatusBar\s*,/, '');
     content = content.replace(/import\s*{\s*StatusBar\s*}\s*from\s*['"]react-native['"];?\n?/, '');
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cleaned StatusBar in ${file}`);
  }
}
