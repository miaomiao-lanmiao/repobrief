import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDependencies, crossesThreshold, renderReport } from '../dist/index.js';

const lock = packages => ({ lockfileVersion: 3, packages: { '': {}, ...packages } });
test('exact registry versions with integrity have no findings', () => {
  const report = analyzeDependencies({ name: 'clean', dependencies: { pkg: '1.2.3' } }, lock({
    'node_modules/pkg': { version: '1.2.3', resolved: 'https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz', integrity: 'sha512-example' },
  }));
  assert.deepEqual(report.summary, { high: 0, warning: 0 });
  assert.equal(report.lockedPackages, 1);
  assert.equal(report.directDependencies, 1);
});
test('flags ranges, workspaces, remote and insecure sources, but never echoes source credentials', () => {
  const report = analyzeDependencies({ dependencies: {
    range: '^1.0.0', local: 'workspace:*', remote: 'https://user:secret@example.invalid/p.tgz?token=secret',
    insecure: 'http://example.invalid/p.tgz', gitdep: 'git+ssh://example.invalid/repo', short: 'org/repo',
  } }, null);
  assert.deepEqual(new Set(report.findings.map(f => f.code)), new Set([
    'UNPINNED_VERSION', 'LOCAL_SOURCE', 'REMOTE_SOURCE', 'INSECURE_SOURCE', 'MISSING_LOCKFILE',
  ]));
  assert.doesNotMatch(JSON.stringify(report), /secret|user:|token=/);
  assert.doesNotMatch(renderReport(report, 'markdown'), /secret/);
});
test('supports npm aliases and does not flag peer ranges', () => {
  const report = analyzeDependencies({ dependencies: { alias: 'npm:@scope/pkg@1.2.3' }, peerDependencies: { host: '^2' } }, lock({}));
  assert.deepEqual(report.findings, []);
});
test('checks lockfile lifecycle scripts, integrity, duplicates, and insecure transport', () => {
  const report = analyzeDependencies({ scripts: { prepare: 'echo example' } }, lock({
    'node_modules/a': { version: '1.0.0', resolved: 'http://example.invalid/a.tgz', hasInstallScript: true },
    'node_modules/b/node_modules/a': { version: '2.0.0', resolved: 'https://example.invalid/a.tgz' },
    'node_modules/gitdep': { version: '1.0.0', resolved: 'git+ssh://example.invalid/a#hash' },
    'node_modules/workspace': { link: true, resolved: 'packages/workspace' },
  }));
  assert.equal(report.findings.filter(f => f.code === 'INSTALL_SCRIPT').length, 2);
  assert.equal(report.findings.filter(f => f.code === 'MISSING_INTEGRITY').length, 2);
  assert.ok(report.findings.some(f => f.code === 'DUPLICATE_VERSIONS'));
  assert.equal(report.lockedPackages, 4);
  assert.ok(crossesThreshold(report, 'high'));
  assert.ok(crossesThreshold(report, 'warning'));
  assert.equal(crossesThreshold(report), false);
});
test('gating high findings does not fail a warnings-only report', () => {
  const report = analyzeDependencies({ dependencies: { a: '*' } }, null);
  assert.equal(crossesThreshold(report, 'high'), false);
  assert.equal(crossesThreshold(report, 'warning'), true);
});
test('supports npm lockfile v2 and does not require integrity for bundled or linked packages', () => {
  const report = analyzeDependencies({}, { lockfileVersion: 2, packages: {
    '': {}, 'node_modules/a': { inBundle: true, resolved: 'https://example.invalid/a' },
    'node_modules/b': { link: true, resolved: '../b' },
  } });
  assert.deepEqual(report.findings, []);
});
test('findings have stable order and do not mutate inputs', () => {
  const manifest = { dependencies: { b: '*', a: '^1' } };
  const snapshot = JSON.stringify(manifest);
  const one = analyzeDependencies(manifest, null);
  const two = analyzeDependencies({ dependencies: { a: '^1', b: '*' } }, null);
  assert.deepEqual(one, two);
  assert.equal(JSON.stringify(manifest), snapshot);
});
for (const [manifest, npmLock] of [
  [{ dependencies: [] }, null], [{ dependencies: { a: 42 } }, null],
  [{ dependencies: { 'bad name': '1.0.0' } }, null], [{ scripts: [] }, null],
  [{ scripts: { install: 1 } }, null], [{}, { lockfileVersion: 1 }],
  [{}, { lockfileVersion: 3, packages: [] }], [{}, lock({ 'node_modules/a': null })],
  [{}, lock({ 'node_modules/a': { integrity: true } })],
  [{}, lock({ 'node_modules/a': { hasInstallScript: 'yes' } })],
]) {
  test(`rejects malformed dependency input ${JSON.stringify([manifest, npmLock])}`, () => {
    assert.throws(() => analyzeDependencies(manifest, npmLock));
  });
}
