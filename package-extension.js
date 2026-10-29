/**
 * Production Packaging Script for Chrome Web Store
 * Bundles production assets into a clean, store-ready ZIP archive using a safe temp workspace.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version || '2.5.0';
const zipName = `swaply-v${version}.zip`;
const stagingDir = path.join(os.tmpdir(), `swaply-build-${Date.now()}`);

console.log(`\n📦 Packaging Swaply v${version} for Chrome Web Store...`);
console.log(`   Staging directory: ${stagingDir}`);

fs.mkdirSync(stagingDir, { recursive: true });

const productionFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'background.js',
  'devtools.html',
  'devtools.js',
  'panel.html',
  'panel.css',
  'panel.js',
  'split-runner.html',
  'split-runner.js'
];

for (const file of productionFiles) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(stagingDir, file));
    console.log(`  ✓ Copied: ${file}`);
  } else {
    console.warn(`  ⚠️ Warning: ${file} not found!`);
  }
}

try {
  const targetZip = path.join(os.tmpdir(), zipName);
  if (fs.existsSync(targetZip)) {
    fs.unlinkSync(targetZip);
  }

  execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${targetZip}' -Force"`);
  console.log(`\n🎉 Success! Chrome Web Store bundle created:`);
  console.log(`   📍 Location: ${targetZip}`);
  console.log(`   Ready for upload to https://chrome.google.com/webstore/devconsole`);
} catch (err) {
  console.error('Failed to create zip archive:', err.message);
} finally {
  try {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  } catch {}
}
