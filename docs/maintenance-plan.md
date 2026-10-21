# 90-day maintenance plan / 90 天维护计划

Dates are in Asia/Shanghai. This is a plan, not completed outreach or promised
adoption. Measure useful feedback and reproducible workflows instead of stars.

| Period | Release target | Maintenance and user work |
| --- | --- | --- |
| Days 1–30: Oct 22–Nov 20, 2026 | v0.1.1 on Nov 20 | Ask 3–5 maintainers who already know the author to try one real release; post one concise usage demo in a community where project sharing is allowed; triage false positives and Windows issues weekly. |
| Days 31–60: Nov 21–Dec 20, 2026 | v0.2.0 on Dec 20 | Turn at least three consenting, sanitized real workflows into regression fixtures; prioritize source-classification clarity and report readability; evaluate workspace support only if repeated requests justify it. |
| Days 61–90: Dec 21, 2026–Jan 19, 2027 | v0.2.1 on Jan 19 | Review compatibility, docs and dependency updates; publish a short changelog and example-based case study with consent; choose the next scope from repeat use and issue evidence. |

## Every release

- Review npm and GitHub Actions dependency updates; keep runtime dependencies zero.
- Run the full local gates and require six successful CI jobs on the tagged commit.
- Inspect generated examples, package contents and README quickstart from a clean
  install; update release notes and keep a draft until reviewed.
- Ship security and severe correctness patches promptly, outside the monthly
  cadence if necessary. Keep JSON schema compatibility explicit.

## Issue process

- `.github/ISSUE_TEMPLATE/bug_report.yml`: environment, command, expected/actual
  output, sanitized reproduction and whether the issue affects real work.
- `.github/ISSUE_TEMPLATE/feature_request.yml`: user job, current workaround,
  concrete sample and expected value; keep proposed implementation optional.
- `.github/ISSUE_TEMPLATE/config.yml` enables general questions. Do not require
  labels that have not yet been created in the repository.
- Triage weekly using GitHub's default bug/enhancement/documentation labels;
  confirm reports before prioritizing them. Close the loop with the reporter.

## Finding real users

Use RepoBrief for its own releases and show before/after artifacts. Offer a short
local walkthrough to small-project maintainers; ask which text they kept or
rewrote. Request consent before publishing any case study. Share examples in
relevant communities under their rules, with no unsolicited bulk messages.

Track opt-in feedback manually: repositories that tried it, repeat runs reported
by maintainers, minutes of manual editing saved, and confirmed issues fixed.
There is no product telemetry and no collection of private repository data.
