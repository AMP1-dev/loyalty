const fs = require('fs');
const content = fs.readFileSync('scratch/search_results.txt', 'utf8');

// We want to find occurrences of Pl/pgSQL function definitions
const regex = /Found in dir: ([^\n]+) at index: (\d+)([\s\S]*?)(?=Found in dir:|$)/g;
let match;
let foundCount = 0;

while ((match = regex.exec(content)) !== null) {
  const dir = match[1];
  const snippet = match[3];
  if (snippet.toLowerCase().includes('create or replace function') || snippet.toLowerCase().includes('language plpgsql')) {
    foundCount++;
    console.log('Match found in:', dir);
    fs.writeFileSync('scratch/function_sql_' + foundCount + '.txt', 'dir: ' + dir + '\n' + snippet);
  }
}

console.log('Total SQL creations found:', foundCount);
