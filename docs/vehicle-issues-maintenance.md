# Vehicle Issues & Maintenance

Implemented in the existing vehicles app and bilingual portal. Access is restricted on the backend and frontend to Super Admin and Vehicle Manager through the existing `manage_vehicles` capability. Other module changes were retained.

## Use the feature

1. Start/restart Django and Next.js using the project's existing local commands.
2. Sign in as Super Admin or Vehicle Manager, then open **Vehicle Issues / Maintenance** in the sidebar (`/en/portal/vehicle-issues` or `/ar/portal/vehicle-issues`). The dashboard's **Open vehicle issues** link also opens the page; its count includes Open and In Maintenance issues.
3. Choose **Report vehicle issue**, select a vehicle, enter a category/type and description, and choose Low, Medium, High or Critical severity. Categories are free text for this MVP. Reporter and reporting time are set by the server.
4. Open an issue from its number. Add maintenance notes and use **Save changes**, **Send to maintenance**, or **Resolve issue**. Resolution requires notes describing the outcome. Resolver and resolution time are server-generated.
5. Filter the list by vehicle, status, severity and category. Expand the issue audit history to see who changed what and when.

## Rules and data safety

- Open reports do not automatically remove vehicles from service. Valid transitions are Open → In Maintenance → Resolved, or Open → Resolved when no maintenance is necessary.
- Sending an issue to maintenance sets the vehicle to Maintenance, preventing new Pending assignments and Active starts through the existing mission workflow. Existing mission records are not rewritten. An already Active mission can still finish or cancel without releasing a maintenance hold.
- Resolving one of several In Maintenance issues leaves the vehicle in Maintenance. After the last issue hold is resolved, the vehicle becomes On Mission if an Active mission still uses it, otherwise Available. An Open report alone does not impose a maintenance hold.
- Existing/manual maintenance holds are preserved separately. After issue holds are resolved, authorized staff may release a manual hold using the existing Vehicles screen, subject to existing Active-mission checks. Saving a vehicle already in issue-driven Maintenance does not silently create a manual hold.
- Historical mission entries continue to leave current availability unchanged.
- Issue operations, vehicle status edits and mission operations use the same transactional vehicle row lock. Issue operations do not acquire mission row locks, avoiding reversed lock ordering.
- Resolved issues are locked. There is no delete or reopen endpoint. Report facts cannot be overwritten through the notes/status endpoints. Every successful report, note edit and transition creates an audit entry with actor, time and before/after values. No mutable issue/audit Django admin was added.

## API

All routes are authenticated and require `manage_vehicles`:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/vehicle-issues/` | GET | Paginated list (20 per page) |
| `/api/vehicle-issues/` | POST | Report: vehicle, category, severity, description |
| `/api/vehicle-issues/{id}/` | GET | Details with audit history |
| `/api/vehicle-issues/{id}/` | PATCH | Update maintenance_notes on an unresolved issue |
| `/api/vehicle-issues/{id}/maintenance/` | POST | Send Open issue to maintenance; optional maintenance_notes |
| `/api/vehicle-issues/{id}/resolve/` | POST | Resolve unresolved issue; nonempty maintenance_notes required |
| `/api/vehicle-issues/summary/` | GET | Status counts and total unresolved count |

List/summary filters: vehicle, status, severity, category (case-insensitive substring). List also supports page. Invalid filter values and repeated/invalid transitions return validation errors. Frontend allowlisting is limited to these routes and their required methods.

## Migration and backups

Applied successfully to the existing local PostgreSQL database:

`vehicles.0002_vehicle_manual_maintenance_vehicleissue_and_more`

The migration adds issue and audit tables and an internal manual-maintenance flag. Existing vehicles already in Maintenance are marked as manual holds; their statuses and other data are preserved. Only the vehicles migration target was requested, leaving unrelated migration work alone.

- Working changes backup: `C:/Users/user/AppData/Local/Temp/ngo-hub-before-maintenance-20260925-235018`
- PostgreSQL backup: `C:/Users/user/AppData/Local/Temp/ngo-hub-before-maintenance-20260926-000142.dump`

No credentials or database dumps were added to the repository. No browser QA records were created in the local database for this module.

## Validation results

- Django check: passed, no issues.
- Migration drift check: passed, no changes detected.
- New vehicles PostgreSQL tests: 14 passed.
- Full PostgreSQL suite: 74 passed, including existing missions, accounts, equipment and submissions coverage.
- Frontend tests: 18 passed, including EN/AR navigation permission checks and explicit issue API route/method allowlisting.
- TypeScript `tsc --noEmit`: passed (invoked with the locally installed compiler).
- Production build: passed.
- ESLint: passed for all frontend source/test files changed for this module.
- Browser/mobile visual testing: not performed. The UI reuses existing portal styles and locale/RTL handling, but no visual verification is claimed.

Existing, unrelated warnings left unchanged: the build ignores `C:/Users/user/package-lock.json` outside the repository; `git diff --check` reports existing extra blank lines at the end of `frontend/src/app/globals.css` and `frontend/src/features/portal/copy.ts`. Both blank lines were verified against the pre-edit backup. No unrelated lint errors were encountered in the requested targeted checks.

## Exact files changed for this module

Paths are relative to `C:/Users/user/Documents/ngo-hub`:

Backend:

- `backend/apps/vehicles/models.py`
- `backend/apps/vehicles/views.py`
- `backend/apps/vehicles/issues.py` (new)
- `backend/apps/vehicles/serializers.py` (new)
- `backend/apps/vehicles/services.py` (new)
- `backend/apps/vehicles/migrations/0002_vehicle_manual_maintenance_vehicleissue_and_more.py` (new)
- `backend/apps/vehicles/test_issues.py` (new)
- `backend/apps/vehicles/test_concurrency.py` (new)
- `backend/apps/vehicles/test_migrations.py` (new)
- `backend/config/urls.py`

Frontend:

- `frontend/src/features/auth/portal-actions.ts`
- `frontend/src/features/portal/VehicleIssues.tsx` (new)
- `frontend/src/features/portal/Portal.tsx`
- `frontend/src/features/portal/Dashboard.tsx`
- `frontend/src/features/portal/types.ts`
- `frontend/src/features/portal/copy.ts`
- `frontend/tests/vehicle-issues.test.cjs` (new)
- `frontend/tests/portal.test.cjs`

Documentation:

- `docs/vehicle-issues-maintenance.md` (new)

No commit or push was performed.
