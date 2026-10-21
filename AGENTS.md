# Working on RepoBrief

## Scope and setup

Read `docs/spec.md` and the relevant source before changing behavior. Node.js 22+
and Git are required. Install with `npm ci --ignore-scripts`. Keep runtime npm
dependencies at zero; use Node built-ins and strict TypeScript. Pin development
dependencies exactly and retain lockfile integrity metadata.

## Implementation and review

- Keep CLI parsing, Git I/O, npm analysis, rendering, and output I/O separate.
- Pass Git arguments as arrays with `shell: false`. Resolve revisions first;
  preserve process timeout/output caps and the disabled-network environment.
- Treat repository text as untrusted data. Preserve control stripping, Markdown
  escaping, and omission of dependency sources and script bodies from reports.
- Never execute inspected package scripts, fetch objects, modify the target repo,
  overwrite output, or imply a configuration check is a vulnerability verdict.
- For a reported bug, add a focused behavioral regression test; use the real Git
  fixture when revision semantics or process behavior are involved.
- Review public CLI flags, JSON schema, Windows paths, empty history, and merge
  bases for compatibility. The generated verification checklist stays unchecked.
- Do not infer that a static security scan proves absence of vulnerabilities.

## Required checks

```sh
npm test
npm run build
npm run check:security
npm run check:package
```

Check `git diff --check`, inspect the staged diff for private data, and keep
commits focused. Use Conventional Commit subjects. Update README and spec for
changed behavior. GitHub CI must complete on all six matrix jobs for a release.

## Release

1. Confirm the user requested release/publishing. A draft and a public repository
   are external changes; authorization to implement alone does not imply either.
2. Update `package.json`, lockfile, `src/cli.ts` version, matching tests, and
   `docs/releases/vX.Y.Z.md`. Run the required checks from a clean install.
3. Commit the release changes; create an annotated `vX.Y.Z` tag at that commit.
4. With a working `gh` session, run `./scripts/publish.ps1` from PowerShell.
   The script creates a public repository only when no origin exists, validates
   an existing origin, pushes all local branches/tags, verifies CI at HEAD, and
   creates a draft release with the npm tarball.
5. Keep the release as a draft unless publishing it is also requested. Do not
   publish to npm as part of this workflow.
6. If authentication or connectivity fails, preserve local work and report the
   exact uncompleted steps. Never request, print, or commit an access token.
