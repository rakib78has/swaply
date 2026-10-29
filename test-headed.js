/**
 * Headed Test Runner for QASwitch
 * Launches a real Google Chrome instance with QASwitch loaded and serves an interactive QA playground.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';

const PORT = 4173;
const ROOT_DIR = process.cwd();
const EXTENSION_PATH = ROOT_DIR;
const TEMP_USER_DATA = path.join(os.tmpdir(), `qaswitch-headed-profile-${Date.now()}`);

// Locate Chrome or Edge binary on Windows
function findBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 1. Create static server for playground
const server = http.createServer((req, res) => {
  const reqUrl = req.url === '/' ? '/playground.html' : req.url;
  const filePath = path.join(ROOT_DIR, reqUrl);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const browserPath = findBrowserPath();

  if (!browserPath) {
    console.error('❌ Could not locate Chrome or Edge executable on this system.');
    console.error('Please open Google Chrome manually and load unpacked extension from:', EXTENSION_PATH);
    server.close();
    process.exit(1);
  }

  const playgroundUrl = `http://localhost:${PORT}/playground.html`;

  console.log('\n======================================================');
  console.log('🚀 QASwitch - HEADED MODE TEST ENVIRONMENT');
  console.log('======================================================');
  console.log(`🌐 Local Playground: ${playgroundUrl}`);
  console.log(`🧩 Extension Path:  ${EXTENSION_PATH}`);
  console.log(`👤 Test Profile:    ${TEMP_USER_DATA}`);
  console.log(`🖥️  Launching:       ${browserPath}`);
  console.log('======================================================\n');
  console.log('👉 Steps to test in headed mode:');
  console.log('   1. In the Chrome window, pin QASwitch from the puzzle icon 🧩.');
  console.log('   2. On the playground page, click "Log In as Admin", then open QASwitch and click Save.');
  console.log('   3. Click "Log In as Regular User", then open QASwitch and click Save.');
  console.log('   4. Switch roles in QASwitch and watch the playground live-reload!');
  console.log('\nPress Ctrl+C in this terminal when finished to close server.\n');

  const args = [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--no-first-run',
    '--no-default-browser-check',
    playgroundUrl
  ];

  const browserProcess = spawn(browserPath, args, { detached: true, stdio: 'ignore' });

  browserProcess.on('error', (err) => {
    console.error('Failed to spawn browser in headed mode:', err);
    server.close();
  });
});

