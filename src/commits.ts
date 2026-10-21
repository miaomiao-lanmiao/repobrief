import { cleanText } from './safe.js';

export interface Commit {
  hash: string;
  subject: string;
  type: string;
  scope: string | null;
  description: string;
  breaking: boolean;
  breakingNotes: string[];
}

export function parseCommit(hash: string, subject: string, body: string): Commit {
  const match = /^([a-z][a-z0-9-]*)(?:\(([^)\r\n]+)\))?(!)?:\s+(.+)$/i.exec(subject);
  const breakingNotes = body.split(/\r?\n/)
    .filter(line => /^BREAKING[ -]CHANGE:\s*/.test(line))
    .map(line => cleanText(line.replace(/^BREAKING[ -]CHANGE:\s*/, '')))
    .filter(Boolean);
  return {
    hash, subject: cleanText(subject), type: match?.[1]?.toLowerCase() ?? 'other',
    scope: match?.[2] ? cleanText(match[2]) : null,
    description: cleanText(match?.[4] ?? subject),
    breaking: Boolean(match?.[3]) || breakingNotes.length > 0, breakingNotes,
  };
}

export function groupCommits(commits: Commit[]): Record<string, Commit[]> {
  const groups: Record<string, Commit[]> = Object.create(null) as Record<string, Commit[]>;
  for (const commit of commits) (groups[commit.type] ??= []).push(commit);
  return groups;
}
