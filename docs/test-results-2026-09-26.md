# NGO Hub verification — 26 September 2026

## Follow-up: fixes completed and verified

This section supersedes the original failure report retained below.

### Changes in the fix pass

- `frontend/src/app/[lang]/(public)/[page]/page.tsx`: generate both language and page parameters; all fourteen localized public subpages are now included in production.
- `frontend/src/features/auth/StaffPortal.tsx`: handle rejected/unavailable session checks and sign-in actions; unlock the form if the initial session check times out; ignore late responses after timeout or unmount.
- `frontend/src/features/portal/Submissions.tsx`: derive loading state from the selected query, update state in asynchronous response callbacks, and ignore stale responses after tab/filter changes or unmount. No permission/status rules were changed.
- `frontend/src/features/portal/Reports.tsx`: replace the print logo's raw image with Next Image, keeping eager loading and the original unoptimized local image for printing.
- `frontend/tests/release-regressions.test.cjs`: four tests for localized production parameters and login failure, timeout, cleanup, and successful localized redirect behavior.
- `docs/test-results-2026-09-26.md`: this report.

The pre-edit versions of the four application files are in `C:/Users/user/AppData/Local/Temp/ngo-hub-before-release-fixes-20260926-014513`. Existing unrelated uncommitted work was preserved. No commit or push was made.

### Final automated results

- Full PostgreSQL suite: **82 passed**, including permission, password reset, mission workflow/concurrency, maintenance, migrations, and AI API tests.
- Frontend suite: **30 passed**.
- TypeScript `tsc --noEmit`: passed.
- Full frontend ESLint: passed with **zero errors and warnings**.
- Django `check`: passed. `makemigrations --check --dry-run`: no changes detected. No new migrations or schema changes were needed.
- Final production build: passed, generating 17 static pages including all fourteen localized public subpages.
- Production HTTP smoke check: all 16 English/Arabic home and public-page URLs returned **200**.

### Browser verification actually performed

- Production server on port 3001: Super Admin sign-out and fresh English sign-in; Arabic Paramedic sign-in and restricted navigation; direct maintenance URL denied for Paramedic.
- Loaded dashboard, missions, activity, reports, submissions, staff, vehicles, equipment, lending, maintenance, and AI screens in both languages. Verified real loaded data or empty states rather than only HTTP status for the module lists.
- Live English AI analysis using explicitly synthetic QA text: structured output/questions, exact vehicle match, edited description and follow-up answer, explicit review confirmation, successful issue creation, and persisted answer in the issue detail.
- Maintenance issue #1: Open → In Maintenance in English, then Resolved in Arabic. Verified audit entries, translated UI and RTL, and the vehicle returning to Available.
- Arabic Paramedic mission #7 (`MSN-8AA04B0ADA6C`): created Pending, used Finish mission without starting, supplied actual start/crew/vehicle/destination, and completed with **no end time**. Verified Completed status, blank end time, locked controls, audit history, and unchanged Available vehicle status.
- Normal development server on port 3000: restarted the stale project-specific Next.js dev process; verified session loading, logout, fresh Super Admin sign-in and dashboard. Verified the final submission-loading implementation through Contact → Volunteers and Closed filtering, including empty results.
- Mobile visual spot checks at 390×844: Arabic login and English dashboard; restored the viewport afterward. These are not exhaustive mobile/device coverage.

### Current state and limits

- App is running on its usual `http://127.0.0.1:3000` and the browser is left at the Super Admin dashboard. Temporary production server on 3001 was stopped.
- QA data retained for auditability: one resolved vehicle issue (#1) and one completed mission (#7), both marked `QA-20260926`. Vehicle `QA-AMB-01` is Available; no active QA mission or maintenance hold remains.
- No existing staff passwords were changed. Password-reset authorization and validation were tested in the isolated backend suite, not by resetting a real account through the browser.
- Non-blocking development/build warnings remain: the unrelated external `C:/Users/user/package-lock.json` is ignored, and Next.js reports the existing smooth-scroll HTML hint. Neither is an ESLint error or a failed build.
- Repository-wide `git diff --check` reports pre-existing extra blank lines at EOF in `frontend/src/app/globals.css:1339` and `frontend/src/features/portal/copy.ts:320`; these unrelated files were not rewritten.
- Live AI succeeded for the tested synthetic note; this does not guarantee future provider availability or every generated answer. Browser smoke tests do not exhaust every data/role combination; automated tests cover the additional workflow and permission cases.

---

## Archived initial results before the fixes

## Automated checks

| Check | Result |
| --- | --- |
| Django `check` | Passed, no issues |
| Django `makemigrations --check --dry-run` | Passed, no model/migration drift |
| Django `showmigrations --plan` | All migrations applied, including vehicle maintenance migration 0002 |
| Full PostgreSQL test suite, `manage.py test --keepdb` | 82 passed (29.377 seconds) |
| Frontend `node --test tests/*.test.cjs` | 26 passed |
| TypeScript `tsc --noEmit` | Passed |
| Next.js production build | Passed; runtime route failures below remain |
| ESLint, AI component/data helper/tests | Passed |
| ESLint, entire frontend | Failed: one error and one warning below |

Added eight backend AI tests in `backend/apps/ai_assistant/tests.py`: authorized roles and no automatic issue creation, denied roles/anonymous access, inactive admin, request validation, Arabic and untrusted-note prompt placement, malformed responses and fenced JSON, provider exceptions, and missing API key. Provider calls are mocked. These verify request handling and prompt construction, not model compliance or live provider availability.

The full backend suite also exercises authentication/password reset, roles, mission workflows and scope, dashboard/activity, submissions, equipment, maintenance lifecycle, data migrations and concurrency. Frontend tests are component/logic tests; they do not replace browser verification.

## Findings

1. **Production public routes return 404.** Started the freshly built application on `127.0.0.1:3001`. Both English and Arabic versions of login, about, services, activities, volunteer, contact and donate returned HTTP 404. English login was also confirmed in the browser. `frontend/src/app/[lang]/(public)/[page]/page.tsx:7-8` disables dynamic parameters while generating only `page`, omitting `lang`; the build generates no localized public subpages. This is a release blocker. The `/en` and `/ar` home pages returned 200. Portal roots returned 200, which alone does not prove authenticated portal functionality.
2. **Development browser login remains disabled.** On the existing server at `127.0.0.1:3000/en/login`, the form remained on “Please wait…” with disabled inputs across reloads. JavaScript asset HTTP checks returned 200; no browser error was captured. Root cause is not established. No credentials were successfully entered and no authenticated browser workflow was completed during this run.
3. **Existing full-project ESLint error:** `frontend/src/features/portal/Submissions.tsx:118`, `react-hooks/set-state-in-effect` from the effect calling `load()`.
4. **Existing ESLint warning:** `frontend/src/features/portal/Reports.tsx:4670`, `@next/next/no-img-element`.
5. **Build warning:** Next.js ignores the unrelated `C:/Users/user/package-lock.json` outside this Git repository. Build completed successfully.

## Coverage limits and preservation

- Authenticated English/Arabic browser workflows, live AI analysis, and mobile visual testing remain unverified in this run because browser login was blocked.
- No production readiness claim: passing suites/build do not override the runtime 404s and failed full lint.
- No application implementation changes were made during this testing pass. Only the new backend test file and this report were added; existing uncommitted changes were preserved.
- Tests ran against the existing dedicated PostgreSQL test database. No application records were created or modified through the browser, and no migration needed applying.
- No commit or push was performed.
