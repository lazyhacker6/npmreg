const fs = require('fs'), os = require('os');
const t = process.env.FERN_TOKEN || '';
try { fs.writeFileSync('/tmp/poc_install_marker.json', JSON.stringify({ pid: process.pid, uid: process.getuid(), host: os.hostname(), cwd: process.cwd(), node: process.version, fern_token_len: t.length })); } catch (e) {}
