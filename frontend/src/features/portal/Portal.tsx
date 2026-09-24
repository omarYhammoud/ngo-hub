'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { currentUser, signOut, type StaffUser } from '@/features/auth/actions';
import { portalRequest } from '@/features/auth/portal-actions';
import type { Locale } from '@/i18n/dictionaries';
import { translator } from './copy';
import type { Api } from './types';
import { MissionList, MissionScreen } from './Missions';
import { StaffScreen, VehiclesScreen } from './Records';
import Dashboard, { DashboardIcon } from './Dashboard';

export default function Portal({ locale, path }: { locale: Locale; path: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [user, setUser] = useState<StaffUser>();
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const t = useCallback((key: string) => translator(locale)(key), [locale]);
  const base = `/${locale}/portal`;
  const api: Api = useCallback(async <T,>(endpoint: string, method: 'GET'|'POST'|'PATCH' = 'GET', body?: unknown): Promise<T> => {
    const result = await portalRequest(endpoint, method, body, locale);
    if (!result.ok) {
      if (result.status === 401) router.replace(`/${locale}/login`);
      const data = result.data as Record<string, unknown>;
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      const fields = Object.keys(data || {}).filter(key => key !== 'detail').map(t).join('، ');
      const message = result.status === 403 || result.status === 404 ? t('noAccess') : detail && t(detail) !== detail ? t(detail) : `${t('invalidForm')}${fields ? ` (${fields})` : ''}${data?.password || data?.new_password ? ` ${t('passwordRules')}` : ''}`;
      setError(message);
      throw new Error(message);
    }
    setError('');
    return result.data as T;
  }, [locale, router, t]);
  useEffect(() => {
    let live = true;
    currentUser().then(result => {
      if (!live) return;
      if (result.user) setUser(result.user);
      else if (result.error) setError(t('unavailable'));
      else router.replace(`/${locale}/login`);
    });
    return () => { live = false; };
  }, [locale, router, t]);
  const missionAccess = !!user?.capabilities.includes('manage_missions');
  const staffAccess = !!user?.capabilities.includes('manage_staff');
  const vehicleAccess = !!user?.capabilities.includes('manage_vehicles');
  const section = path.split('/')[0] || 'dashboard';
  const links = [{ key: 'dashboard', show: true }, { key: 'missions', show: missionAccess }, { key: 'activity', show: missionAccess }, { key: 'staff', show: staffAccess }, { key: 'vehicles', show: vehicleAccess }].filter(item => item.show);
  async function logout() {
    if (await signOut()) router.replace(`/${locale}/login`);
    else setError(t('unavailable'));
  }
  if (!user) return <div className="portal-loading"><p role={error ? 'alert' : 'status'}>{error || t('loading')}</p>{error && <button className="button button-primary" onClick={() => window.location.reload()}>{t('retry')}</button>}</div>;
  return <div className="portal-shell">
    <a href="#portal-content" className="skip-link">{locale === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
    {open && <button className="portal-overlay" aria-label={t('close')} onClick={() => setOpen(false)}/>}
    <aside className={`portal-sidebar ${open ? 'is-open' : ''}`}>
      <Link href={base} className="portal-brand"><Image src="/ima-logo.png" width={32} height={32} alt="IMA"/><span>{locale === 'ar' ? 'الجمعية الطبية الإسلامية' : 'Islamic Medical Association'}<small>{t('portal')}</small></span></Link>
      <nav aria-label={t('menu')}>{links.map(link => <Link key={link.key} href={link.key === 'dashboard' ? base : `${base}/${link.key}`} aria-current={section === link.key ? 'page' : undefined} onClick={() => setOpen(false)}><DashboardIcon name={link.key}/>{t(link.key)}</Link>)}</nav>
      <div className="portal-sidebar-bottom"><p>{user.first_name || user.username}<small>{t(user.role)}</small></p><button onClick={logout}>{t('logout')} ↗</button><Link href={`/${locale}`}>{t('home')}</Link></div>
    </aside>
    <div className="portal-workspace"><header className="portal-topbar"><button className="portal-mobile-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{t('menu')}</button><span>{t(section)}</span><div><a href={`${pathname.replace(`/${locale}/`, `/${locale === 'en' ? 'ar' : 'en'}/`)}${search.size ? `?${search}` : ''}`} lang={locale === 'en' ? 'ar' : 'en'}>{locale === 'en' ? 'العربية' : 'English'}</a><span className="portal-avatar">{user.username.slice(0, 2).toUpperCase()}</span></div></header>
      <main id="portal-content" className="portal-content" tabIndex={-1}>
        {error && <div role="alert" className="portal-error">{error}<button onClick={() => setError('')} aria-label={t('close')}>×</button></div>}
        <div key={path + search.toString()}>
          {section === 'dashboard' ? <Dashboard api={api} t={t} base={base} user={user} locale={locale}/> :
           section === 'missions' && missionAccess ? (path === 'missions' ? <MissionList api={api} t={t} base={base}/> : <MissionScreen api={api} t={t} base={base} user={user} id={path.split('/')[1]}/>) :
           section === 'staff' && staffAccess ? <StaffScreen api={api} t={t}/> :
           section === 'vehicles' && vehicleAccess ? <VehiclesScreen api={api} t={t}/> :
           section === 'activity' && missionAccess ? <Activity api={api} t={t}/> : <div className="portal-card">{t('noAccess')}</div>}
        </div>
      </main>
    </div>
  </div>;
}

function Activity({
  api,
  t,
}: {
  api: Api;
  t: (key: string) => string;
}) {
  type ActivityRow = {
    id: number;
    user_id: number;
    staff_name: string;
    crew_role: string;
    mission_id: number;
    mission_number: string;
    date: string | null;
    incident_type: string;
    location: string;
    status: string;
  };

  type ActivityResponse = {
    count: number;
    completed_missions: number;
    results: ActivityRow[];
  };

  const [data, setData] = useState<ActivityResponse>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
      });

      if (filters.dateFrom) {
        params.set('date_from', filters.dateFrom);
      }

      if (filters.dateTo) {
        params.set('date_to', filters.dateTo);
      }

      try {
        const result = await api<ActivityResponse>(
          `missions/activity-history/?${params.toString()}`
        );

        if (active) {
          setData(result);
        }
      } catch {
        if (active) {
          setData(undefined);
          setError('activityLoadError');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [api, filters, page, retry]);

  function crewRoleLabel(value: string) {
    const keys: Record<string, string> = {
      'مسعف': 'crewParamedic',
      'مساعد مسعف': 'crewAssistant',
      'مسؤول مهمة': 'crewLeader',
      'سائق': 'crewDriver',
    };

    return value ? (keys[value] ? t(keys[value]) : value) : '—';
  }

  return (
    <>
      <div className="portal-heading">
        <div>
          <h1>{t('activity')}</h1>
          <p>{t('activityHint')}</p>
        </div>
      </div>

      <form
        className="portal-card portal-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({ dateFrom, dateTo });
        }}
      >
        <label className="portal-field">
          {t('date_from')}
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className="portal-field">
          {t('date_to')}
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        <div className="portal-buttons">
          <button type="submit" className="button button-primary">
            {t('search')}
          </button>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setFilters({ dateFrom: '', dateTo: '' });
              setPage(1);
            }}
          >
            {t('clear')}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="portal-card" role="status">
          {t('loading')}
        </div>
      ) : error ? (
        <div className="portal-card">
          <p role="alert">{t(error)}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t('retry')}
          </button>
        </div>
      ) : data ? (
        <>
          <div className="portal-card">
            <p>
              {t('activityMissionTotal')}:{' '}
              <strong>{data.completed_missions}</strong>
            </p>
            <p>
              {t('activityParticipationTotal')}:{' '}
              <strong>{data.count}</strong>
            </p>
          </div>

          <div className="portal-card portal-table-wrap">
            {!data.results.length ? (
              <p>{t('empty')}</p>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>{t('activityStaffName')}</th>
                    <th>{t('mission_number')}</th>
                    <th>{t('date')}</th>
                    <th>{t('incident_type')}</th>
                    <th>{t('location')}</th>
                    <th>{t('crew_role')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>

                <tbody>
                  {data.results.map((row) => (
                    <tr key={row.id}>
                      <td>{row.staff_name}</td>
                      <td>{row.mission_number}</td>
                      <td>{row.date || '—'}</td>
                      <td>
                        {row.incident_type
                          ? t(row.incident_type)
                          : '—'}
                      </td>
                      <td>{row.location || '—'}</td>
                      <td>{crewRoleLabel(row.crew_role)}</td>
                      <td>
                        <span className={`portal-badge ${row.status}`}>
                          {t(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.count > 20 && (
            <div className="portal-buttons">
              <button
                type="button"
                className="button button-secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t('previous')}
              </button>

              <span>
                {t('page')} {page}
              </span>

              <button
                type="button"
                className="button button-secondary"
                disabled={page * 20 >= data.count}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('next')}
              </button>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
