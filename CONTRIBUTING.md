# Contributing / 贡献指南

Small, reproducible improvements are welcome. Please start larger changes with
a feature request describing the workflow and why existing commands are not enough.

1. Install Node.js 22+ and Git; clone or download the source.
2. Run `npm ci --ignore-scripts` and create a branch.
3. Make a focused change and add a behavior test when it fixes a bug or adds logic.
4. Run `npm test`, `npm run build`, `npm run check:security`, and
   `npm run check:package`; use `git diff --check` before committing.
5. Open a PR with expected behavior, sample output, and the checks you actually ran.

使用中文或英文均可。提交问题时请提供系统、Node/Git 版本、实际命令、预期与实际结果，
以及去除敏感信息的最小复现。请勿上传真实凭据、私有仓库历史或完整生产日志。

Use Conventional Commit subjects (`feat:`, `fix:`, `docs:`). Avoid runtime
dependencies, network behavior, generated timestamps, and changes that silently
alter JSON shape. New checks must explain their limits and possible false positives.

Security issues: follow [SECURITY.md](SECURITY.md). Review and release guidance
for coding agents is in [AGENTS.md](AGENTS.md). Contributions are licensed under MIT.
