const fs = require('fs');
const path = require('path');

const p = 'C:\\Users\\Administrador\\.gemini\\antigravity';
if (fs.existsSync(p)) {
  console.log('App data files:', fs.readdirSync(p));
  const kPath = path.join(p, 'knowledge');
  if (fs.existsSync(kPath)) {
    console.log('Knowledge files:', fs.readdirSync(kPath));
  } else {
    console.log('No knowledge folder');
  }
} else {
  console.log('App data path does not exist');
}
