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

function breakingNotesFrom(body: string): string[] {
  const notes: string[] = [];
  let current: string[] | undefined;
  const finish = (): void => {
    if (current) {
      const note = cleanText(current.join('\n'));
      if (note) notes.push(note);
    }
    current = undefined;
  };
  for (const line of body.split(/\r?\n/)) {
    const breaking = /^BREAKING[ -]CHANGE:[ \t]*(.*)$/.exec(line);
    if (breaking) {
      finish();
      current = [breaking[1]!];
    } else if (/^[A-Za-z0-9][A-Za-z0-9_-]*(?::[ \t]+|[ \t]+#)/.test(line)) {
      finish();
    } else if (current) {
      current.push(line);
    }
  }
  finish();
  return notes;
}

export function parseCommit(hash: string, subject: string, body: string): Commit {
  const match = /^([a-z][a-z0-9-]*)(?:\(([^)\r\n]+)\))?(!)?:\s+(.+)$/i.exec(subject);
  const breakingNotes = breakingNotesFrom(body);
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
