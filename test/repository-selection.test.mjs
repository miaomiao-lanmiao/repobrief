import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const cli = resolve('dist/cli.js');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, '-c', 'user.name=RepoBrief Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8', env, windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('explicit --repo overrides inherited Git repository selectors, including linked worktrees', t => {
  const temporary = mkdtempSync(join(tmpdir(), 'repobrief selection '));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const requested = join(temporary, process.platform === 'win32' ? 'requested' : 'requested ');
  const unrelated = join(temporary, 'unrelated');
  for (const [path, subject] of [[requested, 'feat: requested repository'], [unrelated, 'fix: unrelated repository']]) {
    mkdirSync(path); git(path, 'init', '-b', 'main'); git(path, 'commit', '--allow-empty', '-m', subject);
  }
  const expected = git(requested, 'rev-parse', 'HEAD');
  const linked = join(temporary, 'linked worktree');
  git(requested, 'worktree', 'add', '--detach', linked);
  for (const path of [requested, linked]) {
    const result = spawnSync(process.execPath, [cli, 'changelog', '--repo', path, '--format', 'json'], {
      encoding: 'utf8', windowsHide: true,
      env: { ...env, GIT_DIR: join(unrelated, '.git'), GIT_WORK_TREE: unrelated, GIT_COMMON_DIR: join(unrelated, '.git') },
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.to, expected);
    assert.equal(report.commits[0].subject, 'feat: requested repository');
  }
});
