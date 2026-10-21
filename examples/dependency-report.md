# Dependency configuration report

Project: repobrief\-risk\-demo

2 direct dependencies; 0 locked package entries.

High: 1 · Warning: 3

Offline configuration heuristics only. No vulnerability database was queried; no findings does not mean secure. Peer version ranges are intentionally excluded.

## HIGH: INSTALL_SCRIPT

**\(root\)** — package\.json:scripts\.postinstall

A root lifecycle script can execute during package installation.

Action: Review the script and use npm ci --ignore-scripts when installation scripts are unnecessary.

## WARNING: LOCAL_SOURCE

**example\-workspace** — package\.json:dependencies

Dependency resolves from a local path or workspace.

Action: Confirm the referenced source is available and reviewed in each build environment.

## WARNING: MISSING_LOCKFILE

**\(root\)** — package\-lock\.json

No npm lockfile was found; transitive dependencies could not be inspected.

Action: Generate and review an npm v2/v3 lockfile, then commit it.

## WARNING: UNPINNED_VERSION

**example\-range** — package\.json:dependencies

Direct dependency is not pinned to an exact version.

Action: Use an exact reviewed version and commit package-lock.json. Ranges may be intentional.
