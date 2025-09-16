// tools/fix-router-exports.cjs
// Finds route files that create an Express Router but don't export it, and appends an export.

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'src';

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (/(^|[\\/])(node_modules|dist|.git|build)([\\/]|$)/i.test(p)) continue;
      yield* walk(p);
    } else if (/\.(js|ts|mjs|cjs)$/.test(name)) {
      yield p;
    }
  }
}

const files = [];
for (const f of walk(ROOT)) files.push(f);

let fixed = 0;
let skipped = 0;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  // فقط فایل‌هایی که Router دارند
  if (!/express\.Router\(|\bRouter\(\)/.test(txt)) { skipped++; continue; }

  const hasExport =
    /export\s+default\s+router\s*;?/.test(txt) ||
    /module\.exports\s*=\s*router\s*;?/.test(txt);

  if (hasExport) { skipped++; continue; }

  // تشخیص نوع ماژول
  const isCJS = /module\.exports|\brequire\(/.test(txt);
  const isESM = /(^|\n)\s*import\s+.+from\s+['"]/.test(txt) || /export\s+/.test(txt);

  let appendLine = '';
  if (isCJS && !isESM) {
    appendLine = '\n\nmodule.exports = router;\n';
  } else {
    appendLine = '\n\nexport default router;\n';
  }

  fs.writeFileSync(f, txt + appendLine, 'utf8');
  console.log('✅ fixed export in', path.relative(process.cwd(), f));
  fixed++;
}

console.log(`Done. Fixed=${fixed}, Skipped=${skipped}, Total=${files.length}`);
