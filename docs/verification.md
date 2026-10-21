# Verification record

Date: 2026-10-22 (Asia/Shanghai).

## Executed locally

Environment: Windows, Node.js v24.18.0, npm 11.16.0,
Git 2.53.0.windows.2. The first commit contains only `docs/spec.md`.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Passed from a clean dependency install |
| `npm test` | 52 passed, 0 failed; includes real Git end-to-end tests |
| `npm run build` | Passed |
| `npm run check:security` | Passed for 10 runtime modules and npm lockfile |
| `npm run check:package` | Passed: offline tarball install, actual installed bin shim, help/version/changelog/deps |
| `npm audit --json` | 0 reported vulnerabilities at verification time; not a guarantee |
| PowerShell publishing script | Parsed successfully; attempted execution stopped on GitHub API timeout before any remote mutation |
| README quickstart | Build, help, changelog, JSON deps, PR and tests exercised locally |

Security checks inspect disallowed dynamic execution/network patterns, shell
configuration, exact development dependency pins, expected registry origins,
lock integrity, and install-script markers. Behavioral tests cover hostile
revision arguments, Markdown/terminal escaping, redaction of source credentials,
oversized JSON, merge-base semantics and refusal to overwrite output.

## Remote work pending

The installed `gh` reports its saved GitHub account as invalid. API calls also
failed with connection resets and timeouts, so the credential's actual validity
could not be confirmed independently. No token was read, displayed or modified.

No public repository URL, push, GitHub Actions run, or GitHub release draft has
been confirmed. The six-job CI workflow is configured; only Windows/Node 24 was
executed locally. Versioned release notes and a resumable publishing script are
provided. Restore GitHub connectivity/authentication and run `scripts/publish.ps1`
to finish public repository creation, all-branch/tag push, remote CI, and the draft.
