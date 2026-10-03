# NGO Hub backend

Django + DRF foundation, alongside the existing Next.js frontend. Requires Python 3.13 and PostgreSQL 14 or newer. Runtime settings always use PostgreSQL; SQLite is used only by the explicit isolated test settings. The pre-existing SQLite database is left untouched and is not migrated or used.

## Setup (PowerShell, from backend)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env # Only if .env does not already exist
```

Set a unique DJANGO_SECRET_KEY and the POSTGRES_* values in `.env`. Existing environment variables take precedence over `.env`. Do not commit credentials. DJANGO_DEBUG defaults to False; enable it for local development. CORS permits only the configured frontend origins.

The legacy DATABASE_URL entry, if present, is not read. Configure the POSTGRES_* variables instead. For a local PostgreSQL installation, run `.\.venv\Scripts\python.exe provision_local.py` and enter the postgres administrator password. This creates a dedicated application login, the application database, and a separate test database; it saves a generated application password in the ignored `.env`. Existing roles and databases are preserved. Short development signing keys are replaced with a generated secret, invalidating existing tokens.

Using a PostgreSQL administrator, create a dedicated login and empty database (replace the password):

```sql
CREATE USER ngo_hub WITH PASSWORD 'choose-a-unique-password';
CREATE DATABASE ngo_hub OWNER ngo_hub;
```

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

Create staff accounts in the bilingual portal's Staff accounts page as Super Admin. Django admin at http://127.0.0.1:8000/admin/ remains available for account administration. `createsuperuser` assigns Super Admin. Role and Django `is_staff` remain separate: a role alone does not grant Django admin access. There is no public registration or email-based login. Do not grant Django staff privileges to paramedics for normal portal use.

## Authentication API

| Endpoint | Method | Body / result |
| --- | --- | --- |
| /api/auth/login/ | POST | username, password → access, refresh |
| /api/auth/refresh/ | POST | refresh → access, rotated refresh |
| /api/auth/logout/ | POST | refresh → blacklist that refresh token |
| /api/auth/me/ | GET | current user's id, username, email, names, role |

Send `Authorization: Bearer <access>` to authenticated endpoints. Access tokens expire after 15 minutes. Refresh tokens expire after one day, rotate on use, and are blacklisted after rotation or logout. Logout does not revoke already-issued access tokens; clients should discard both tokens. Run `manage.py flushexpiredtokens` daily. Authentication endpoints have a basic per-IP 10/minute throttle using Django's local cache; production requires a shared cache and gateway rate limiting.

## Apps and scope

- core: public `GET /api/health/` endpoint returning API status; retained from the backend foundation.
- accounts: custom User with phone and a protected Role foreign key, five seeded BRD roles, capability permissions, admin UI, JWT endpoints. `/api/auth/me/` returns a stable role code and read-only capabilities for the UI.
- missions: scoped mission API, planned and actual crew, actual times, transitions, immutable closed status and audited Super Admin corrections. Statuses: Pending, Active, Completed, Cancelled.
- vehicles: basic records and transactional mission availability; record management restricted to Super Admin and Vehicle Manager.
- equipment, reports, ai_assistant: registered app skeletons for later milestones.

The bilingual frontend connects through Next.js Server Actions, stores tokens in HttpOnly SameSite cookies (Secure in production), renews sessions, and supports logout. Operational APIs enforce role and record access on the backend. Django mission admin is read-only so changes cannot bypass the workflow and audit history. See [the milestone guide](../docs/milestone-one.md) for workflows and endpoint details.

## Verification

```powershell
.\.venv\Scripts\python.exe manage.py test --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.test_settings
# Real PostgreSQL integration checks, after configuring a database:
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py test --keepdb
```

The local provisioning script creates `test_ngo_hub` owned by the application role. Use `--keepdb` to reuse it without granting database creation privileges. Tests cover authentication, roles, mission workflows, record access, correction audits, migration preservation and vehicle availability. The simultaneous-start test requires PostgreSQL; isolated SQLite tests do not substitute for PostgreSQL integration verification.

## Connected frontend

Start Django on port 8000, then run `npm run dev` in `frontend`. Open `http://127.0.0.1:3000/en/login` or `/ar/login`; successful login opens the staff portal. Optional `frontend/.env.local` can set `DJANGO_API_URL` (defaults to `http://127.0.0.1:8000`). This URL is server-only. Login uses the Django username, not email. The initial local administrator credentials, when generated, are in ignored `backend/.local-admin.txt`; additional accounts can be created through the portal. Next.js currently appears to Django as a single client IP, so its basic auth throttle is shared across frontend users; configure trusted client-aware gateway throttling before production.

Before production, configure HTTPS, secure deployment settings, a shared cache, backups and real secrets; run `manage.py check --deploy`. Dependency versions used in validation are recorded in requirements-lock.txt.

## BRD role and status alignment

| Role code | Current capability policy |
| --- | --- |
| SUPER_ADMIN | Staff management and all capabilities listed below |
| OPERATIONS_MANAGER | Missions and team activity |
| PARAMEDIC | Missions and own activity |
| LENDING_OFFICER | Equipment lending |
| VEHICLE_MANAGER | Vehicle management |

The policy covers the current foundation. Future module APIs must attach the appropriate DRF permission and enforce record-level scope; a capability in the profile is not a substitute for backend authorization. Unspecified management access is denied until approved. Report, publishing, AI-review and issue-reporting actions will be added with their modules. The Django admin enforces staff/mission role checks; mission deletion is disabled in favor of cancellation.

Migration `accounts.0002` creates the ERD Role catalogue and converts old users without changing passwords: existing Django superusers become Super Admin, other ADMIN users become Operations Manager, and PARAMEDIC remains Paramedic. Migration `missions.0002` converts ASSIGNED to PENDING (assignment alone does not indicate work started) and IN_PROGRESS to ACTIVE. Mission IDs, crew links and notes are retained. Reversing migrations cannot reconstruct the old Assigned distinction; lending/vehicle roles fall back to Paramedic in the old two-role schema.

Migration `missions.0003` adds mission details, vehicles, planned/actual MissionCrew and correction audits. Existing mission IDs, titles, notes and crew links are preserved; legacy records receive stable mission numbers. Unknown actual dates and times stay empty. Equipment, loans, full vehicle maintenance, reports, public submissions and AI remain for later milestones.
