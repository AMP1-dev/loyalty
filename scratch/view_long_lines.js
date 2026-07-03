const fs = require('fs');
const lines = fs.readFileSync('scratch/search_results.txt', 'utf8').split('\n');
for (let i = 115; i <= 135; i++) {
  if (lines[i]) console.log(`${i+1}: ${lines[i]}`);
}
