# RepoBrief specification

Status: v0.1.0 scope, 2026-10-22.

## Problem and audience

Maintainers of small Git repositories repeatedly turn commit history into release
notes and pull request descriptions. JavaScript maintainers also need an honest,
offline view of dependency configuration risks without uploading repository data.
RepoBrief is a local CLI for these tasks, with zero runtime npm dependencies.

## Commands

- `repobrief changelog`: group Conventional Commits and ordinary commits into
  Markdown release notes. `--from` is exclusive; `--to` defaults to `HEAD`.
  Without `--from`, include all reachable history.
- `repobrief deps`: inspect the root `package.json` and optional npm lockfile v2/v3
  for risky sources, non-exact direct versions, install lifecycle scripts,
  missing integrity, insecure transports, and duplicate locked versions.
  Findings are configuration heuristics, never vulnerability verdicts.
- `repobrief pr --base main`: compare the merge base of `--base` and `--to`
  (default `HEAD`) with the selected tip. Include commits, changed files,
  breaking changes, and a human verification checklist.
- Shared options: `--repo PATH`, `--format markdown|json`, `--output PATH`.
  History commands accept `--limit N` (default 1000, maximum 10000).
  `deps --fail-on warning|high` provides an optional CI gate.
- Output defaults to stdout. Explicit file output never overwrites an existing
  file. Errors exit 1, findings crossing the requested gate exit 2, success exits 0.

## Boundaries

- Node.js 22+ and a local Git executable; Windows, Linux, and macOS.
- No runtime network access, AI APIs, telemetry, package installation, Git hooks,
  writes to the analyzed repository, or execution of package scripts.
- No CVE database, vulnerability guarantee, license verdict, credential scanner,
  monorepo traversal, lockfile v1, Yarn/pnpm lockfiles, or automated publishing.
- The CLI trusts the installed Git executable and local Git configuration.
  Child processes use argument arrays with the shell disabled; revisions are
  resolved to commit IDs before history/diff operations.
- Metadata is untrusted display content: strip terminal controls, escape Markdown,
  redact credential-bearing dependency sources, and bound input sizes.
- Output may contain project names, filenames, and commit text; users review
  generated documents before sharing them.

## Acceptance criteria

1. In a temporary Git repository, changelog groups features, fixes, ordinary and
   breaking commits correctly, honors a revision range, and emits valid JSON.
2. Fixture manifests and npm lockfiles produce deterministic, actionable findings;
   local/workspace references are identified without claiming a vulnerability.
   Invalid/missing/unsupported input fails clearly without disclosing its content.
3. An end-to-end test runs every installed CLI command against a real Git fixture,
   verifies merge-base PR behavior and paths containing spaces, and confirms the
   optional dependency gate's exit status. Hostile revisions cannot become options
   or shell commands; existing output files remain intact.
4. `npm ci --ignore-scripts`, `npm test`, `npm run build`, and the documented source
   quickstart succeed. GitHub Actions runs the same gates on Windows, Linux, and
   macOS with Node.js 22 and 24; the packaged CLI is exercised on every matrix job.
5. The repository includes bilingual README, executable examples, MIT license,
   contributor/review/release instructions, issue forms, a 90-day maintenance plan,
   and release notes. The first commit contains this specification; later commits
   group implementation, tests, and documentation. Public push, tag, and GitHub
   draft release are attempted only with a working authenticated `gh` session;
   otherwise a resumable publishing script and an explicit blocker are delivered.
