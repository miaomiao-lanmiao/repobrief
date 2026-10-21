# Publishing and resuming / 发布与续接

The initial project task authorizes a public GitHub repository, pushing all local
branches and tags, and a **draft** release. No npm publication is requested.

From PowerShell in the source checkout:

```powershell
gh auth login --hostname github.com
./scripts/publish.ps1
```

If `repobrief` already exists in the authenticated account, choose a new name:

```powershell
./scripts/publish.ps1 -RepositoryName repobrief-cli
```

The script authenticates to the GitHub API before mutation, requires a clean
`main` checkout, runs installation/tests/build/security/package gates, validates
an existing origin, and creates a public repository if necessary. It never attaches
to an unrelated existing repository or replaces a tag at another commit.

It pushes all local branches and tags, waits for the `CI` workflow at HEAD,
and creates a draft with the built npm tarball using the versioned notes file.
Reruns reuse the matching public origin and draft. A published release is never
edited. It does not store tokens or change global Git configuration.

Network access is required for npm development dependencies, GitHub API, pushes
and CI. Authentication/network/CI failures stop subsequent steps. An existing
local tag, public repository or pushed branch may remain after a later failure;
rerun the same command after fixing the reported blocker.

On Windows, when neither proxy environment variable is set, the script reuses an
enabled HTTP(S) system proxy for the current process. Existing environment proxies
take precedence. It does not edit Windows proxy settings or Git configuration.

Remote CI success must be checked from GitHub. A local test run alone does not
verify Linux/macOS or a hosted GitHub Actions run.
