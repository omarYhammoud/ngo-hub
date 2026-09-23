"""Provision local development databases without giving the app PostgreSQL admin rights."""
import getpass
import os
import secrets
from pathlib import Path

import psycopg
from psycopg import sql
from dotenv import dotenv_values, set_key


def main():
    env_path = Path(__file__).with_name('.env')
    values = dotenv_values(env_path)
    host = values.get('POSTGRES_HOST') or '127.0.0.1'
    if host not in ('127.0.0.1', 'localhost', '::1'):
        raise SystemExit('This script is for local development databases only.')
    name = values.get('POSTGRES_DB') or 'ngo_hub'
    user = values.get('POSTGRES_USER') or 'ngo_hub'
    if user == 'postgres':
        raise SystemExit('Use a dedicated POSTGRES_USER, not postgres.')
    password = values.get('POSTGRES_PASSWORD')
    if not password or password == 'replace-with-your-database-password':
        password = secrets.token_urlsafe(32)
    admin_password = os.environ.get('LOCAL_POSTGRES_ADMIN_PASSWORD') or getpass.getpass('Local postgres password: ')
    with psycopg.connect(host=host, port=values.get('POSTGRES_PORT') or '5432',
                          dbname='postgres', user='postgres', password=admin_password,
                          autocommit=True) as connection:
        if not connection.execute('SELECT 1 FROM pg_roles WHERE rolname = %s', (user,)).fetchone():
            connection.execute(sql.SQL('CREATE ROLE {} LOGIN PASSWORD {}').format(sql.Identifier(user), sql.Literal(password)))
        for database in (name, 'test_' + name):
            if not connection.execute('SELECT 1 FROM pg_database WHERE datname = %s', (database,)).fetchone():
                connection.execute(sql.SQL('CREATE DATABASE {} OWNER {}').format(sql.Identifier(database), sql.Identifier(user)))
    with psycopg.connect(host=host, port=values.get('POSTGRES_PORT') or '5432',
                          dbname=name, user=user, password=password):
        pass
    for key, value in {'POSTGRES_DB': name, 'POSTGRES_USER': user, 'POSTGRES_PASSWORD': password,
                       'POSTGRES_HOST': host, 'POSTGRES_PORT': values.get('POSTGRES_PORT') or '5432'}.items():
        set_key(env_path, key, value)
    if len(values.get('DJANGO_SECRET_KEY') or '') < 32:
        set_key(env_path, 'DJANGO_SECRET_KEY', secrets.token_urlsafe(64))
    print('Local application and test databases are ready. Credentials saved to backend/.env.')


if __name__ == '__main__':
    main()
