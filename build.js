/**
 * Build Script for QASwitch
 * Compiles modular TypeScript sources into the single-file runtime popup.js
 */

import fs from 'node:fs';
import path from 'node:path';

function stripTypeScript(code) {
  return code
    // Remove import statements
    .replace(/^import\s+type\s+[^;]+;/gm, '')
    .replace(/^import\s+[^;]+from\s+['"][^'"]+['"];/gm, '')
    .replace(/^export\s+(interface|type)\s+[\s\S]*?^}/gm, '')
    // Remove export keyword from functions and consts
    .replace(/^export\s+(const|function|let|var|class)/gm, '$1')
    // Remove type annotations on variables & params: e.g. (a: string, b?: number): void
    .replace(/:\s*([A-Za-z0-9_<>\[\]|& ]+)(\s*[,=)])/g, '$2')
    .replace(/:\s*([A-Za-z0-9_<>\[\]|& ]+)(\s*\{)/g, ' $2')
    .replace(/as\s+[A-Za-z0-9_<>\[\]|& ]+/g, '')
    .replace(/<[A-Za-z0-9_, ]+>/g, '');
}

console.log('Building QASwitch TypeScript to runtime bundle...');

// Files to concatenate in dependency order
const order = [
  'src/core/domainUtils.ts',
  'src/core/cookieManager.ts',
  'src/core/storageManager.ts',
  'src/core/profileService.ts',
  'src/popup.ts'
];

let bundle = `/**
 * QASwitch - Production Bundle (Compiled from TypeScript)
 * Generated automatically from src/
 */
`;

for (const relPath of order) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cleaned = raw
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '')
      .replace(/^export\s+(interface|type)\s+[\s\S]*?^}/gm, '')
      .replace(/^export\s+/gm, '');

    bundle += `\n/* --- Bundled: ${relPath} --- */\n` + cleaned;
  }
}

// Remove any remaining type annotations or 'as Type' casts
bundle = bundle
  .replace(/\bas\s+(HTMLElement|HTMLButtonElement|HTMLInputElement|ProfileRecord\[\]|SessionCookie\[\]|string|boolean|number)\b/g, '')
  .replace(/:\s*(string|number|boolean|void|Event|MouseEvent|KeyboardEvent|ProgressEvent<FileReader>|chrome\.tabs\.Tab\s*\|\s*null|ProfileRecord\[\]|SessionCookie\[\]|DOMStorageSnapshot|NodeJS\.Timeout\s*\|\s*null)(\s*[,)=])/g, '$2')
  .replace(/:\s*(string|number|boolean|void|Event|MouseEvent|KeyboardEvent|ProgressEvent<FileReader>|chrome\.tabs\.Tab\s*\|\s*null|ProfileRecord\[\]|SessionCookie\[\]|DOMStorageSnapshot|NodeJS\.Timeout\s*\|\s*null)\s*\{/g, ' {');

fs.writeFileSync('popup.js', bundle, 'utf8');
console.log('✓ Successfully compiled to popup.js');

