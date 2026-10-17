// Vendors the part of three.js that car.js uses, tree-shaken and minified, plus the Draco decoder.
//
//   npm i --no-save three@0.186.0 esbuild && node tools/build_three.mjs
//
// Writes vendor/three-car.min.js (~650 KB raw, ~140 KB gzip; the CDN module graph it replaces was
// 2.1 MB raw, ~430 KB over the wire, and arrived as a three-step import waterfall) and vendor/draco/.
// The export list is read from car.js (THREE.* members + 'three/addons/...' imports), so re-run this
// whenever car.js starts using something new. index.html's import map points 'three' and each addon
// specifier at the bundle, so car.js keeps its normal three.js imports.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { build } from 'esbuild';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = fs.readFileSync(path.join(ROOT, 'car.js'), 'utf8');
const core = [...new Set([...src.matchAll(/THREE\.([A-Za-z0-9_]+)/g)].map(m => m[1]))].sort();
const addons = [...src.matchAll(/import \{([^}]+)\} from 'three\/addons\/([^']+)'/g)].map(m => [m[1].trim(), m[2]]);

const entry = [`export { ${core.join(', ')} } from 'three';`,
  ...addons.map(([names, file]) => `export { ${names} } from 'three/examples/jsm/${file}';`)].join('\n');
const out = path.join(ROOT, 'vendor', 'three-car.min.js');
const pkg = path.dirname(path.dirname(createRequire(path.join(process.cwd(), 'x.js')).resolve('three')));   // .../node_modules/three
const version = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'none',
  banner: { js: `/* three.js ${version} subset for car.js (MIT, https://threejs.org). Built by tools/build_three.mjs. */` },
  outfile: out,
});

const draco = path.join(pkg, 'examples', 'jsm', 'libs', 'draco', 'gltf');
fs.mkdirSync(path.join(ROOT, 'vendor', 'draco'), { recursive: true });
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js']) fs.copyFileSync(path.join(draco, f), path.join(ROOT, 'vendor', 'draco', f));

console.log(`wrote ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB): ${core.length} core exports, ${addons.length} addons; vendor/draco/`);
console.log('import map specifiers:', ['three', ...addons.map(([, f]) => 'three/addons/' + f)].join(', '));
