# Security policy

## Supported versions

The latest 0.1.x release receives fixes. Until the first public release, use the
latest source and report its commit ID. Future supported versions will be listed
here when released.

## Reporting

Use the repository's GitHub **Security → Advisories → Report a vulnerability**
when private reporting is enabled. If that control is unavailable, open an issue
asking for a private reporting channel without exploit details or credentials.
Do not post secrets, sensitive repository content, or weaponized examples.

The initial maintainer target is to acknowledge reports within 7 days and provide
a triage/update within 14 days. This is a maintenance target, not a service SLA.

## Trust and limitations

RepoBrief reads files and local Git metadata. It trusts the installed Git binary,
Node.js, PATH and local Git configuration. It does not sandbox arbitrary Git
installations or inspect package code. All Git transport is disabled for analysis.

Dependency findings reflect configuration, not exploitability. No CVE service
is queried, no downloaded bytes are verified, and no finding is proof of safety.
Static source checks and npm audit provide limited additional development checks.

Reports can contain commit messages, filenames and project names; review them
before publishing. Errors omit raw Git stderr and malformed input content.
