import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { parseArgs } from '../dist/index.js';

test('defaults and paths containing spaces', () => {
  const options = parseArgs(['pr', '--repo', 'my repo'], process.cwd());
  assert.equal(options.repo, resolve('my repo'));
  assert.equal(options.format, 'markdown');
  assert.equal(options.limit, 1000);
  assert.equal(options.to, 'HEAD');
});
test('accepts explicit range, JSON, and output', () => {
  const options = parseArgs(['changelog', '--from', 'v0.1', '--to', 'HEAD~1', '--format', 'json', '--output', 'out.md']);
  assert.equal(options.from, 'v0.1');
  assert.equal(options.to, 'HEAD~1');
  assert.equal(options.output, resolve('out.md'));
});
for (const args of [
  ['unknown'], ['deps', '--unknown', 'x'], ['deps', '--repo'],
  ['deps', '--repo', 'a', '--repo', 'b'], ['deps', '--format', 'xml'],
  ['deps', '--from', 'main'], ['pr', '--from', 'main'], ['changelog', '--base', 'main'],
  ['pr', '--limit', '0'], ['pr', '--limit', '10001'], ['pr', '--limit', '1.5'],
  ['pr', '--limit', '1e2'], ['pr', '--limit', 'NaN'], ['deps', '--fail-on', 'low'],
  ['changelog', '--fail-on', 'warning'], ['deps', '--repo', 'bad\x00path'],
]) {
  test(`rejects invalid arguments ${JSON.stringify(args)}`, () => assert.throws(() => parseArgs(args)));
}
