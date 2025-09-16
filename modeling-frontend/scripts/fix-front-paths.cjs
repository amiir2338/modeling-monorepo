// scripts/fix-front-paths.cjs
// Fix 1) '/v1/auth' → '/api/v1/auth'
// Fix 2) replace imports of '@/app/api/axios-instance' → '@/lib/api/http'
// Fix 3) rename instance./axiosInstance. → http.

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const exts = new Set(['.ts', '.tsx']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(name))) out.push(p);
  }
  return out;
}

function fixContent(txt) {
  let out = txt;

  // 1) '/v1/auth' → '/api/v1/auth'
  out = out.replace(/(['"])\/v1\/auth/g, "$1/api/v1/auth");

  // 2) imports of axios-instance → http
  out = out
    .replace(/import\s+instance\s+from\s+['"]@\/app\/api\/axios-instance['"]/g, "import http from '@/lib/api/http'")
    .replace(/import\s+\{\s*axiosInstance\s*\}\s+from\s+['"][^'"]*api\/axios-instance['"]/g, "import http from '@/lib/api/http'")
    .replace(/import\s+axios\s+from\s+['"][^'"]*api\/axios-instance['"]/g, "import http from '@/lib/api/http'");

  // 3) instance./axiosInstance. → http.
  out = out
    .replace(/\binstance\./g, 'http.')
    .replace(/\baxiosInstance\./g, 'http.');

  return out;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = fixContent(txt);
  if (out !== txt) {
    fs.writeFileSync(file, out, 'utf8');
    changed++;
    console.log('fixed:', path.relative(ROOT, file));
  }
}

console.log(`Done. Modified files: ${changed}`);
