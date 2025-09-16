const { spawn } = require('child_process');
const args = process.argv.slice(2);
const playBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';
console.log('Using PLAYWRIGHT_BASE_URL=', playBase);
const env = { ...process.env, PLAYWRIGHT_BASE_URL: playBase };
const child = spawn('npx', ['playwright', 'test', ...args], { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code));
