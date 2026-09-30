'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  currentUser,
  signOut,
  type StaffUser,
} from '@/features/auth/actions';

import { portalRequest } from '@/features/auth/portal-actions';

import type { Locale } from '@/i18n/dictionaries';

import { translator } from './copy';

import type { Api } from './types';

import {
  MissionList,
  MissionScreen,
} from './Missions';

import {
  StaffScreen,
  VehiclesScreen,
} from './Records';

import Activity from './Activity';
import Dashboard, {
  DashboardIcon,
} from './Dashboard';

import Reports from './Reports';
import Submissions from './Submissions';
import EquipmentScreen from './Equipment';
import VehicleIssues from './VehicleIssues';
import AIAssistant from './AIAssistant';


export default function Portal({
  locale,
  path,
}: {
  locale: Locale;
  path: string;
}) {
  const router = useRouter();

  const pathname = usePathname();

  const search = useSearchParams();

  const [user, setUser] =
    useState<StaffUser>();

  const [error, setError] =
    useState('');

  const [open, setOpen] =
    useState(false);


  const t = useCallback(
    (key: string) =>
      translator(locale)(key),
    [locale],
  );


  const base =
    `/${locale}/portal`;


  const api: Api = useCallback(
    async <T,>(
      endpoint: string,
      method:
        | 'GET'
        | 'POST'
        | 'PATCH' = 'GET',
      body?: unknown,
    ): Promise<T> => {
      const result =
        await portalRequest(
          endpoint,
          method,
          body,
          locale,
        );

      if (!result.ok) {
        if (result.status === 401) {
          router.replace(
            `/${locale}/login`,
          );
        }

        const data =
          result.data as Record<
            string,
            unknown
          >;

        const detail =
          typeof data?.detail ===
          'string'
            ? data.detail
            : '';

        const fields =
          Object.keys(data || {})
            .filter(
              key =>
                key !== 'detail',
            )
            .map(t)
            .join('، ');

        const message =
          result.status === 403
            ? t('noAccess')
            : result.status === 404
              ? t(
                  'resourceNotFound',
                )
              : result.status >= 500
                ? t('unavailable')
                : detail &&
                    t(detail) !==
                      detail
                  ? t(detail)
                  : `${t(
                      'invalidForm',
                    )}${
                      fields
                        ? ` (${fields})`
                        : ''
                    }${
                      data?.password ||
                      data?.new_password
                        ? ` ${t(
                            'passwordRules',
                          )}`
                        : ''
                    }`;

        setError(message);

        throw new Error(
          message,
        );
      }

      setError('');

      return result.data as T;
    },
    [locale, router, t],
  );


  useEffect(() => {
    let live = true;

    currentUser().then(
      result => {
        if (!live) {
          return;
        }

        if (result.user) {
          setUser(
            result.user,
          );
        } else if (
          result.error
        ) {
          setError(
            t('unavailable'),
          );
        } else {
          router.replace(
            `/${locale}/login`,
          );
        }
      },
    );

    return () => {
      live = false;
    };
  }, [
    locale,
    router,
    t,
  ]);


  const missionAccess =
    !!user?.capabilities.includes(
      'manage_missions',
    );

  const staffAccess =
    !!user?.capabilities.includes(
      'manage_staff',
    );

  const vehicleAccess =
    !!user?.capabilities.includes(
      'manage_vehicles',
    );

  const lendingAccess =
    !!user?.capabilities.includes(
      'manage_lending',
    );

  const submissionsAccess =
    !!user?.capabilities.includes(
      'view_team_activity',
    );

  /*
   * The backend AI endpoint uses
   * IsAdminRole, which currently
   * corresponds to management users
   * with view_team_activity.
   */
  const aiAccess =
    !!user?.capabilities.includes(
      'view_team_activity',
    );


  const section =
    path.split('/')[0] ||
    'dashboard';


  const links = [
    { key: 'dashboard', show: true },
    { key: 'ai-assistant', show: aiAccess },
    { key: 'missions', show: missionAccess },
    { key: 'activity', show: missionAccess },
    { key: 'vehicles', show: vehicleAccess },
    { key: 'vehicle-issues', show: vehicleAccess },
    { key: 'equipment', show: lendingAccess },
    { key: 'lending', show: lendingAccess },
    { key: 'reports', show: missionAccess },
    { key: 'submissions', show: submissionsAccess },
    { key: 'staff', show: staffAccess },
  ].filter(
    item => item.show,
  );


  function sectionLabel(
    key: string,
  ) {
    if (
      key ===
      'ai-assistant'
    ) {
      return locale === 'ar'
        ? 'المساعد الذكي'
        : 'AI Assistant';
    }

    return t(key);
  }


  async function logout() {
    if (
      await signOut()
    ) {
      router.replace(
        `/${locale}/login`,
      );
    } else {
      setError(
        t('unavailable'),
      );
    }
  }


  if (!user) {
    return (
      <div className="portal-loading">
        <p
          role={
            error
              ? 'alert'
              : 'status'
          }
        >
          {error ||
            t('loading')}
        </p>

        {error && (
          <button
            className="button button-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            {t('retry')}
          </button>
        )}
      </div>
    );
  }


  return (
    <div className="portal-shell">
      <a
        href="#portal-content"
        className="skip-link"
      >
        {locale === 'ar'
          ? 'انتقل إلى المحتوى'
          : 'Skip to content'}
      </a>


      {open && (
        <button
          className="portal-overlay"
          aria-label={
            t('close')
          }
          onClick={() =>
            setOpen(false)
          }
        />
      )}


      <aside
        className={`portal-sidebar ${
          open
            ? 'is-open'
            : ''
        }`}
      >
        <Link
          href={base}
          className="portal-brand"
        >
          <Image
            src="/ima-logo.png"
            width={32}
            height={32}
            alt="IMA"
          />

          <span>
            {locale === 'ar'
              ? 'الجمعية الطبية الإسلامية'
              : 'Islamic Medical Association'}

            <small>
              {t('portal')}
            </small>
          </span>
        </Link>


        <nav
          aria-label={
            t('menu')
          }
        >
          {links.map(
            link => (
              <Link
                key={
                  link.key
                }
                href={
                  link.key ===
                  'dashboard'
                    ? base
                    : `${base}/${link.key}`
                }
                aria-current={
                  section ===
                  link.key
                    ? 'page'
                    : undefined
                }
                onClick={() =>
                  setOpen(
                    false,
                  )
                }
              >
                <DashboardIcon
                  name={
                    link.key
                  }
                />

                {sectionLabel(
                  link.key,
                )}
              </Link>
            ),
          )}
        </nav>


        <div className="portal-sidebar-bottom">
          <p>
            {user.first_name ||
              user.username}

            <small>
              {t(user.role)}
            </small>
          </p>

          <button
            onClick={logout}
          >
            {t('logout')} ↗
          </button>

          <Link
            href={`/${locale}`}
          >
            {t('home')}
          </Link>
        </div>
      </aside>


      <div className="portal-workspace">
        <header className="portal-topbar">
          <button
            className="portal-mobile-toggle"
            onClick={() =>
              setOpen(!open)
            }
            aria-expanded={
              open
            }
          >
            {t('menu')}
          </button>


          <span>
            {sectionLabel(
              section,
            )}
          </span>


          <div>
            <a
              href={`${pathname.replace(
                `/${locale}/`,
                `/${
                  locale ===
                  'en'
                    ? 'ar'
                    : 'en'
                }/`,
              )}${
                search.size
                  ? `?${search}`
                  : ''
              }`}
              lang={
                locale ===
                'en'
                  ? 'ar'
                  : 'en'
              }
            >
              {locale ===
              'en'
                ? 'العربية'
                : 'English'}
            </a>


            <span className="portal-avatar">
              {user.username
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
        </header>


        <main
          id="portal-content"
          className="portal-content"
          tabIndex={-1}
        >
          {error && (
            <div
              role="alert"
              className="portal-error"
            >
              {error}

              <button
                onClick={() =>
                  setError('')
                }
                aria-label={
                  t('close')
                }
              >
                ×
              </button>
            </div>
          )}


          <div
            key={
              path +
              search.toString()
            }
          >
            {section ===
            'dashboard' ? (
              <Dashboard
                api={api}
                t={t}
                base={base}
                user={user}
                locale={
                  locale
                }
              />
            ) : section ===
                'missions' &&
              missionAccess ? (
              path ===
              'missions' ? (
                <MissionList
                  api={api}
                  t={t}
                  base={base}
                />
              ) : (
                <MissionScreen
                  api={api}
                  t={t}
                  base={base}
                  user={user}
                  id={
                    path.split(
                      '/',
                    )[1]
                  }
                />
              )
            ) : (
                section ===
                  'equipment' ||
                section ===
                  'lending'
              ) &&
              lendingAccess ? (
              <EquipmentScreen
                api={api}
                t={t}
                locale={
                  locale
                }
                lending={
                  section ===
                  'lending'
                }
              />
            ) : section ===
                'reports' &&
              missionAccess ? (
              <Reports
                api={api}
                t={t}
                base={base}
                locale={
                  locale
                }
              />
            ) : section ===
                'submissions' &&
              submissionsAccess ? (
              <Submissions
                api={api}
                t={t}
                locale={
                  locale
                }
              />
            ) : section ===
                'ai-assistant' &&
              aiAccess ? (
              <AIAssistant
                  api={api}
                  locale={locale}
                  base={base}
                  canManageVehicles={vehicleAccess}
                  canManageLending={lendingAccess}
               />
            ) : section ===
                'staff' &&
              staffAccess ? (
              <StaffScreen
                api={api}
                t={t}
              />
            ) : section ===
                'vehicle-issues' &&
              vehicleAccess ? (
              <VehicleIssues
                api={api}
                t={t}
                base={base}
                locale={
                  locale
                }
                id={
                  path.split(
                    '/',
                  )[1]
                }
              />
            ) : section ===
                'vehicles' &&
              vehicleAccess ? (
              <VehiclesScreen
                api={api}
                t={t}
              />
            ) : section ===
                'activity' &&
              missionAccess ? (
              <Activity
                api={api}
                t={t}
                base={base}
                user={user}
                locale={
                  locale
                }
              />
            ) : (
              <div className="portal-card">
                {t(
                  'noAccess',
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}