const fs = require('fs');
const path = require('path');

const components = [
  'View',
  'SafeAreaView',
  'ScrollView',
  'Pressable',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'Animated\\.View'
];

const componentRegex = new RegExp(`<(${components.join('|')})[\\s/>]`, 'g');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('src', (filePath) => {
  if (path.extname(filePath) !== '.tsx') return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = componentRegex.exec(content)) !== null) {
    const startIndex = match.index;
    const remaining = content.substring(startIndex);
    const endIndex = remaining.indexOf('>');
    if (endIndex === -1) continue;
    
    const openingTag = remaining.substring(0, endIndex + 1);
    if (/\bcolor=/.test(openingTag)) {
        const lineNum = content.substring(0, startIndex).split('\n').length;
        console.log(`${filePath}:${lineNum}`);
        console.log(openingTag.trim());
        console.log('---');
    }
  }
});
