# Executable dependency example

From the RepoBrief root after building:

```sh
node dist/cli.js deps --repo examples
node dist/cli.js deps --repo examples --format json
```

Do **not** run `npm install` inside this directory. Its fictional dependencies and
harmless lifecycle command are input data for the report. RepoBrief only reads it.

Expected: one high finding (`INSTALL_SCRIPT`) and three warnings (`LOCAL_SOURCE`,
`MISSING_LOCKFILE`, `UNPINNED_VERSION`). The generated `dependency-report.md` is
committed so the example can be inspected without installing anything.
