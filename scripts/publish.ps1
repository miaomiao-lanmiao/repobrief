[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$')]
    [string]$RepositoryName = 'repobrief'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$projectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Checked {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable failed (exit $LASTEXITCODE). No later publishing step was attempted."
    }
}

Push-Location -LiteralPath $projectRoot
try {
    # Authenticate before any remote mutation; never read or print stored tokens.
    $login = & gh api --hostname github.com user --jq .login
    if ($LASTEXITCODE -ne 0 -or -not $login -or $login -notmatch '^[A-Za-z0-9-]+$') {
        throw 'GitHub API authentication is unavailable. Restore connectivity and run gh auth login --hostname github.com, then rerun this script.'
    }
    $repository = "$login/$RepositoryName"
    $manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    $version = $manifest.version
    if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a stable semantic package version.' }
    $tag = "v$version"
    $notes = Join-Path $projectRoot "docs/releases/$tag.md"
    if (-not (Test-Path -LiteralPath $notes -PathType Leaf)) { throw 'Release notes are missing.' }

    $changes = & git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Commit all source changes before publishing.' }
    $branch = & git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Publish from the main branch.' }
    $commit = & git rev-parse HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve HEAD.' }

    $remoteNames = @(& git remote)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect remotes.' }
    if ($remoteNames -contains 'origin') {
        $origin = & git remote get-url origin
        if ($LASTEXITCODE -ne 0) { throw 'Cannot read origin.' }
        $allowedOrigins = @("https://github.com/$repository", "https://github.com/$repository.git", "git@github.com:$repository.git")
        if ($origin -notin $allowedOrigins) { throw 'Origin does not match the requested repository; refusing to push.' }
        $remoteInfo = & gh repo view $repository --json nameWithOwner,isPrivate | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0 -or $remoteInfo.isPrivate) { throw 'Expected an accessible public origin repository.' }
    } else {
        # Abort on a collision rather than attaching unrelated existing content.
        & gh repo view $repository --json nameWithOwner 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { throw 'Repository name already exists. Choose a new -RepositoryName.' }
    }

    Invoke-Checked 'npm' @('ci', '--ignore-scripts')
    Invoke-Checked 'npm' @('test')
    Invoke-Checked 'npm' @('run', 'build')
    Invoke-Checked 'npm' @('run', 'check:security')
    Invoke-Checked 'npm' @('run', 'check:package')
    Invoke-Checked 'git' @('diff', '--check')
    $afterChecks = & git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $afterChecks) { throw 'Checks changed tracked source. Commit before publishing.' }

    $existingTag = & git tag --list $tag
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect tags.' }
    if ($existingTag) {
        $tagCommit = & git rev-list -n 1 $tag
        if ($LASTEXITCODE -ne 0 -or $tagCommit -ne $commit) { throw 'The release tag is not at HEAD; it will not be replaced.' }
    } else {
        Invoke-Checked 'git' @('tag', '-a', $tag, '-m', "RepoBrief $tag")
    }

    if ($remoteNames -notcontains 'origin') {
        Invoke-Checked 'gh' @('repo', 'create', $repository, '--public', '--source', $projectRoot,
            '--remote', 'origin', '--description', 'Offline Git changelogs, dependency configuration checks, and PR descriptions. Zero runtime dependencies.')
    }
    Invoke-Checked 'git' @('push', '--set-upstream', 'origin', '--all')
    Invoke-Checked 'git' @('push', 'origin', '--tags')

    # GitHub may take a moment to register a new push. Bound this registration wait.
    $ciRun = $null
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        $runJson = & gh run list --repo $repository --workflow CI --branch main --commit $commit --limit 5 --json databaseId,status,conclusion,headSha
        if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect GitHub CI. Rerun after restoring API access.' }
        $runs = @($runJson | ConvertFrom-Json)
        if ($runs.Count -gt 0) { $ciRun = $runs[0]; break }
        Start-Sleep -Seconds 5
    }
    if (-not $ciRun) { throw 'CI has not registered for HEAD. Enable Actions if needed and rerun this script.' }
    Invoke-Checked 'gh' @('run', 'watch', [string]$ciRun.databaseId, '--repo', $repository, '--exit-status')

    $artifactDirectory = Join-Path $projectRoot 'release-artifacts'
    New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
    Invoke-Checked 'npm' @('pack', '--ignore-scripts', '--pack-destination', $artifactDirectory)
    $archive = Join-Path $artifactDirectory "repobrief-cli-$version.tgz"
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw 'Release tarball was not created.' }

    $releaseJson = & gh release view $tag --repo $repository --json isDraft,url 2>$null
    if ($LASTEXITCODE -eq 0) {
        $release = $releaseJson | ConvertFrom-Json
        if (-not $release.isDraft) { throw 'Release is already published; refusing to modify it.' }
        Invoke-Checked 'gh' @('release', 'edit', $tag, '--repo', $repository, '--title', "RepoBrief $tag", '--notes-file', $notes)
        Invoke-Checked 'gh' @('release', 'upload', $tag, $archive, '--repo', $repository, '--clobber')
    } else {
        Invoke-Checked 'gh' @('release', 'create', $tag, $archive, '--repo', $repository, '--draft',
            '--verify-tag', '--title', "RepoBrief $tag", '--notes-file', $notes)
    }
    Write-Output "Public repository: https://github.com/$repository"
    Write-Output 'Release remains a draft; npm registry publishing was not performed.'
    Invoke-Checked 'gh' @('release', 'view', $tag, '--repo', $repository, '--json', 'url,isDraft')
} finally {
    Pop-Location
}
