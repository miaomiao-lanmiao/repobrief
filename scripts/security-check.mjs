import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}

const runtime = files('src').filter(file => file.endsWith('.ts'));
const forbidden = [
  [/\beval\s*\(/, 'eval'], [/\bnew\s+Function\s*\(/, 'dynamic code'],
  [/(?<![.\w])(?:exec|execSync|execFile|execFileSync)\s*\(/, 'unreviewed process API'],
  [/shell\s*:\s*true/, 'shell execution'],
  [/\b(?:fetch|WebSocket|XMLHttpRequest)\s*\(/, 'network API'],
  [/(?:from\s*|import\s*\()\s*['"](?:node:)?(?:https?|http2|net|tls|dgram|dns)['"]/, 'network module'],
];
for (const file of runtime) {
  const source = readFileSync(file, 'utf8');
  for (const [pattern, reason] of forbidden) assert.equal(pattern.test(source), false, `${file}: ${reason}`);
  const secretPattern = /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
  assert.equal(secretPattern.test(source), false, `${file}: possible credential`);
}
const git = readFileSync('src/git.ts', 'utf8');
assert.match(git, /spawnSync\('git', \[/);
assert.match(git, /shell: false/);
assert.match(git, /GIT_NO_LAZY_FETCH: '1'/);
assert.match(git, /--no-ext-diff/);
assert.match(git, /--no-textconv/);
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0, 'Runtime dependencies require review.');
for (const version of Object.values(manifest.devDependencies ?? {})) assert.match(version, /^\d+\.\d+\.\d+$/);
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.link) continue;
  assert.ok(entry.resolved?.startsWith('https://registry.npmjs.org/'), `Unexpected dependency source: ${path}`);
  assert.ok(entry.integrity, `Missing integrity: ${path}`);
  assert.ok(!entry.hasInstallScript, `Install script requires review: ${path}`);
}
console.log(`Security checks passed for ${runtime.length} runtime modules and the npm lockfile. Static checks do not guarantee security.`);
