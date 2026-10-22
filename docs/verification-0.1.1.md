# v0.1.1 verification

Date: 2026-10-23 (Asia/Shanghai). Local platform: Windows, Node.js v24.18.0.

- The new repository-selection regression failed against v0.1.0.
- All 53 tests passed after the fix, including a real linked worktree and a
  conflicting inherited Git environment. POSIX CI also exercises a trailing-space
  repository path, which Windows does not support in the same way.
- Strict TypeScript build, static security checks and offline packed-CLI
  installation passed. Existing CLI/JSON behavior stays compatible.
- The checkout v7.0.1 and setup-node v7.1.0 pins match upstream GitHub commits;
  their original Dependabot PRs also had passing checks before integration.
- @types/node stays on the supported Node 22 baseline. Major type-definition
  updates are ignored until the supported runtime floor is deliberately changed.

Hosted six-job CI is the release gate. See the maintenance PR and Actions for
the current remote result; local checks alone establish Windows/Node 24 behavior.
