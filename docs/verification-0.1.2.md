# v0.1.2 verification

Date: 2026-11-09 (Asia/Shanghai). Local platform: Windows, Node.js v26.13.0,
npm 11.20.0.

## Reproduction

Three new unit tests and the real-Git changelog assertion failed on the prior
implementation: only the first line of a breaking-change footer was retained.
The synthetic fixtures cover continuation paragraphs, colon/hash footer
separators, CRLF, and multiple breaking-change entries. Their repaired outputs
retain the migration text and exclude following reference/reviewer trailers.

A compatibility regression failed before the footer matcher was corrected. It
confirms that U+2028, U+2029 and an embedded carriage return in a footer value
normalize to spaces without losing the breaking-change classification.

The parser follows the continuation rule in
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
Whitespace is normalized for display; this update does not add rich formatting
or change the JSON schema.

## Local gates

- `npm ci --ignore-scripts`: passed from a clean dependency install.
- `npm test`: 57 passed, 0 failed, including real Git CLI smoke tests.
- `npm run build`: passed.
- `npm run check:security`: passed for the 10 runtime modules and lockfile.
- `npm run check:package`: the packed CLI installed offline and its actual
  installed command passed version/help/changelog/dependency checks.
- `git diff --check`: passed.

Hosted Windows/Linux/macOS checks with Node.js 22 and 24 remain the release gate.
This local record alone does not establish the result of a hosted run.
