const { exec } = require('child_process');
const fs = require('fs');

exec('git show a1bda55 --stat', {cwd: 'c:\\Users\\Administrador\\.gemini\\antigravity\\scratch\\loyalty\\loyalty-main'}, (err, stdout, stderr) => {
  fs.writeFileSync('scratch/git_show_initial.txt', stdout + '\n' + stderr);
  console.log('Done!');
});
