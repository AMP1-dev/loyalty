const fs = require('fs');
if (fs.existsSync('app/cliente/index.tsx.bak')) {
  const lines = fs.readFileSync('app/cliente/index.tsx.bak', 'utf8').split('\n');
  for (let i = 710; i <= 765; i++) {
    if (lines[i]) console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  console.log('No backup file found.');
}
