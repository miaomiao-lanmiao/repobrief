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

The initial direct `gh` connection failed with resets/timeouts and reported an
invalid login. On resumption, the existing Windows system proxy restored API
access and authenticated account `miaomiao-lanmiao` successfully. The saved
credential was valid; the direct network route was the blocker. No token was
read, displayed or modified. The publishing script now reuses that proxy when
no proxy environment variables have already been configured.

The original delivery had no public repository, push, remote CI or release draft.
The resumed publishing script checks the six-job GitHub CI at HEAD before creating
a release draft. Consult the repository's Actions and Releases pages for the live
remote result; local checks alone verify only Windows/Node 24.
