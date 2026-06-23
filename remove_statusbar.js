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
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src', 'screens'));

for (const file of files) {
  if (file.endsWith('LoginScreen.tsx') || file.endsWith('LoadingScreen.tsx')) {
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // regex to remove <StatusBar ... />
  const statusRegex = /<StatusBar[^>]*\/>/g;
  if (statusRegex.test(content)) {
    content = content.replace(statusRegex, '');
    changed = true;
  }

  // Also remove StatusBar imports if they are now unused?
  // Actually, just removing the element is enough. React Native will warn if StatusBar is unused, but fixing imports across 87 files is safer with a simple regex.
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Removed StatusBar from ${file}`);
  }
}
