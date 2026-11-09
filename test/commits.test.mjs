import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanText, groupCommits, markdown, parseCommit, renderReport } from '../dist/index.js';

const hash = 'a'.repeat(40);
test('parses a scoped feature and a breaking footer', () => {
  const commit = parseCommit(hash, 'feat(api): add export', 'Details\n\nBREAKING CHANGE: use v2');
  assert.equal(commit.type, 'feat');
  assert.equal(commit.scope, 'api');
  assert.equal(commit.description, 'add export');
  assert.equal(commit.breaking, true);
  assert.deepEqual(commit.breakingNotes, ['use v2']);
});
test('recognizes exclamation breaking changes and hyphenated footers', () => {
  assert.equal(parseCommit(hash, 'fix!: change behavior', '').breaking, true);
  assert.equal(parseCommit(hash, 'ordinary', 'BREAKING-CHANGE: migrate').breaking, true);
});
test('preserves multiline and multi-paragraph breaking-change migration notes', () => {
  const commit = parseCommit(hash, 'feat(api): return structured results', [
    'Explain the implementation.', '',
    'BREAKING CHANGE: responses now return an object.',
    'Read the value from data.result.', '',
    'Update cached response schemas too.', '',
  ].join('\n'));
  assert.equal(commit.breaking, true);
  assert.deepEqual(commit.breakingNotes, [
    'responses now return an object. Read the value from data.result. Update cached response schemas too.',
  ]);
});
test('breaking-note continuation stops at either supported footer separator', () => {
  for (const trailer of ['Refs: #42', 'Refs #42', 'Reviewed-by: Example']) {
    const commit = parseCommit(hash, 'fix(api): change response',
      `BREAKING CHANGE: use the new response.\nUpdate callers before upgrading.\n\n${trailer}\nTrailer continuation.`);
    assert.deepEqual(commit.breakingNotes, ['use the new response. Update callers before upgrading.']);
  }
});
test('multiple breaking-change footers keep separate normalized notes', () => {
  const commit = parseCommit(hash, 'feat(api): change contracts', [
    'BREAKING CHANGE: remove the old response.', 'Use the new envelope.', '',
    'Reviewed-by: Example', '', 'BREAKING-CHANGE: rename the old option.',
    'Pass the replacement flag.', 'Refs: #42',
  ].join('\r\n'));
  assert.deepEqual(commit.breakingNotes, [
    'remove the old response. Use the new envelope.',
    'rename the old option. Pass the replacement flag.',
  ]);
});
test('ordinary commits preserve their description', () => {
  const commit = parseCommit(hash, 'Fix an edge case', '');
  assert.equal(commit.type, 'other');
  assert.equal(commit.description, 'Fix an edge case');
});
test('unknown types do not collide with object properties', () => {
  const commit = parseCommit(hash, 'constructor: safe custom type', '');
  const groups = groupCommits([commit]);
  assert.deepEqual(groups.constructor, [commit]);
  const text = renderReport({ kind: 'changelog', from: null, to: hash, commits: [commit] }, 'markdown');
  assert.match(text, /## constructor/);
  assert.doesNotMatch(text, /function Object/);
});
test('strips terminal escapes, control bytes, and direction overrides', () => {
  assert.equal(cleanText('\x1b[31mred\x1b[0m\n\u202esafe'), 'red safe');
  assert.equal(cleanText('one\x1b]8;;https://example.invalid\x07two\x1b]8;;\x07'), 'onetwo');
});
test('escapes links, images, and raw HTML in Markdown', () => {
  const value = markdown('![click](https://example.invalid) <script> & x|y');
  assert.ok(value.includes('\\!\\[click\\]\\('));
  assert.ok(value.includes('&lt;script&gt;'));
  assert.ok(value.includes('x\\|y'));
});
test('renders empty history and versioned JSON', () => {
  const report = { kind: 'changelog', from: hash, to: hash, commits: [] };
  assert.match(renderReport(report, 'markdown'), /No commits in this range/);
  assert.equal(JSON.parse(renderReport(report, 'json')).schemaVersion, 1);
});
