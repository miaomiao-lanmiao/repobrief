import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'repobrief package '));
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run this script with npm run check:package.');
function runNpm(args, cwd) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    cwd, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60000,
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
try {
  runNpm(['pack', '--ignore-scripts', '--pack-destination', directory], root);
  const archive = join(directory, readdirSync(directory).find(file => file.endsWith('.tgz')));
  runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', directory, archive], directory);
  const packageRoot = join(directory, 'node_modules', 'repobrief-cli');
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.version, '0.1.0');
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  assert.ok(!readdirSync(packageRoot).includes('test'));
  const cli = resolve(packageRoot, 'dist/cli.js');
  const version = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8' });
  assert.equal(version.status, 0);
  assert.equal(version.stdout, `${manifest.version}\n`);
  const deps = spawnSync(process.execPath, [cli, 'deps', '--repo', root, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(deps.status, 0, deps.stderr);
  assert.equal(JSON.parse(deps.stdout).kind, 'deps');
  const changelog = spawnSync(process.execPath, [cli, 'changelog', '--repo', root, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(changelog.status, 0, changelog.stderr);
  assert.ok(JSON.parse(changelog.stdout).commits.length > 0);
  // Invoke npm's installed bin shim as users do, including executable-mode checks.
  const bin = join(directory, 'node_modules', '.bin', process.platform === 'win32' ? 'repobrief.cmd' : 'repobrief');
  const installed = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'repobrief.cmd --help'], {
      cwd: join(directory, 'node_modules', '.bin'), encoding: 'utf8', windowsHide: true,
    })
    : spawnSync(bin, ['--help'], { encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stderr);
  assert.match(installed.stdout, /RepoBrief/);
  console.log('Packaged CLI installed offline and passed version, help, changelog, and dependency checks.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
