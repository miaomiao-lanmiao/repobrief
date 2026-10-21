import { resolve } from 'node:path';
import { UserError } from './errors.js';
import { isObject, readJson, type JsonObject } from './io.js';
import { cleanText } from './safe.js';

export type Severity = 'warning' | 'high';
export interface Finding {
  code: string; severity: Severity; package: string; location: string;
  message: string; remediation: string;
}
export interface DependencyReport {
  kind: 'deps'; project: string; directDependencies: number; lockedPackages: number;
  lockfileVersion: number | null;
  summary: { high: number; warning: number };
  findings: Finding[];
  disclaimer: string;
}

const sections = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const packageName = /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i;
const exactVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;
const lexical = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

function sourceKind(value: string): 'local' | 'insecure' | 'remote' | 'registry' {
  if (value.startsWith('npm:')) return 'registry';
  if (/^(?:file:|link:|workspace:|\.\.?[/\\]|[/\\]|[a-z]:[/\\])/i.test(value)) return 'local';
  if (/^(?:http:|git:\/\/)/i.test(value)) return 'insecure';
  if (/^(?:git\+|git:|https:|ssh:|git@|github:|gitlab:|bitbucket:)/i.test(value)
      || /^[^\s/]+\/[^\s/]+(?:#.*)?$/.test(value)) return 'remote';
  return 'registry';
}

function validateSections(manifest: JsonObject): void {
  for (const section of [...sections, 'peerDependencies']) {
    const dependencies = manifest[section];
    if (dependencies === undefined) continue;
    if (!isObject(dependencies)) throw new UserError(`package.json ${section} must be an object.`);
    for (const [name, value] of Object.entries(dependencies)) {
      if (!packageName.test(name) || typeof value !== 'string' || !value.trim()) {
        throw new UserError(`package.json ${section} contains an invalid package name or version.`);
      }
    }
  }
}

export function analyzeDependencies(manifest: JsonObject, lock: JsonObject | null): DependencyReport {
  validateSections(manifest);
  const findings: Finding[] = [];
  const add = (code: string, severity: Severity, name: string, location: string, message: string, remediation: string): void => {
    findings.push({ code, severity, package: cleanText(name), location: cleanText(location), message, remediation });
  };
  const direct = new Set<string>();
  for (const section of sections) {
    const dependencies = manifest[section] as JsonObject | undefined;
    for (const [name, raw] of Object.entries(dependencies ?? {})) {
      direct.add(name);
      const value = (raw as string).trim();
      const location = `package.json:${section}`;
      const kind = sourceKind(value);
      if (kind === 'local') {
        add('LOCAL_SOURCE', 'warning', name, location, 'Dependency resolves from a local path or workspace.',
          'Confirm the referenced source is available and reviewed in each build environment.');
      } else if (kind === 'insecure') {
        add('INSECURE_SOURCE', 'high', name, location, 'Dependency uses an unencrypted transport.',
          'Use an HTTPS registry package with a committed integrity-protected lockfile.');
      } else if (kind === 'remote') {
        add('REMOTE_SOURCE', 'high', name, location, 'Dependency bypasses normal registry version resolution.',
          'Review its provenance and pin an immutable, integrity-verified artifact.');
      } else {
        // npm aliases remain registry sources; check the target version separately.
        const version = value.startsWith('npm:') ? value.slice(value.lastIndexOf('@') + 1) : value;
        if (!exactVersion.test(version)) add('UNPINNED_VERSION', 'warning', name, location,
          'Direct dependency is not pinned to an exact version.',
          'Use an exact reviewed version and commit package-lock.json. Ranges may be intentional.');
      }
    }
  }
  if (manifest.scripts !== undefined && !isObject(manifest.scripts)) throw new UserError('package.json scripts must be an object.');
  for (const script of ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare']) {
    const value = (manifest.scripts as JsonObject | undefined)?.[script];
    if (value !== undefined && typeof value !== 'string') throw new UserError('package.json scripts must contain strings.');
    if (typeof value === 'string' && value.trim()) add('INSTALL_SCRIPT', 'high', '(root)', `package.json:scripts.${script}`,
      'A root lifecycle script can execute during package installation.',
      'Review the script and use npm ci --ignore-scripts when installation scripts are unnecessary.');
  }

  let lockedPackages = 0;
  let lockfileVersion: number | null = null;
  const versions = new Map<string, Set<string>>();
  if (lock === null) {
    if (direct.size > 0) add('MISSING_LOCKFILE', 'warning', '(root)', 'package-lock.json',
      'No npm lockfile was found; transitive dependencies could not be inspected.',
      'Generate and review an npm v2/v3 lockfile, then commit it.');
  } else {
    if (lock.lockfileVersion !== 2 && lock.lockfileVersion !== 3) {
      throw new UserError('Only package-lock.json lockfileVersion 2 and 3 are supported.');
    }
    lockfileVersion = lock.lockfileVersion;
    if (!isObject(lock.packages)) throw new UserError('npm lockfile packages must be an object.');
    if (Object.keys(lock.packages).length > 100000) throw new UserError('npm lockfile exceeds the 100000-entry limit.');
    for (const [path, raw] of Object.entries(lock.packages)) {
      if (!isObject(raw)) throw new UserError('npm lockfile contains an invalid package entry.');
      if (path === '') continue;
      lockedPackages++;
      for (const key of ['resolved', 'version', 'integrity']) {
        if (raw[key] !== undefined && typeof raw[key] !== 'string') throw new UserError('npm lockfile package fields must be strings.');
      }
      for (const key of ['hasInstallScript', 'link', 'inBundle']) {
        if (raw[key] !== undefined && typeof raw[key] !== 'boolean') throw new UserError('npm lockfile package flags must be booleans.');
      }
      const name = path.split('node_modules/').at(-1) || path;
      const location = `package-lock.json:${path}`;
      if (raw.hasInstallScript === true) add('INSTALL_SCRIPT', 'high', name, location,
        'A locked dependency declares an installation script.',
        'Review its lifecycle script before allowing it to run.');
      if (raw.link === true || raw.inBundle === true) continue;
      if (typeof raw.version === 'string') {
        const values = versions.get(name) ?? new Set<string>();
        values.add(raw.version);
        versions.set(name, values);
      }
      if (typeof raw.resolved === 'string') {
        if (/^(?:http:|git:\/\/)/i.test(raw.resolved)) add('INSECURE_SOURCE', 'high', name, location,
          'Locked dependency uses an unencrypted transport.', 'Regenerate the lockfile using a trusted HTTPS source.');
        else if (sourceKind(raw.resolved) === 'remote' && !/^https:/i.test(raw.resolved)) {
          add('REMOTE_SOURCE', 'high', name, location, 'Locked dependency resolves from a non-registry source.',
            'Review the source and its immutable commit or artifact.');
        }
        if (/^https?:/i.test(raw.resolved) && !(typeof raw.integrity === 'string' && raw.integrity.trim())) {
          add('MISSING_INTEGRITY', 'warning', name, location, 'A locked remote artifact has no integrity value.',
            'Regenerate and review the lockfile; investigate artifacts that cannot provide integrity.');
        }
      }
    }
    for (const [name, values] of versions) {
      if (values.size > 1) add('DUPLICATE_VERSIONS', 'warning', name, 'package-lock.json',
        `Dependency has ${values.size} distinct locked versions.`,
        'Review whether deduplication is compatible; multiple versions may be required.');
    }
  }
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1)
    || lexical(a.code, b.code) || lexical(a.package, b.package) || lexical(a.location, b.location));
  const summary = { high: 0, warning: 0 };
  for (const finding of findings) summary[finding.severity]++;
  return {
    kind: 'deps', project: typeof manifest.name === 'string' ? cleanText(manifest.name) : '(unnamed)',
    directDependencies: direct.size, lockedPackages, lockfileVersion, summary, findings,
    disclaimer: 'Offline configuration heuristics only. No vulnerability database was queried; no findings does not mean secure. Peer version ranges are intentionally excluded.',
  };
}

export function inspectDependencies(repo: string): DependencyReport {
  const manifest = readJson(resolve(repo, 'package.json'))!;
  const lock = readJson(resolve(repo, 'package-lock.json'), true);
  return analyzeDependencies(manifest, lock);
}

export function crossesThreshold(report: DependencyReport, threshold?: Severity): boolean {
  return threshold === 'high' ? report.summary.high > 0
    : threshold === 'warning' ? report.findings.length > 0 : false;
}
