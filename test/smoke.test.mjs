import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { GitRepository } from '../dist/index.js';

const cli = resolve('dist/cli.js');
const cleanEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8', env: cleanEnv, windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function run(repo, ...args) {
  return spawnSync(process.execPath, [cli, ...args, '--repo', repo], { encoding: 'utf8', env: cleanEnv, windowsHide: true, timeout: 15000 });
}
function json(repo, ...args) {
  const result = run(repo, ...args, '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('end-to-end: changelog, diverged PR, deps, output safety, invalid inputs', async t => {
  const parent = mkdtempSync(join(tmpdir(), 'repobrief smoke '));
  const repo = join(parent, '项目 with spaces');
  mkdirSync(repo);
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'RepoBrief Test');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  writeFileSync(join(repo, 'hello.txt'), 'initial\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'chore: initial');
  git(repo, 'tag', 'v0.0.0');
  const initial = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'switch', '-c', 'feature');
  writeFileSync(join(repo, 'new file.txt'), 'new\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'feat(api)!: add output', '-m', 'BREAKING CHANGE: use the new output format');
  writeFileSync(join(repo, 'hello.txt'), 'fixed\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'fix: handle spaces');
  const featureTip = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'switch', 'main');
  writeFileSync(join(repo, 'main-only.txt'), 'independent base change\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'docs: main-only change');

  await t.test('changelog range excludes the start, preserves order, handles breaking changes', () => {
    const report = json(repo, 'changelog', '--from', 'v0.0.0', '--to', 'feature');
    assert.equal(report.commits.length, 2);
    assert.equal(report.commits[0].type, 'fix');
    assert.equal(report.commits[1].breaking, true);
    assert.equal(report.from, initial);
    const text = run(repo, 'changelog', '--from', 'v0.0.0', '--to', 'feature');
    assert.equal(text.status, 0, text.stderr);
    assert.match(text.stdout, /## Features/);
    assert.match(text.stdout, /## Fixes/);
    assert.match(text.stdout, /## Breaking changes/);
    assert.equal(json(repo, 'changelog', '--from', 'feature', '--to', 'feature').commits.length, 0);
  });
  await t.test('PR compares the merge base rather than the diverged base tip', () => {
    const report = json(repo, 'pr', '--base', 'main', '--to', 'feature');
    assert.equal(report.mergeBase, initial);
    assert.equal(report.to, featureTip);
    assert.equal(report.commits.length, 2);
    assert.deepEqual(report.files.map(file => file.path), ['hello.txt', 'new file.txt']);
    assert.ok(!report.files.some(file => file.path === 'main-only.txt'));
    assert.match(run(repo, 'pr', '--base', 'main', '--to', 'feature').stdout, /Verification checklist/);
  });
  await t.test('history works when --repo points to a subdirectory', () => {
    const nested = join(repo, 'nested');
    mkdirSync(nested);
    assert.equal(json(nested, 'changelog', '--to', 'feature').commits.length, 3);
  });
  await t.test('dependency report runs without Git, gates findings, and never executes scripts', () => {
    const directory = join(parent, 'not a git repo');
    mkdirSync(directory);
    writeFileSync(join(directory, 'package.json'), JSON.stringify({
      name: 'fixture', dependencies: { example: '^1.0.0' }, scripts: { install: 'must-not-run' },
    }));
    const result = run(directory, 'deps', '--format', 'json', '--fail-on', 'high');
    assert.equal(result.status, 2, result.stderr);
    assert.equal(JSON.parse(result.stdout).summary.high, 1);
    assert.equal(run(directory, 'deps').status, 0);
    assert.equal(run(directory, 'changelog').status, 1);
    writeFileSync(join(directory, 'package-lock.json'), '{not json: example-secret}');
    const invalid = run(directory, 'deps');
    assert.equal(invalid.status, 1);
    assert.doesNotMatch(invalid.stderr, /example-secret/);
  });
  await t.test('rejects option-like revisions and treats shell syntax as data', () => {
    const reader = new GitRepository(repo);
    assert.throws(() => reader.resolveRevision('--output=evil'));
    assert.throws(() => reader.resolveRevision('HEAD\n--all'));
    for (const revision of ['HEAD;echo injected', '$(echo injected)', 'nonexistent']) {
      const result = run(repo, 'changelog', '--to', revision);
      assert.equal(result.status, 1);
      assert.doesNotMatch(result.stdout + result.stderr, /injected/);
    }
  });
  await t.test('does not silently truncate commit history', () => {
    const result = run(repo, 'changelog', '--to', 'feature', '--limit', '1');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /exceeds --limit/);
  });
  await t.test('writes new output and refuses to replace an existing file', () => {
    const output = join(parent, 'report with spaces.md');
    assert.equal(run(repo, 'pr', '--to', 'feature', '--output', output).status, 0);
    const first = readFileSync(output, 'utf8');
    assert.match(first, /# Pull request/);
    const result = run(repo, 'changelog', '--output', output);
    assert.equal(result.status, 1);
    assert.equal(readFileSync(output, 'utf8'), first);
  });
  await t.test('rejects malformed JSON shapes and oversized input', () => {
    writeFileSync(join(repo, 'package.json'), '[]');
    assert.equal(run(repo, 'deps').status, 1);
    writeFileSync(join(repo, 'package.json'), ' '.repeat(16 * 1024 * 1024 + 1));
    assert.match(run(repo, 'deps').stderr, /16 MiB/);
  });
});

test('CLI help and version do not require a Git repository', () => {
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /RepoBrief/);
  const version = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8' });
  assert.equal(version.stdout, '0.1.0\n');
});
