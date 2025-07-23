import 'dotenv/config'
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const distDir = join(__dirname, 'keystore_dist'); 

const originUrl = process.env.KEYSTORE_PARENT_ORIGIN;
if (!originUrl) {
  console.error('KEYSTORE_PARENT_ORIGIN environment variable not found.');
  process.exit(1);
}
console.log(`Building keystore for origin: ${originUrl}`);

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir);
const jsTemplate = readFileSync(join(__dirname, 'keystore', 'keystore.js'), 'utf-8');
const jsOutput = jsTemplate.replace(/__KEYSTORE_PARENT_ORIGIN__/g, originUrl);
writeFileSync(join(distDir, 'keystore.js'), jsOutput); 
copyFileSync(join(__dirname, 'keystore', 'index.html'), join(distDir, 'index.html'));
