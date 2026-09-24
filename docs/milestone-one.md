# Staff portal and Missions milestone

## Run locally

Keep PostgreSQL running on the configured port. From the project root, open two terminals:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

```powershell
cd frontend
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000/en/login or http://127.0.0.1:3000/ar/login. Use an existing staff username and password. The initial local administrator credentials are in the ignored `backend/.local-admin.txt`, when present. On Windows with a broken npm shim, use `& 'C:/Program Files/nodejs/npm.cmd' run dev -- --hostname 127.0.0.1`.

## Implemented behavior

- Super Admin creates, edits and disables username/password staff accounts and selects one of the five agreed roles. Email is optional contact information, never the login identifier. Portal account creation does not grant Django admin privileges. Self-disable/demotion and removal of the last active Super Admin are prevented.
- Super Admin and Operations Manager see all missions and control planned crew assignments. Paramedics see and change only missions they created or appear in as crew. Backend querysets and mutation checks enforce this scope, including dashboard, search and activity.
- Planned assignments are editable while Pending by management. Paramedics can record actual participating crew on accessible missions. New crew entries must reference active Paramedic accounts; crew roles are free text.
- Incident type uses the reference choices Trauma, Cardiac, Respiratory, Fall and Other, with English/Arabic labels. Existing custom values remain available unchanged when editing.
- Pending mission details include a direct Finish mission button.
- Super Admin can reset staff passwords through a dedicated action with matching new-password confirmation and show/hide controls. The backend validates password strength; existing passwords/hashes are never returned. Password changes through ordinary staff PATCH are rejected.
- Missions capture a generated number, date, location, incident type, destination, vehicle, legacy title, notes, planned/actual crew and actual start/end. Record creation time is separate. Actual times are entered in the device timezone; mission date is checked against the actual start date in the application's Beirut timezone.
- Supported transitions: Pending → Active → Completed, Pending → Completed, direct historical Completed entry, and Pending/Active → Cancelled with a reason. Completion requires date, location, incident type, vehicle, actual crew and actual start. Actual end is optional and remains empty when omitted. Actual times cannot be in the future or out of order.
- Pending missions do not reserve vehicles. Starting requires an available vehicle. Row locks and a PostgreSQL partial unique constraint prevent simultaneous Active missions using the same vehicle.
- Completing/cancelling an Active mission releases its vehicle unless in Maintenance. Historical entries, Pending → Completed and corrections never change current availability. An Active mission's vehicle cannot be changed.
- Completed/Cancelled missions cannot reopen or be deleted. Super Admin corrections require a reason. The audit records actor, time, reason and before/after values. Mission Django admin is read-only.
- Basic vehicle records are managed only by Super Admin and Vehicle Manager. Operations Manager and Paramedic can select vehicles in Missions but cannot manage records. On Mission is set by workflow, not manual selection.
- Dashboard totals and recent missions are scoped. Staff activity counts actual participation in Completed missions, not planned assignments or record creation.

## API

All operational endpoints require authentication. The frontend's server action reads the HttpOnly session and calls only allowlisted API paths.

| Path | Methods / purpose |
| --- | --- |
| `/api/staff/`, `/api/staff/{id}/` | GET/POST list/create; PATCH edit |
| `/api/staff/{id}/reset_password/` | POST new_password and confirm_password; Super Admin only |
| `/api/vehicles/`, `/api/vehicles/{id}/` | GET/POST list/create; PATCH edit |
| `/api/missions/`, `/api/missions/{id}/` | GET/POST list/create; GET/PATCH details/edit |
| `/api/missions/historical/` | POST completed historical entry |
| `/api/missions/{id}/start/`, `complete/`, `cancel/`, `correct/` | POST explicit workflow command |
| `/api/missions/summary/`, `activity/`, `crew_options/` | GET scoped summary/activity and active crew choices |

Mission list supports search, status, incident_type, vehicle, crew, date_from, date_to and page (20 per page). Invalid filter values return validation errors. Out-of-scope mission IDs return 404. DELETE and reopening are unsupported.

## Data preservation

`accounts.0002` preserves existing accounts/passwords while aligning roles. `missions.0002` aligns old status values. `vehicles.0001` and `missions.0003` add this milestone's records and copy existing paramedic links into explicit crew rows. Completed legacy links become actual crew; other legacy links remain planned. IDs, notes and titles are retained. Legacy mission numbers are stable (`MSN-LEGACY-...`), and unknown actual dates/times remain empty rather than being guessed.

Before applying these migrations locally, the existing working changes and database were backed up outside the repository. Credentials and database backups are not committed.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test --keepdb
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

`--keepdb` reuses the provisioned test database without granting database-creation privileges to the application role. The PostgreSQL suite covers authentication, roles, workflows, out-of-scope access, historical availability, audits, crew validation, data migrations and concurrent vehicle starts.

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Browser verification uses the real local database and server: English login/staff/vehicle creation and advance assignment/start; Arabic login/completion, historical entry, cancellation, locked records and administrator corrections. QA records are clearly identified: username `qa_medic_0924`, vehicle `QA-AMB-01`, and three test missions. They remain available for inspection; no existing records were deleted.

## Deferred

Equipment/lending, full vehicle maintenance, reports, AI and public-submission handling are not implemented in this milestone. The agreed future public-submission workflow remains Super Admin-only review: New → In Review → Closed.

Follow-up validation: 40 PostgreSQL tests and 10 frontend tests cover optional end times, unchanged occupied-vehicle availability, password-reset authorization/confirmation/strength, and new-versus-old password login. Browser checks verified EN/AR incident choices, the direct Finish button, Arabic completion with a blank end time, and translated reset forms with show/hide controls. Password changes were tested in the isolated test database; existing local account passwords were not changed. An additional QA mission (`QA optional end verification`) records the browser completion test.
