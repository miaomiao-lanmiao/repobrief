import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { UserError } from './errors.js';
import { parseCommit, type Commit } from './commits.js';
import { cleanText } from './safe.js';

export interface ChangedFile { status: string; path: string; previousPath?: string }
export interface HistoryReport { kind: 'changelog'; from: string | null; to: string; commits: Commit[] }
export interface PrReport {
  kind: 'pr'; base: string; mergeBase: string; to: string;
  commits: Commit[]; files: ChangedFile[];
}

export class GitRepository {
  readonly root: string;

  constructor(path: string) {
    try { this.root = realpathSync(path); }
    catch { throw new UserError('Repository path does not exist or cannot be read.'); }
    if (this.run(['rev-parse', '--is-inside-work-tree']).trim() !== 'true') {
      throw new UserError('Expected a Git working tree.');
    }
    // Always report the whole repository even when invoked from a subdirectory.
    this.root = this.run(['rev-parse', '--show-toplevel']).trim();
  }

  private run(args: string[]): string {
    const result = spawnSync('git', ['--no-pager', '--no-replace-objects', '-C', this.root, ...args], {
      encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1' },
    });
    if (result.error || result.status !== 0) {
      // Git stderr can include private paths, credential URLs, or hostile revisions.
      throw new UserError('Git operation failed. Check Git installation, repository, revision, and available history (fetch shallow history explicitly if needed).');
    }
    return result.stdout;
  }

  resolveRevision(revision: string): string {
    if (!revision || revision.startsWith('-') || revision.length > 1024 || /[\x00-\x20\x7f]/.test(revision)) {
      throw new UserError('Invalid revision: use a commit, tag, or branch name without whitespace or leading dash.');
    }
    const hash = this.run(['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]).trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(hash)) throw new UserError('Revision did not resolve to a commit.');
    return hash;
  }

  private commits(from: string | null, to: string, limit: number): Commit[] {
    const raw = this.run(['log', '--no-show-signature', '--no-notes', '-z',
      '--format=%H%x00%s%x00%b', `--max-count=${limit + 1}`, from ? `${from}..${to}` : to, '--']);
    if (!raw) return [];
    const fields = raw.split('\0');
    if (fields.at(-1) === '') fields.pop();
    if (fields.length % 3 !== 0) throw new UserError('Unexpected Git log format.');
    const commits: Commit[] = [];
    for (let i = 0; i < fields.length; i += 3) {
      commits.push(parseCommit(fields[i]!, fields[i + 1]!, fields[i + 2]!));
    }
    if (commits.length > limit) throw new UserError(`History exceeds --limit ${limit}; increase it (maximum 10000) or narrow the range.`);
    return commits;
  }

  changelog(from: string | undefined, to: string, limit: number): HistoryReport {
    const end = this.resolveRevision(to);
    const start = from === undefined ? null : this.resolveRevision(from);
    return { kind: 'changelog', from: start, to: end, commits: this.commits(start, end, limit) };
  }

  pr(base: string, to: string, limit: number): PrReport {
    const baseHash = this.resolveRevision(base);
    const end = this.resolveRevision(to);
    const mergeBases = this.run(['merge-base', '--all', baseHash, end]).trim().split(/\r?\n/);
    if (mergeBases.length !== 1 || !mergeBases[0]) throw new UserError('A single common ancestor is required for the PR comparison.');
    const mergeBase = mergeBases[0];
    const fields = this.run(['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z',
      '--no-renames', mergeBase, end, '--']).split('\0');
    if (fields.at(-1) === '') fields.pop();
    if (fields.length % 2 !== 0) throw new UserError('Unexpected Git diff format.');
    const files: ChangedFile[] = [];
    for (let i = 0; i < fields.length; i += 2) {
      files.push({ status: fields[i]!, path: cleanText(fields[i + 1]!) });
    }
    return { kind: 'pr', base: baseHash, mergeBase, to: end,
      commits: this.commits(mergeBase, end, limit), files };
  }
}
