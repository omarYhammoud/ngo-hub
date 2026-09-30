'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import type { StaffUser } from '@/features/auth/actions';
import type { Locale } from '@/i18n/dictionaries';

import type { Api } from './types';
import type { T } from './copy';

import './activity.css';

type ActivityData = {
  count: number;
  completed_missions: number;
  undated_missions: number;

  staff_options: {
    id: number;
    name: string;
  }[];

  monthly: {
    month: string;
    total: number;
  }[];

  incident_types: {
    incident_type: string;
    total: number;
  }[];

  results: {
    id: number;
    staff_name: string;
    crew_role: string;
    mission_id: number;
    mission_number: string;
    date: string | null;
    incident_type: string;
    location: string;
    status: string;
  }[];
};

export default function Activity({
  api,
  t,
  base,
  user,
  locale,
}: {
  api: Api;
  t: T;
  base: string;
  user: StaffUser;
  locale: Locale;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const teamAccess =
    user.capabilities.includes('view_team_activity');

  const [dateFrom, setDateFrom] =
    useState(search.get('date_from') || '');

  const [dateTo, setDateTo] =
    useState(search.get('date_to') || '');

  const [staff, setStaff] =
    useState(
      teamAccess
        ? search.get('user_id') || ''
        : '',
    );

  const [data, setData] =
    useState<ActivityData>();

  const [failed, setFailed] =
    useState(false);

  const [retry, setRetry] =
    useState(0);

  const page = Math.max(
    1,
    Number(search.get('page')) || 1,
  );

  const params =
    new URLSearchParams({
      page: String(page),
    });

  for (const key of [
    'date_from',
    'date_to',
    ...(teamAccess
      ? ['user_id']
      : []),
  ]) {
    if (search.get(key)) {
      params.set(
        key,
        search.get(key)!,
      );
    }
  }

  const query =
    params.toString();

  useEffect(() => {
    let active = true;

    api<ActivityData>(
      `missions/activity-history/?${query}`,
    )
      .then(result => {
        if (
          !Array.isArray(
            result.staff_options,
          ) ||
          !Array.isArray(
            result.monthly,
          ) ||
          !Array.isArray(
            result.incident_types,
          )
        ) {
          throw new Error(
            'Incomplete activity response',
          );
        }

        if (active) {
          setData(result);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    api,
    query,
    retry,
  ]);

  function navigate(
    nextPage: number,
  ) {
    const next =
      new URLSearchParams(query);

    next.set(
      'page',
      String(nextPage),
    );

    router.push(
      `${base}/activity?${next}`,
    );
  }

  function crewLabel(
    value: string,
  ) {
    const keys: Record<
      string,
      string
    > = {
      مسعف:
        'crewParamedic',

      'مساعد مسعف':
        'crewAssistant',

      'مسؤول مهمة':
        'crewLeader',

      سائق:
        'crewDriver',
    };

    return value
      ? t(
          keys[value] ||
            value,
        )
      : '—';
  }

  const number = (
    value: number,
  ) =>
    value.toLocaleString(
      locale,
    );

  const maxIncident =
    Math.max(
      1,
      ...(
        data?.incident_types.map(
          item =>
            item.total,
        ) || []
      ),
    );

  return (
    <>
      <div className="portal-heading">
        <div>
          <h1>
            {t(
              'activity',
            )}
          </h1>

          <p>
            {t(
              'activityHint',
            )}
          </p>
        </div>
      </div>

      <form
        className="portal-card portal-filters"
        onSubmit={event => {
          event.preventDefault();

          const form =
            new FormData(
              event.currentTarget,
            );

          const next =
            new URLSearchParams();

          for (const key of [
            'date_from',
            'date_to',
          ]) {
            const value =
              String(
                form.get(
                  key,
                ) || '',
              );

            if (value) {
              next.set(
                key,
                value,
              );
            }
          }

          if (
            staff &&
            teamAccess
          ) {
            next.set(
              'user_id',
              staff,
            );
          }

          router.push(
            `${base}/activity${
              next.size
                ? `?${next}`
                : ''
            }`,
          );
        }}
      >
        {teamAccess && (
          <label className="portal-field">
            {t(
              'activityStaffName',
            )}

            <select
              value={staff}
              onChange={
                event =>
                  setStaff(
                    event
                      .target
                      .value,
                  )
              }
            >
              <option value="">
                {t('all')}
              </option>

              {staff &&
                !data?.staff_options.some(
                  option =>
                    String(
                      option.id,
                    ) ===
                    staff,
                ) && (
                  <option
                    value={
                      staff
                    }
                  >
                    #{staff}
                  </option>
                )}

              {data?.staff_options.map(
                option => (
                  <option
                    key={
                      option.id
                    }
                    value={
                      option.id
                    }
                  >
                    {
                      option.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        <label className="portal-field">
          {t(
            'date_from',
          )}

          <input
            name="date_from"
            type="date"
            value={
              dateFrom
            }
            max={
              dateTo ||
              undefined
            }
            onChange={
              event =>
                setDateFrom(
                  event
                    .target
                    .value,
                )
            }
          />
        </label>

        <label className="portal-field">
          {t(
            'date_to',
          )}

          <input
            name="date_to"
            type="date"
            value={
              dateTo
            }
            min={
              dateFrom ||
              undefined
            }
            onChange={
              event =>
                setDateTo(
                  event
                    .target
                    .value,
                )
            }
          />
        </label>

        <div className="portal-buttons">
          <button
            className="button button-primary"
            type="submit"
          >
            {t(
              'search',
            )}
          </button>

          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setStaff('');
              setDateFrom('');
              setDateTo('');

              router.push(
                `${base}/activity`,
              );
            }}
          >
            {t(
              'clear',
            )}
          </button>
        </div>
      </form>

      {failed ? (
        <div
          className="portal-card"
          role="alert"
        >
          <p>
            {t(
              'activityLoadError',
            )}
          </p>

          <button
            className="button button-secondary"
            onClick={() => {
              setFailed(false);

              setRetry(
                value =>
                  value + 1,
              );
            }}
          >
            {t(
              'retry',
            )}
          </button>
        </div>
      ) : !data ? (
        <div
          className="portal-card"
          role="status"
        >
          {t(
            'loading',
          )}
        </div>
      ) : (
        <>
          <div className="activity-stats">
            <section className="portal-card activity-summary-card">
              <h2>
                {t(
                  'activityMissionTotal',
                )}
              </h2>

              <strong className="activity-total">
                {number(
                  data.completed_missions,
                )}
              </strong>
            </section>

            <section className="portal-card activity-summary-card">
              <h2>
                {t(
                  'activityParticipationTotal',
                )}
              </h2>

              <strong className="activity-total">
                {number(
                  data.count,
                )}
              </strong>
            </section>
          </div>

          <div className="activity-stats">
            <section className="portal-card activity-month-card">
              <h2>
                {t(
                  'activityMonthly',
                )}
              </h2>

              {!data.monthly.length ? (
                <p>
                  {t(
                    'empty',
                  )}
                </p>
              ) : (
                <>
                  <div className="activity-month-primary">
                    <div className="activity-month-number">
                      {number(
                        data.monthly[0]
                          .total,
                      )}
                    </div>

                    <div className="activity-month-info">
                      <strong>
                        {new Intl.DateTimeFormat(
                          locale,
                          {
                            month:
                              'long',
                            year:
                              'numeric',
                            timeZone:
                              'UTC',
                          },
                        ).format(
                          new Date(
                            `${data.monthly[0].month}T00:00:00Z`,
                          ),
                        )}
                      </strong>

                      <span>
                        {t(
                          'activityMissionTotal',
                        )}
                      </span>
                    </div>
                  </div>

                  {data.monthly.length >
                    1 && (
                    <div className="activity-month-previous">
                      {data.monthly
                        .slice(1)
                        .map(
                          row => (
                            <div
                              className="activity-month-row"
                              key={
                                row.month
                              }
                            >
                              <span>
                                {new Intl.DateTimeFormat(
                                  locale,
                                  {
                                    month:
                                      'short',
                                    year:
                                      'numeric',
                                    timeZone:
                                      'UTC',
                                  },
                                ).format(
                                  new Date(
                                    `${row.month}T00:00:00Z`,
                                  ),
                                )}
                              </span>

                              <strong>
                                {number(
                                  row.total,
                                )}
                              </strong>
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </>
              )}

              {data.undated_missions >
                0 && (
                <p className="activity-undated">
                  {t(
                    'activityUndated',
                  )}
                  :{' '}
                  {number(
                    data.undated_missions,
                  )}
                </p>
              )}
            </section>

            <section className="portal-card activity-breakdown-card">
              <h2>
                {t(
                  'activityIncidents',
                )}
              </h2>

              {!data
                .incident_types
                .length ? (
                <p>
                  {t(
                    'empty',
                  )}
                </p>
              ) : (
                <div className="activity-chart-list">
                  {data.incident_types.map(
                    row => (
                      <div
                        className="activity-chart-row"
                        key={
                          row.incident_type ||
                          'unspecified'
                        }
                      >
                        <div className="activity-chart-label">
                          <span>
                            {row.incident_type
                              ? t(
                                  row.incident_type,
                                )
                              : t(
                                  'activityUnspecified',
                                )}
                          </span>

                          <strong>
                            {number(
                              row.total,
                            )}
                          </strong>
                        </div>

                        <div className="activity-chart-track">
                          <div
                            className="activity-chart-fill"
                            style={{
                              width: `${(
                                row.total /
                                maxIncident
                              ) *
                                100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="portal-card portal-table-wrap activity-history">
            <h2>
              {t(
                'activityHistory',
              )}
            </h2>

            {!data.results.length ? (
              <p>
                {t(
                  'empty',
                )}
              </p>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    {[
                      'activityStaffName',
                      'mission_number',
                      'date',
                      'incident_type',
                      'location',
                      'crew_role',
                      'status',
                    ].map(
                      key => (
                        <th
                          key={
                            key
                          }
                          scope="col"
                        >
                          {t(
                            key,
                          )}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {data.results.map(
                    row => (
                      <tr
                        key={
                          row.id
                        }
                      >
                        <td>
                          {
                            row.staff_name
                          }
                        </td>

                        <td>
                          <Link
                            className="activity-mission-link"
                            href={`${base}/missions/${row.mission_id}`}
                          >
                            {row.mission_number ||
                              `#${row.mission_id}`}
                          </Link>
                        </td>

                        <td>
                          {row.date ||
                            '—'}
                        </td>

                        <td>
                          {row.incident_type
                            ? t(
                                row.incident_type,
                              )
                            : '—'}
                        </td>

                        <td>
                          {row.location ||
                            '—'}
                        </td>

                        <td>
                          {crewLabel(
                            row.crew_role,
                          )}
                        </td>

                        <td>
                          <span
                            className={`portal-badge ${row.status}`}
                          >
                            {t(
                              row.status,
                            )}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </section>

          {(data.count > 20 ||
            page > 1) && (
            <div className="portal-buttons">
              <button
                className="button button-secondary"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  navigate(
                    page - 1,
                  )
                }
              >
                {t(
                  'previous',
                )}
              </button>

              <span>
                {t(
                  'page',
                )}{' '}
                {number(
                  page,
                )}
              </span>

              <button
                className="button button-secondary"
                disabled={
                  page * 20 >=
                  data.count
                }
                onClick={() =>
                  navigate(
                    page + 1,
                  )
                }
              >
                {t(
                  'next',
                )}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}