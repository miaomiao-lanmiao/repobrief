import { closeSync, constants, fstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { UserError } from './errors.js';

export type JsonObject = Record<string, unknown>;
export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJson(path: string, optional = false): JsonObject | null {
  let descriptor: number;
  try { descriptor = openSync(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0)); }
  catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new UserError('Cannot read package.json or package-lock.json.');
  }
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > 16 * 1024 * 1024) {
      throw new UserError('JSON input must be a regular file no larger than 16 MiB.');
    }
    const value: unknown = JSON.parse(readFileSync(descriptor, 'utf8').replace(/^\uFEFF/, ''));
    if (!isObject(value)) throw new UserError('JSON input must contain an object.');
    return value;
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError('Invalid JSON in package.json or package-lock.json.');
  } finally { closeSync(descriptor); }
}

export function writeReport(content: string, output?: string): void {
  if (output === undefined) { process.stdout.write(content); return; }
  try { writeFileSync(output, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 }); }
  catch { throw new UserError('Cannot create output file. It may already exist or its parent directory may be missing.'); }
}
