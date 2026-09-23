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

Create staff accounts at http://127.0.0.1:8000/admin/. New users default to Paramedic; `createsuperuser` assigns Admin. Role and Django `is_staff` are separate: an Admin role alone does not grant Django admin access. There is no public registration or user-management API yet. Do not grant staff privileges to paramedics.

## Authentication API

| Endpoint | Method | Body / result |
| --- | --- | --- |
| /api/auth/login/ | POST | username, password → access, refresh |
| /api/auth/refresh/ | POST | refresh → access, rotated refresh |
| /api/auth/logout/ | POST | refresh → blacklist that refresh token |
| /api/auth/me/ | GET | current user's id, username, email, names, role |

Send `Authorization: Bearer <access>` to authenticated endpoints. Access tokens expire after 15 minutes. Refresh tokens expire after one day, rotate on use, and are blacklisted after rotation or logout. Logout does not revoke already-issued access tokens; clients should discard both tokens. Run `manage.py flushexpiredtokens` daily. Authentication endpoints have a basic per-IP 10/minute throttle using Django's local cache; production requires a shared cache and gateway rate limiting.

## Apps and scope

- accounts: custom User, Admin/Paramedic roles, reusable IsAdminRole permission, admin UI, JWT endpoints.
- missions: initial Mission model, assigned paramedics, creator, timestamps, notes, five status choices and database constraint. Statuses: Pending, Assigned, In Progress, Completed, Cancelled.
- equipment, vehicles, reports, ai_assistant: registered app skeletons for later milestones.

Mission workflow transitions and API endpoints are not implemented yet. Paramedic filtering in Django admin is a form restriction; the future mission API must validate active paramedic assignments and enforce transitions. The bilingual frontend login connects through Next.js Server Actions, stores tokens in HttpOnly SameSite cookies (Secure in production), renews sessions, and supports logout. It shows the authenticated staff profile; operational modules are not yet implemented.

## Verification

```powershell
.\.venv\Scripts\python.exe manage.py test --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.test_settings
# Real PostgreSQL integration checks, after configuring a database:
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py test --keepdb
```

The local provisioning script creates `test_ngo_hub` owned by the application role. Use `--keepdb` to reuse it without granting database creation privileges. Isolated tests cover authentication, refresh rotation, logout, inactive users, role permissions, CORS, throttling and model constraints. They do not substitute for PostgreSQL integration verification.

## Connected frontend

Start Django on port 8000, then run `npm run dev` in `frontend`. Open `http://127.0.0.1:3000/en/login` or `/ar/login`. Optional `frontend/.env.local` can set `DJANGO_API_URL` (defaults to `http://127.0.0.1:8000`). This URL is server-only. Login uses the Django username, not email. The initial local administrator credentials, when generated, are in ignored `backend/.local-admin.txt`; additional accounts can be created through Django admin. Next.js currently appears to Django as a single client IP, so its basic auth throttle is shared across frontend users; configure trusted client-aware gateway throttling before production.

Before production, configure HTTPS, secure deployment settings, a shared cache, backups and real secrets; run `manage.py check --deploy`. Dependency versions used in validation are recorded in requirements-lock.txt.
