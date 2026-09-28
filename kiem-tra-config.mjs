// Kiểm tra thiep-20-11/config.js trước khi xem thử hoặc đưa lên mạng.
// Chạy: node kiem-tra-config.mjs   (các file .cmd tự gọi, không cần chạy tay)
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const file = resolve(process.argv[2] || 'thiep-20-11/config.js');
const fail = (msg) => { console.error('\nLOI trong config.js: ' + msg + '\n'); process.exit(1); };

let CONFIG;
try {
  ({ CONFIG } = await import(pathToFileURL(file).href));
} catch (e) {
  const tmp = join(tmpdir(), `kiem-tra-config-${process.pid}.mjs`);
  let detail = e.message;
  try {
    copyFileSync(file, tmp);
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
    const out = (r.stderr || '').split(tmp).join('config.js').split(pathToFileURL(tmp).href).join('config.js');
    const lines = out.split('\n').filter((l) => l.trim() && !l.includes('Node.js v') && !/^\s+at /.test(l));
    if (lines.length) detail = lines.slice(0, 5).join('\n');
  } catch (err) { /* giữ thông báo gốc */ } finally { rmSync(tmp, { force: true }); }
  fail(`\n${detail}\n\nThường là thiếu dấu nháy ' hoặc dấu phẩy ở dòng được chỉ (hoặc dòng ngay trên).`);
}

if (!CONFIG) fail('không tìm thấy "export const CONFIG".');
for (const k of ['to', 'from', 'years', 'board', 'secrets', 'letter', 'gift']) if (!(k in CONFIG)) fail(`thiếu mục "${k}".`);
if (!(Number(CONFIG.years) > 0)) fail('"years" phải là một con số, ví dụ 30.');
if (!Array.isArray(CONFIG.board) || CONFIG.board.length < 1 || CONFIG.board.length > 6) fail('"board" phải có từ 1 đến 6 dòng.');
if (CONFIG.board.some((s) => typeof s !== 'string' || !s.trim())) fail('"board" có dòng bị trống.');
for (const k of ['board', 'tests', 'glasses', 'flowers', 'tools', 'drum']) {
  const s = CONFIG.secrets[k];
  if (!s || !s.title || !s.text) fail(`thiếu tiêu đề hoặc lời nhắn ở "secrets.${k}".`);
}
const known = ['to', 'from', 'years', 'students', 'tests', 'lessons', 'chalk'];
const all = JSON.stringify(CONFIG);
for (const m of all.matchAll(/\{(\w+)\}/g)) if (!known.includes(m[1])) fail(`không hiểu chỗ trống {${m[1]}}. Chỉ dùng được: ${known.map((k) => '{' + k + '}').join(', ')}.`);

console.log('config.js OK');
