import { readdir, readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const files = await readdir(new URL('../dist/', import.meta.url));
assert.deepEqual(files, ['index.html'], 'The distribution must contain exactly one HTML file.');
const file = new URL('../dist/index.html', import.meta.url);
const html = await readFile(file, 'utf8');
assert(!/<script[^>]+\bsrc\s*=/i.test(html), 'Scripts must be embedded.');
assert(
  !/<link[^>]+\brel\s*=\s*["'](?:stylesheet|modulepreload)/i.test(html),
  'Styles and modules must be embedded.'
);
assert(
  !/(?:src|href)\s*=\s*["']https?:\/\//i.test(html),
  'Runtime resource references must not use remote URLs.'
);
console.log(
  `Verified single-file distribution: dist/index.html (${Math.round((await stat(file)).size / 1024)} KiB).`
);
