const fs = require('fs');
const content = fs.readFileSync('scratch/search_results.txt', 'utf8');
const regex = /Found in dir: f5e16c48-ba41-4591-8926-a1100afd0bd3([^\n]+)([\s\S]*?)(?=Found in dir:|$)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const index = match[1];
  const snippet = match[2];
  if (snippet.includes('git log') || snippet.includes('error') || snippet.includes('resgates') || snippet.includes('transacoes')) {
    console.log('Match index:', index);
    console.log(snippet.substring(0, 1500));
    console.log('===================================\n');
  }
}
