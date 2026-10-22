#!/usr/bin/env node
import { parseArgs } from './args.js';
import { inspectDependencies, crossesThreshold } from './dependencies.js';
import { UserError } from './errors.js';
import { GitRepository } from './git.js';
import { writeReport } from './io.js';
import { renderReport, type Report } from './render.js';

const help = `RepoBrief — local repository reports, no network calls

Usage:
  repobrief changelog [--from REV] [--to REV] [--limit N]
  repobrief deps [--fail-on warning|high]
  repobrief pr [--base REV] [--to REV] [--limit N]

Shared options:
  --repo PATH             Repository/directory (default: current directory)
  --format markdown|json  Output format (default: markdown)
  --output PATH           Create a new file; never overwrite
  --help                  Show this help
  --version               Show the version

History defaults: --to HEAD, --limit 1000 (max 10000), PR --base main.
Changelog --from is exclusive; omitted means all reachable history.
PR compares merge-base(base, to)..to. No fetch is performed.
Exit codes: 0 success, 1 input/runtime error, 2 dependency threshold crossed.
Dependency findings are configuration heuristics, not CVE results.
`;

process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0);
  process.stderr.write('repobrief: Unable to write output.\n');
  process.exit(1);
});

try {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    process.stdout.write(help);
  } else if (args.length === 1 && args[0] === '--version') {
    process.stdout.write('0.1.1\n');
  } else {
    const options = parseArgs(args);
    let report: Report;
    if (options.command === 'deps') {
      report = inspectDependencies(options.repo);
    } else {
      const repo = new GitRepository(options.repo);
      report = options.command === 'pr'
        ? repo.pr(options.base ?? 'main', options.to, options.limit)
        : repo.changelog(options.from, options.to, options.limit);
    }
    writeReport(renderReport(report, options.format), options.output);
    if (report.kind === 'deps' && crossesThreshold(report, options.failOn)) process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(`repobrief: ${error instanceof UserError ? error.message : 'Unexpected failure. Check file permissions and repository state.'}\n`);
  process.exitCode = 1;
}
