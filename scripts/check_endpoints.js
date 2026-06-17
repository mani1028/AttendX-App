const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function extractEndpointsFromFile(content) {
  const endpoints = new Set();
  // match strings like '/auth/login' or '/api/auth/login' or 'student-dashboard/profile'
  const regex = /(['"`])(\/[a-zA-Z0-9_\/\-\?\&\=\.\%]+)\1/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    endpoints.add(m[2]);
  }
  return Array.from(endpoints);
}

function searchBackendFor(endpoint, backendFiles) {
  // Relaxed search: check if endpoint appears literally in backend files
  const foundIn = [];
  for (const file of backendFiles) {
    try {
      const txt = fs.readFileSync(file, 'utf8');
      if (txt.includes(endpoint)) foundIn.push(file);
      else {
        // Also try without leading /
        if (endpoint.startsWith('/')) {
          const e2 = endpoint.replace(/^\//, '');
          if (txt.includes(e2)) foundIn.push(file);
        }
      }
    } catch {}
  }
  return foundIn;
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const backendDir = path.join(__dirname, '..', 'backend');
  if (!fs.existsSync(srcDir)) {
    console.error('src directory not found');
    process.exit(2);
  }
  if (!fs.existsSync(backendDir)) {
    console.error('backend directory not found');
    process.exit(2);
  }

  const srcFiles = walk(srcDir).filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'));
  const backendFiles = walk(backendDir).filter(f => f.endsWith('.py') || f.endsWith('.js') || f.endsWith('.ts'));

  const endpoints = new Set();
  for (const file of srcFiles) {
    const txt = fs.readFileSync(file, 'utf8');
    const eps = extractEndpointsFromFile(txt);
    eps.forEach(e => endpoints.add(e));
  }

  const sorted = Array.from(endpoints).sort();
  const report = [];
  for (const ep of sorted) {
    const found = searchBackendFor(ep, backendFiles);
    report.push({ endpoint: ep, found: found.length > 0, files: found.slice(0,5) });
  }

  const missing = report.filter(r => !r.found);
  console.log('Total endpoints scanned:', sorted.length);
  console.log('Missing in backend (sample 200):');
  missing.slice(0,200).forEach(r => console.log('-', r.endpoint));
  console.log('\nFull report JSON:\n');
  console.log(JSON.stringify(report, null, 2));
}

main();
