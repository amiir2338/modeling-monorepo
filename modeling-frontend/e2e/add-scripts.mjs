import fs from 'fs';
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['e2e:install'] = pkg.scripts['e2e:install'] || 'npm i -D @playwright/test supertest concurrently wait-on && npx playwright install';
pkg.scripts['e2e:setup'] = pkg.scripts['e2e:setup'] || 'node e2e/setup-scaffold.mjs';
pkg.scripts['e2e'] = pkg.scripts['e2e'] || 'node e2e/bootstrap-e2e.mjs';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
console.log('✅ package.json scripts updated.');
