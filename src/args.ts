import { resolve } from 'node:path';
import { UserError } from './errors.js';

export interface Options {
  command: 'changelog' | 'deps' | 'pr';
  repo: string;
  format: 'markdown' | 'json';
  to: string;
  limit: number;
  from?: string;
  base?: string;
  output?: string;
  failOn?: 'warning' | 'high';
}

const flags = new Set(['repo', 'format', 'from', 'to', 'base', 'output', 'limit', 'fail-on']);

export function parseArgs(args: string[], cwd = process.cwd()): Options {
  const command = args[0];
  if (command !== 'changelog' && command !== 'deps' && command !== 'pr') {
    throw new UserError('Choose a command: changelog, deps, or pr. Use --help for examples.');
  }
  const values = new Map<string, string>();
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const name = flag?.startsWith('--') ? flag.slice(2) : '';
    const value = args[i + 1];
    if (!flags.has(name)) throw new UserError('Unknown option. Use --help for supported options.');
    if (values.has(name)) throw new UserError(`Duplicate option --${name}.`);
    if (!value || value.startsWith('--') || /[\x00-\x1f\x7f]/.test(value)) {
      throw new UserError(`--${name} requires a nonempty value without control characters.`);
    }
    values.set(name, value);
  }
  const allowed = new Set(['repo', 'format', 'output', ...(command === 'deps'
    ? ['fail-on'] : command === 'pr' ? ['to', 'base', 'limit'] : ['to', 'from', 'limit'])]);
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new UserError(`--${name} is not supported by ${command}.`);
  }
  const format = values.get('format') ?? 'markdown';
  if (format !== 'markdown' && format !== 'json') throw new UserError('--format must be markdown or json.');
  const rawLimit = values.get('limit') ?? '1000';
  const limit = Number(rawLimit);
  if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 10000) {
    throw new UserError('--limit must be an integer from 1 to 10000.');
  }
  const failOn = values.get('fail-on');
  if (failOn !== undefined && failOn !== 'warning' && failOn !== 'high') {
    throw new UserError('--fail-on must be warning or high.');
  }
  const options: Options = {
    command, repo: resolve(cwd, values.get('repo') ?? '.'), format,
    to: values.get('to') ?? 'HEAD', limit,
  };
  if (values.has('from')) options.from = values.get('from')!;
  if (values.has('base')) options.base = values.get('base')!;
  if (values.has('output')) options.output = resolve(cwd, values.get('output')!);
  if (failOn) options.failOn = failOn;
  return options;
}
