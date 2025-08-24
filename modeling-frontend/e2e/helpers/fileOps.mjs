import fs from 'fs';
import path from 'path';

export function ensureFile(filePath, content) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    console.log('[created]', full);
    return {created: true, patched: false};
  }
  const current = fs.readFileSync(full, 'utf-8');
  if (!current.includes('export default') && !current.includes('function ') && !current.includes('class ')) {
    fs.writeFileSync(full, content, 'utf-8');
    console.log('[patched]', full);
    return {created: false, patched: true};
  }
  return {created: false, patched: false};
}
