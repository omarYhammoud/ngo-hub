# NGO Hub Backend

Django API foundation for NGO Hub, the healthcare operations platform for the Islamic Medical Association in Saida.

## Current foundation

- Django project configuration
- Environment-based settings
- SQLite for local development
- PostgreSQL URL configuration for deployment
- API health endpoint at `/api/health/`
- Django admin support
- Automated health endpoint tests

## Setup

Use Python 3.12 or newer. From this directory:

```bash
python -m venv .venv
```

Activate the environment, then install dependencies:

```bash
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env`, then run:

```bash
python manage.py migrate
python manage.py test
python manage.py runserver
```

The health endpoint is available at `http://127.0.0.1:8000/api/health/`.

## Next modules

The next backend modules will cover staff roles, ambulance missions, equipment lending, vehicles, maintenance reports, contact messages, volunteer applications, reporting, and AI operations support.
