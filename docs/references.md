# Technical references

These primary references informed the implementation. They are documentation,
not runtime dependencies or services called by RepoBrief.

- [Node.js child processes](https://nodejs.org/api/child_process.html): argument
  arrays, shell behavior, timeouts, and output bounds.
- [npm package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/):
  lockfile versions, package metadata, integrity and install-script markers.
- [Git environment and command options](https://git-scm.com/docs/git):
  `GIT_NO_LAZY_FETCH`, `GIT_ALLOW_PROTOCOL`, and optional locks.
- [Git merge-base](https://git-scm.com/docs/git-merge-base): branch comparison.
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
  type/scope/description and breaking-change markers.
- [actions/checkout](https://github.com/actions/checkout) and
  [actions/setup-node](https://github.com/actions/setup-node): CI jobs.

Action v6 tag commits were resolved with `git ls-remote` when authoring the
workflow. Dependabot checks pinned action and npm versions monthly.
