# Release review — 28 October 2026

Evidence collection: `2026-10-28.1`. This review distinguishes hackathon submission readiness from approval for a national production service.

## Verified locally

| Check | Result |
| --- | --- |
| Unit tests | 82 passed, zero failures |
| Evaluation | 171/171 case-language pairs passed; results in [eval/results.md](../eval/results.md) |
| TypeScript | Passed |
| ESLint | Zero errors; two advisory warnings (static logo image and unused function parameter) |
| Production dependency audit | Zero reported vulnerabilities with `npm audit --omit=dev` |
| GitHub Pages export | Successful build under `/baza-nisr/` |
| Node production build | Successful, including all five JSON endpoints |
| Standalone server | Health reports 94 observations and the current version; district answer returns 51.4 with PDF page 109; bad origins receive 403; unknown input fields receive 400; injection request returns no observations; logo and embed return 200 |
| Source inspection | EICV7 PDF page 109 rendered and inspected against the district records, including published intervals and coefficients of variation |
| Mobile browser | 390 px viewport: no document-wide horizontal overflow; mobile navigation works; Kinyarwanda answer and French follow-up preserve value, period and citation |
| Optional model dialog | Opens without a model download; Escape closes it and restores focus |
| Cross-origin widget | A host on port 8879 loaded the widget and complete iframe from port 8788; composer accepted text. Automated submission inside the shadow-root iframe was blocked by the browser automation focus mechanism, so this is recorded as a rendering check rather than a completed cross-origin conversation test |
| Documentation | Relative links checked; missing accessibility notes added; stale counts, district-refusal examples, evidence version and deployment instructions corrected |

The UI and widget were inspected in the browser. The optional 1–2 GB model download and inference were not run during this release review. Core answers require neither.

## Submission and operational limits

The repository and public app must carry the same release commit; successful GitHub Actions runs confirm the published artifact. [SUBMISSION.md](SUBMISSION.md) gives the links and the team's final form checklist. Publishing the repository is not submission of the entry form.

The prototype has a bounded collection and explicit coverage limits. It has not undergone native-speaker translation review, a full accessibility audit, a user study, distributed load testing, or institutional security acceptance. A national pilot needs those checks, an approved data-update process and edge-level throttling for any public API. See [ACCESSIBILITY.md](ACCESSIBILITY.md), [EVALUATION.md](EVALUATION.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
