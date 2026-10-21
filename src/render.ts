import { groupCommits, type Commit } from './commits.js';
import type { DependencyReport } from './dependencies.js';
import type { HistoryReport, PrReport } from './git.js';
import { markdown } from './safe.js';

export type Report = HistoryReport | PrReport | DependencyReport;
const labels: Record<string, string> = Object.assign(Object.create(null) as Record<string, string>, {
  feat: 'Features', fix: 'Fixes', perf: 'Performance', docs: 'Documentation',
  refactor: 'Refactoring', test: 'Tests', build: 'Build', ci: 'CI', chore: 'Maintenance',
  revert: 'Reverts', style: 'Style', other: 'Other changes',
});
function commitLine(commit: Commit): string {
  const scope = commit.scope ? `**${markdown(commit.scope)}:** ` : '';
  return `- ${scope}${markdown(commit.description)} (${commit.hash.slice(0, 7)})${commit.breaking ? ' **BREAKING**' : ''}`;
}
function commitSections(commits: Commit[]): string[] {
  const lines: string[] = [];
  const groups = groupCommits(commits);
  const order = [...Object.keys(labels), ...Object.keys(groups).filter(type => !(type in labels)).sort()];
  for (const type of order) {
    const group = groups[type];
    if (!group?.length) continue;
    lines.push(`## ${labels[type] ?? markdown(type)}`, '', ...group.map(commitLine), '');
  }
  if (commits.length === 0) lines.push('No commits in this range.', '');
  const breaking = commits.filter(commit => commit.breaking);
  if (breaking.length) {
    lines.push('## Breaking changes', '');
    for (const commit of breaking) {
      lines.push(...(commit.breakingNotes.length ? commit.breakingNotes.map(note => `- ${markdown(note)} (${commit.hash.slice(0, 7)})`) : [commitLine(commit)]));
    }
    lines.push('');
  }
  return lines;
}

export function renderReport(report: Report, format: 'markdown' | 'json'): string {
  if (format === 'json') return `${JSON.stringify({ schemaVersion: 1, ...report }, null, 2)}\n`;
  let lines: string[];
  if (report.kind === 'changelog') {
    lines = ['# Changelog', '', `Range: ${report.from?.slice(0, 7) ?? '(root)'} → ${report.to.slice(0, 7)}`, '', ...commitSections(report.commits)];
  } else if (report.kind === 'pr') {
    lines = ['# Pull request', '', '## Summary', '',
      `${report.commits.length} commit(s), ${report.files.length} changed file(s).`, '',
      `Comparison: merge base ${report.mergeBase.slice(0, 7)} → ${report.to.slice(0, 7)}`, '',
      ...commitSections(report.commits), '## Changed files', '',
      ...(report.files.length ? report.files.map(file => `- **${markdown(file.status)}** ${markdown(file.path)}`) : ['No changed files.']), '',
      '## Verification checklist', '', '- [ ] Describe the problem and intended behavior.',
      '- [ ] Run relevant tests and record the results.', '- [ ] Review compatibility and migration requirements.',
      '- [ ] Review generated text before sharing.', ''];
  } else {
    lines = ['# Dependency configuration report', '', `Project: ${markdown(report.project)}`, '',
      `${report.directDependencies} direct dependencies; ${report.lockedPackages} locked package entries.`, '',
      `High: ${report.summary.high} · Warning: ${report.summary.warning}`, '', report.disclaimer, ''];
    if (!report.findings.length) lines.push('No configuration findings.', '');
    for (const finding of report.findings) {
      lines.push(`## ${finding.severity.toUpperCase()}: ${finding.code}`, '',
        `**${markdown(finding.package)}** — ${markdown(finding.location)}`, '',
        finding.message, '', `Action: ${finding.remediation}`, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
