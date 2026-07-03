const fs = require('fs');
const content = fs.readFileSync('app/merchant/index.tsx', 'utf8');
const regex = /\.from\(['"]([^'"]+)['"]\)/g;
const tables = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
  tables.add(match[1]);
}
console.log('Tables found in merchant file:', Array.from(tables));
