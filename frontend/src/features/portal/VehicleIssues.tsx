'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import type { Locale } from '@/i18n/dictionaries';

import type {
  Api,
  Vehicle,
  VehicleIssue,
  VehicleIssueSummary,
} from './types';

import type { T } from './copy';

import {
  Field,
  Notice,
} from './ui';

const statuses = [
  'OPEN',
  'IN_MAINTENANCE',
  'RESOLVED',
];

const severities = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

function Badge({
  value,
  t,
}: {
  value: string;
  t: T;
}) {
  const toneClass =
    value === 'OPEN'
      ? 'vehicle-status-open'
      : value === 'IN_MAINTENANCE'
        ? 'vehicle-status-maintenance'
        : value === 'RESOLVED'
          ? 'vehicle-status-resolved'
          : value === 'LOW'
            ? 'vehicle-severity-low'
            : value === 'MEDIUM'
              ? 'vehicle-severity-medium'
              : value === 'HIGH'
                ? 'vehicle-severity-high'
                : value === 'CRITICAL'
                  ? 'vehicle-severity-critical'
                  : '';

  return (
    <span
      className={`vehicle-badge ${toneClass}`}
    >
      {t(`vi_${value}`)}
    </span>
  );
}

export default function VehicleIssues({
  api,
  t,
  base,
  locale,
  id,
}: {
  api: Api;
  t: T;
  base: string;
  locale: Locale;
  id?: string;
}) {
  const router =
    useRouter();

  const search =
    useSearchParams();

  const [
    vehicles,
    setVehicles,
  ] =
    useState<Vehicle[]>();

  const [
    list,
    setList,
  ] =
    useState<{
      count: number;
      results: VehicleIssue[];
    }>();

  const [
    summary,
    setSummary,
  ] =
    useState<VehicleIssueSummary>();

  const [
    issue,
    setIssue,
  ] =
    useState<VehicleIssue>();

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  const [
    version,
    setVersion,
  ] =
    useState(0);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    ready,
    setReady,
  ] =
    useState(false);

  const root =
    `${base}/vehicle-issues`;

  useEffect(() => {
    let live = true;

    async function load() {
      try {
        const fleet =
          await api<Vehicle[]>(
            'vehicles/',
          );

        if (live) {
          setVehicles(
            fleet,
          );
        }

        if (
          id &&
          id !== 'new'
        ) {
          const result =
            await api<VehicleIssue>(
              `vehicle-issues/${id}/`,
            );

          if (live) {
            setIssue(
              result,
            );
          }
        } else if (!id) {
          const result =
            await api<{
              count: number;
              results: VehicleIssue[];
            }>(
              `vehicle-issues/?${search}`,
            );

          const counts =
            await api<VehicleIssueSummary>(
              `vehicle-issues/summary/?${search}`,
            );

          if (live) {
            setList(
              result,
            );

            setSummary(
              counts,
            );
          }
        }

        if (live) {
          setReady(
            true,
          );

          setFailed(
            false,
          );
        }
      } catch {
        if (live) {
          setFailed(
            true,
          );
        }
      }
    }

    void load();

    return () => {
      live = false;
    };
  }, [
    api,
    id,
    search,
    version,
  ]);

  function refresh() {
    setReady(
      false,
    );

    setVersion(
      value =>
        value + 1,
    );
  }

  async function report(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(
      true,
    );

    const form =
      new FormData(
        event.currentTarget,
      );

    try {
      const result =
        await api<VehicleIssue>(
          'vehicle-issues/',
          'POST',
          {
            vehicle:
              Number(
                form.get(
                  'vehicle',
                ),
              ),

            category:
              String(
                form.get(
                  'category',
                ),
              ),

            severity:
              String(
                form.get(
                  'severity',
                ),
              ),

            description:
              String(
                form.get(
                  'description',
                ),
              ),
          },
        );

      router.push(
        `${root}/${result.id}`,
      );
    } catch {
      // API errors are handled by the portal layer.
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function update(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!issue) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget,
        (
          event.nativeEvent as SubmitEvent
        ).submitter,
      );

    const command =
      String(
        form.get(
          'command',
        ) || 'notes',
      );

    setBusy(
      true,
    );

    setMessage(
      '',
    );

    try {
      await api<VehicleIssue>(
        `vehicle-issues/${issue.id}/${
          command === 'notes'
            ? ''
            : `${command}/`
        }`,
        command === 'notes'
          ? 'PATCH'
          : 'POST',
        {
          maintenance_notes:
            String(
              form.get(
                'maintenance_notes',
              ) || '',
            ),
        },
      );

      setMessage(
        t('saved'),
      );

      refresh();
    } catch {
      // API errors are handled by the portal layer.
    } finally {
      setBusy(
        false,
      );
    }
  }

  function filter(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const query =
      new URLSearchParams();

    new FormData(
      event.currentTarget,
    ).forEach(
      (
        value,
        key,
      ) => {
        if (value) {
          query.set(
            key,
            String(
              value,
            ),
          );
        }
      },
    );

    router.push(
      `${root}?${query}`,
    );
  }

  const date = (
    value:
      | string
      | null,
  ) =>
    value
      ? new Date(
          value,
        ).toLocaleString(
          locale,
        )
      : '—';

  const page =
    Number(
      search.get(
        'page',
      ) || 1,
    );

  function paginate(
    value: number,
  ) {
    const query =
      new URLSearchParams(
        search,
      );

    query.set(
      'page',
      String(
        value,
      ),
    );

    router.push(
      `${root}?${query}`,
    );
  }

  if (failed) {
    return (
      <div className="portal-card">
        <p>
          {t(
            'vi_load_failed',
          )}
        </p>

        <div className="portal-buttons">
          <button
            className="button button-secondary"
            onClick={
              refresh
            }
          >
            {t(
              'retry',
            )}
          </button>

          <Link
            className="portal-back"
            href={
              root
            }
          >
            {t(
              'vi_back',
            )}
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <p role="status">
        {t(
          'loading',
        )}
      </p>
    );
  }

  return (
    <>
      <div className="portal-heading vehicle-issues-heading">
        <div>
          {id && (
            <Link
              className="portal-back"
              href={
                root
              }
            >
              {t(
                'vi_back',
              )}
            </Link>
          )}

          <h1>
            {id === 'new'
              ? t(
                  'vi_report',
                )
              : issue
                ? `${t(
                    'vi_issue',
                  )} #${issue.id}`
                : t(
                    'vehicle-issues',
                  )}
          </h1>

          <p>
            {t(
              'vi_hint',
            )}
          </p>
        </div>

        {!id && (
          <Link
            className="button button-primary vehicle-issue-primary-action"
            href={`${root}/new`}
          >
            +{' '}
            {t(
              'vi_report',
            )}
          </Link>
        )}
      </div>

      {message && (
        <p
          role="status"
          className="vehicle-save-message"
        >
          {
            message
          }
        </p>
      )}

      {/* =====================================================
          NEW ISSUE
          ===================================================== */}
      {id === 'new' ? (
        <form
          method="post"
          className="portal-card vehicle-issue-form"
          onSubmit={
            report
          }
        >
          <fieldset
            className="portal-form-grid"
            disabled={
              busy
            }
          >
            <Field
              label={t(
                'vehicle',
              )}
            >
              <select
                name="vehicle"
                required
                defaultValue=""
              >
                <option value="">
                  {t(
                    'select',
                  )}
                </option>

                {vehicles?.map(
                  vehicle => (
                    <option
                      key={
                        vehicle.id
                      }
                      value={
                        vehicle.id
                      }
                    >
                      {
                        vehicle.code
                      }{' '}
                      ·{' '}
                      {
                        vehicle.plate_number
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'vi_category',
              )}
            >
              <input
                name="category"
                required
                maxLength={
                  100
                }
              />
            </Field>

            <Field
              label={t(
                'vi_severity',
              )}
            >
              <select
                name="severity"
                defaultValue="MEDIUM"
              >
                {severities.map(
                  severity => (
                    <option
                      key={
                        severity
                      }
                      value={
                        severity
                      }
                    >
                      {t(
                        `vi_${severity}`,
                      )}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <div className="portal-full">
              <Field
                label={t(
                  'vi_description',
                )}
              >
                <textarea
                  name="description"
                  rows={4}
                  required
                  maxLength={
                    10000
                  }
                />
              </Field>
            </div>

            <div className="portal-full portal-buttons vehicle-issue-form-actions">
              <button
                className="button button-primary"
                disabled={
                  busy
                }
              >
                {busy
                  ? t(
                      'loading',
                    )
                  : t(
                      'vi_report',
                    )}
              </button>
            </div>
          </fieldset>
        </form>
      ) : issue ? (
        <>
          {/* =================================================
              ISSUE RECORD
              ================================================= */}
          <section className="portal-card vehicle-record-card">
            <div className="vehicle-record-top">
              <div>
                <div className="vehicle-record-badges">
                  <Badge
                    value={
                      issue.status
                    }
                    t={t}
                  />

                  <Badge
                    value={
                      issue.severity
                    }
                    t={t}
                  />
                </div>

                <h2 className="vehicle-record-vehicle">
                  {
                    issue.vehicle_code
                  }

                  <span>
                    {' '}
                    ·{' '}
                    {t(
                      issue.vehicle_status,
                    )}
                  </span>
                </h2>

                <p className="vehicle-record-category">
                  {
                    issue.category
                  }
                </p>
              </div>
            </div>

            <div className="vehicle-record-meta">
              <div>
                <span>
                  {t(
                    'vi_reported_by',
                  )}
                </span>

                <strong>
                  {
                    issue.reported_by_name
                  }
                </strong>
              </div>

              <div>
                <span>
                  {t(
                    'vi_reported_at',
                  )}
                </span>

                <strong>
                  {date(
                    issue.reported_at,
                  )}
                </strong>
              </div>

              {issue.status ===
                'RESOLVED' && (
                <>
                  <div>
                    <span>
                      {t(
                        'vi_resolved_by',
                      )}
                    </span>

                    <strong>
                      {issue.resolved_by_name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {t(
                        'vi_resolved_at',
                      )}
                    </span>

                    <strong>
                      {date(
                        issue.resolved_at,
                      )}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div className="vehicle-record-description">
              <span>
                {t(
                  'vi_description',
                )}
              </span>

              <p>
                {issue.description ||
                  '—'}
              </p>
            </div>

            {issue.manual_maintenance && (
              <Notice
                text={t(
                  'vi_manual_hold',
                )}
              />
            )}
          </section>

          {/* =================================================
              RESOLUTION / MAINTENANCE
              ================================================= */}
          {issue.status ===
          'RESOLVED' ? (
            <section className="portal-card vehicle-resolution-card">
              <div className="vehicle-resolution-header">
                <div className="vehicle-resolution-icon">
                  ✓
                </div>

                <div>
                  <h2>
                    {locale ===
                    'ar'
                      ? 'تم حل المشكلة'
                      : 'Issue resolved'}
                  </h2>

                  <p>
                    {locale ===
                    'ar'
                      ? 'تم إغلاق هذا البلاغ ولا يمكن تعديله.'
                      : 'This issue is closed and can no longer be modified.'}
                  </p>
                </div>
              </div>

              <div className="vehicle-resolution-notes">
                <span>
                  {t(
                    'vi_notes',
                  )}
                </span>

                <p>
                  {issue.maintenance_notes ||
                    '—'}
                </p>
              </div>
            </section>
          ) : (
            <form
              method="post"
              key={`${issue.id}-${version}`}
              className="portal-card vehicle-maintenance-card"
              onSubmit={
                update
              }
            >
              <h2>
                {t(
                  'vi_notes',
                )}
              </h2>

              <fieldset
                disabled={
                  busy
                }
              >
                <Field
                  label={t(
                    'vi_notes',
                  )}
                >
                  <textarea
                    name="maintenance_notes"
                    defaultValue={
                      issue.maintenance_notes
                    }
                    rows={4}
                    maxLength={
                      10000
                    }
                  />
                </Field>

                <Notice
                  text={t(
                    'vi_resolution_hint',
                  )}
                />

                <div className="portal-buttons">
                  <button
                    className="button button-secondary"
                    name="command"
                    value="notes"
                  >
                    {t(
                      'save',
                    )}
                  </button>

                  {issue.status ===
                    'OPEN' && (
                    <button
                      className="button button-primary"
                      type="submit"
                      name="command"
                      value="maintenance"
                    >
                      {t(
                        'vi_send',
                      )}
                    </button>
                  )}

                  <button
                    className="button button-positive"
                    type="submit"
                    name="command"
                    value="resolve"
                  >
                    {t(
                      'vi_resolve',
                    )}
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {/* =================================================
              ACTIVITY TIMELINE
              ================================================= */}
          <section className="portal-card vehicle-timeline-card">
            <h2>
              {t(
                'audit',
              )}
            </h2>

            {!issue.audit?.length ? (
              <div className="portal-empty">
                <p>
                  {t(
                    'empty',
                  )}
                </p>
              </div>
            ) : (
              <div className="vehicle-timeline">
                {issue.audit.map(
                  (
                    entry,
                    index,
                  ) => {
                    const changedKeys =
                      Object.keys(
                        entry.after,
                      ).filter(
                        key =>
                          JSON.stringify(
                            entry.before[
                              key
                            ],
                          ) !==
                          JSON.stringify(
                            entry.after[
                              key
                            ],
                          ),
                      );

                    return (
                      <div
                        className="vehicle-timeline-item"
                        key={
                          entry.id
                        }
                      >
                        <div className="vehicle-timeline-marker">
                          <span />

                          {index <
                            issue.audit!
                              .length -
                              1 && (
                            <i />
                          )}
                        </div>

                        <div className="vehicle-timeline-content">
                          <div className="vehicle-timeline-heading">
                            <strong>
                              {t(
                                `vi_action_${entry.action}`,
                              )}
                            </strong>

                            <time>
                              {date(
                                entry.created_at,
                              )}
                            </time>
                          </div>

                          <p>
                            {
                              entry.actor_name
                            }
                          </p>

                          {changedKeys.length >
                            0 && (
                            <details className="vehicle-timeline-details">
                              <summary>
                                {locale ===
                                'ar'
                                  ? 'عرض التغييرات'
                                  : 'View changes'}
                              </summary>

                              <div className="portal-table-wrap">
                                <table className="portal-table">
                                  <thead>
                                    <tr>
                                      <th>
                                        {t(
                                          'vi_field',
                                        )}
                                      </th>

                                      <th>
                                        {t(
                                          'before',
                                        )}
                                      </th>

                                      <th>
                                        {t(
                                          'after',
                                        )}
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {changedKeys.map(
                                      key => (
                                        <tr
                                          key={
                                            key
                                          }
                                        >
                                          <td>
                                            {t(
                                              `vi_audit_${key}`,
                                            )}
                                          </td>

                                          <td
                                            style={{
                                              whiteSpace:
                                                'pre-wrap',

                                              overflowWrap:
                                                'anywhere',
                                            }}
                                          >
                                            {String(
                                              entry.before[
                                                key
                                              ] ??
                                                '—',
                                            )}
                                          </td>

                                          <td
                                            style={{
                                              whiteSpace:
                                                'pre-wrap',

                                              overflowWrap:
                                                'anywhere',
                                            }}
                                          >
                                            {String(
                                              entry.after[
                                                key
                                              ] ??
                                                '—',
                                            )}
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* =================================================
              SUMMARY CARDS
              ================================================= */}
          <div className="vehicle-issue-kpis">
            <div className="vehicle-issue-kpi open">
              <span>
                {t(
                  'vi_OPEN',
                )}
              </span>

              <strong>
                {summary?.counts[
                  'OPEN'
                ]?.toLocaleString(
                  locale,
                ) || 0}
              </strong>
            </div>

            <div className="vehicle-issue-kpi maintenance">
              <span>
                {t(
                  'vi_IN_MAINTENANCE',
                )}
              </span>

              <strong>
                {summary?.counts[
                  'IN_MAINTENANCE'
                ]?.toLocaleString(
                  locale,
                ) || 0}
              </strong>
            </div>

            <div className="vehicle-issue-kpi resolved">
              <span>
                {t(
                  'vi_RESOLVED',
                )}
              </span>

              <strong>
                {summary?.counts[
                  'RESOLVED'
                ]?.toLocaleString(
                  locale,
                ) || 0}
              </strong>
            </div>
          </div>

          {/* =================================================
              FILTERS
              ================================================= */}
          <form
            className="portal-card portal-filters vehicle-issue-filters"
            onSubmit={
              filter
            }
          >
            <Field
              label={t(
                'vehicle',
              )}
            >
              <select
                name="vehicle"
                defaultValue={
                  search.get(
                    'vehicle',
                  ) || ''
                }
              >
                <option value="">
                  {t(
                    'all',
                  )}
                </option>

                {vehicles?.map(
                  vehicle => (
                    <option
                      key={
                        vehicle.id
                      }
                      value={
                        vehicle.id
                      }
                    >
                      {
                        vehicle.code
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'status',
              )}
            >
              <select
                name="status"
                defaultValue={
                  search.get(
                    'status',
                  ) || ''
                }
              >
                <option value="">
                  {t(
                    'all',
                  )}
                </option>

                {statuses.map(
                  status => (
                    <option
                      key={
                        status
                      }
                      value={
                        status
                      }
                    >
                      {t(
                        `vi_${status}`,
                      )}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'vi_severity',
              )}
            >
              <select
                name="severity"
                defaultValue={
                  search.get(
                    'severity',
                  ) || ''
                }
              >
                <option value="">
                  {t(
                    'all',
                  )}
                </option>

                {severities.map(
                  severity => (
                    <option
                      key={
                        severity
                      }
                      value={
                        severity
                      }
                    >
                      {t(
                        `vi_${severity}`,
                      )}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'vi_category',
              )}
            >
              <input
                name="category"
                maxLength={
                  100
                }
                defaultValue={
                  search.get(
                    'category',
                  ) || ''
                }
              />
            </Field>

            <div className="portal-buttons">
              <button
                className="button button-primary"
              >
                {t(
                  'search',
                )}
              </button>

              <Link
                className="button button-secondary"
                href={
                  root
                }
              >
                {t(
                  'clear',
                )}
              </Link>
            </div>
          </form>

          {/* =================================================
              TABLE
              ================================================= */}
          <div className="portal-card portal-table-wrap vehicle-issue-table">
            {!list?.results
              .length ? (
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
                      'vi_issue',
                      'vehicle',
                      'vi_category',
                      'vi_severity',
                      'status',
                      'vi_reported_at',
                    ].map(
                      key => (
                        <th
                          key={
                            key
                          }
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
                  {list.results.map(
                    row => (
                      <tr
                        key={
                          row.id
                        }
                      >
                        <td>
                          <Link
                            className="vehicle-issue-link"
                            href={`${root}/${row.id}`}
                          >
                            #
                            {
                              row.id
                            }
                          </Link>
                        </td>

                        <td>
                          {
                            row.vehicle_code
                          }
                        </td>

                        <td>
                          {
                            row.category
                          }
                        </td>

                        <td>
                          <Badge
                            value={
                              row.severity
                            }
                            t={
                              t
                            }
                          />
                        </td>

                        <td>
                          <Badge
                            value={
                              row.status
                            }
                            t={
                              t
                            }
                          />
                        </td>

                        <td>
                          {date(
                            row.reported_at,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* =================================================
              PAGINATION
              ================================================= */}
          {list &&
            list.count >
              20 && (
              <div className="portal-buttons vehicle-issue-pagination">
                <button
                  className="button button-secondary"
                  disabled={
                    page <=
                    1
                  }
                  onClick={() =>
                    paginate(
                      page -
                        1,
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
                  {
                    page
                  }
                </span>

                <button
                  className="button button-secondary"
                  disabled={
                    page *
                      20 >=
                    list.count
                  }
                  onClick={() =>
                    paginate(
                      page +
                        1,
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