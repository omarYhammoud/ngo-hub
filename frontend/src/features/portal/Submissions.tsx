'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Locale } from '@/i18n/dictionaries';

import type {
  Api,
  ContactSubmission,
  SubmissionStatus,
  VolunteerApplication,
} from './types';

import type { T } from './copy';

type SubmissionTab =
  | 'contact'
  | 'volunteer';

type SubmissionsProps = {
  api: Api;
  t: T;
  locale: Locale;
};

const statuses: SubmissionStatus[] = [
  'NEW',
  'REVIEWED',
  'CLOSED',
];

export default function Submissions({
  api,
  t,
  locale,
}: SubmissionsProps) {
  const [tab, setTab] =
    useState<SubmissionTab>('contact');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('');

  const [
    contacts,
    setContacts,
  ] =
    useState<ContactSubmission[]>([]);

  const [
    volunteers,
    setVolunteers,
  ] =
    useState<VolunteerApplication[]>([]);

  const [
    summaryCounts,
    setSummaryCounts,
  ] =
    useState<
      Record<
        SubmissionStatus,
        number
      >
    >({
      NEW: 0,
      REVIEWED: 0,
      CLOSED: 0,
    });

  const [
    loadedQuery,
    setLoadedQuery,
  ] =
    useState('');

  const requestVersion =
    useRef(0);

  const queryKey =
    `${tab}:${statusFilter}`;

  const loading =
    loadedQuery !== queryKey;

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const dateFormatter =
    new Intl.DateTimeFormat(
      locale === 'ar'
        ? 'ar-LB'
        : 'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );

  const load = useCallback(
    async () => {
      const version =
        ++requestVersion.current;

      const query =
        statusFilter
          ? `?status=${statusFilter}`
          : '';

      try {
        if (tab === 'contact') {
          const filteredRequest =
            api<ContactSubmission[]>(
              `submissions/staff/contact/${query}`,
            );

          const allRequest =
            statusFilter
              ? api<ContactSubmission[]>(
                  'submissions/staff/contact/',
                )
              : filteredRequest;

          const [
            filtered,
            all,
          ] =
            await Promise.all([
              filteredRequest,
              allRequest,
            ]);

          if (
            version !==
            requestVersion.current
          ) {
            return;
          }

          setContacts(
            filtered,
          );

          setSummaryCounts({
            NEW:
              all.filter(
                item =>
                  item.status ===
                  'NEW',
              ).length,

            REVIEWED:
              all.filter(
                item =>
                  item.status ===
                  'REVIEWED',
              ).length,

            CLOSED:
              all.filter(
                item =>
                  item.status ===
                  'CLOSED',
              ).length,
          });
        } else {
          const filteredRequest =
            api<
              VolunteerApplication[]
            >(
              `submissions/staff/volunteer/${query}`,
            );

          const allRequest =
            statusFilter
              ? api<
                  VolunteerApplication[]
                >(
                  'submissions/staff/volunteer/',
                )
              : filteredRequest;

          const [
            filtered,
            all,
          ] =
            await Promise.all([
              filteredRequest,
              allRequest,
            ]);

          if (
            version !==
            requestVersion.current
          ) {
            return;
          }

          setVolunteers(
            filtered,
          );

          setSummaryCounts({
            NEW:
              all.filter(
                item =>
                  item.status ===
                  'NEW',
              ).length,

            REVIEWED:
              all.filter(
                item =>
                  item.status ===
                  'REVIEWED',
              ).length,

            CLOSED:
              all.filter(
                item =>
                  item.status ===
                  'CLOSED',
              ).length,
          });
        }

        if (
          version ===
          requestVersion.current
        ) {
          setError('');
        }
      } catch {
        if (
          version ===
          requestVersion.current
        ) {
          setError(
            t(
              'submissionsLoadError',
            ),
          );
        }
      } finally {
        if (
          version ===
          requestVersion.current
        ) {
          setLoadedQuery(
            queryKey,
          );
        }
      }
    },
    [
      api,
      statusFilter,
      tab,
      t,
      queryKey,
    ],
  );

  useEffect(() => {
    void load();

    return () => {
      requestVersion.current +=
        1;
    };
  }, [load]);

  async function updateStatus(
    id: number,
    status: SubmissionStatus,
  ) {
    setUpdatingId(id);

    setError('');
    setSuccess('');

    try {
      const endpoint =
        tab === 'contact'
          ? `submissions/staff/contact/${id}/status/`
          : `submissions/staff/volunteer/${id}/status/`;

      await api(
        endpoint,
        'PATCH',
        {
          status,
        },
      );

      setSuccess(
        t(
          'submissionUpdated',
        ),
      );

      await load();
    } catch {
      setError(
        t(
          'submissionUpdateError',
        ),
      );
    } finally {
      setUpdatingId(
        null,
      );
    }
  }

  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return '—';
    }

    return dateFormatter.format(
      new Date(value),
    );
  }

  function changeTab(
    nextTab: SubmissionTab,
  ) {
    setTab(nextTab);
    setStatusFilter('');
    setSuccess('');
  }

  return (
    <div>
      {/* =====================================================
          PAGE HEADING
          ===================================================== */}

      <div className="portal-heading">
        <div>
          <h1>
            {t(
              'submissions',
            )}
          </h1>

          <p>
            {t(
              'submissionsHint',
            )}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="portal-error"
          role="alert"
        >
          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError('')
            }
            aria-label={t(
              'close',
            )}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          className="portal-notice"
          role="status"
        >
          {success}
        </div>
      )}

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="submission-kpis">
        <div className="submission-kpi new">
          <span>
            {t('NEW')}
          </span>

          <strong>
            {
              summaryCounts.NEW
            }
          </strong>
        </div>

        <div className="submission-kpi reviewed">
          <span>
            {t(
              'REVIEWED',
            )}
          </span>

          <strong>
            {
              summaryCounts.REVIEWED
            }
          </strong>
        </div>

        <div className="submission-kpi closed">
          <span>
            {t(
              'CLOSED',
            )}
          </span>

          <strong>
            {
              summaryCounts.CLOSED
            }
          </strong>
        </div>
      </div>

      {/* =====================================================
          TABS + FILTER
          ===================================================== */}

      <section className="portal-card submissions-control-card">
        <div className="submission-tabs">
          <button
            type="button"
            className={
              tab ===
              'contact'
                ? 'submission-tab active'
                : 'submission-tab'
            }
            onClick={() =>
              changeTab(
                'contact',
              )
            }
          >
            {t(
              'contactTab',
            )}
          </button>

          <button
            type="button"
            className={
              tab ===
              'volunteer'
                ? 'submission-tab active'
                : 'submission-tab'
            }
            onClick={() =>
              changeTab(
                'volunteer',
              )
            }
          >
            {t(
              'volunteerTab',
            )}
          </button>
        </div>

        <div className="submission-filter-row">
          <label className="portal-field">
            <span>
              {t(
                'filterByStatus',
              )}
            </span>

            <select
              value={
                statusFilter
              }
              onChange={
                event =>
                  setStatusFilter(
                    event
                      .target
                      .value,
                  )
              }
            >
              <option value="">
                {t('all')}
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
                      status,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          {statusFilter && (
            <button
              type="button"
              className="button button-secondary submission-clear"
              onClick={() =>
                setStatusFilter(
                  '',
                )
              }
            >
              {t(
                'clear',
              )}
            </button>
          )}
        </div>
      </section>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      {loading ? (
        <div
          className="portal-card submissions-loading"
          role="status"
        >
          {t(
            'loading',
          )}
        </div>
      ) : tab === 'contact' ? (
        <ContactTable
          items={
            contacts
          }
          t={t}
          formatDate={
            formatDate
          }
          updatingId={
            updatingId
          }
          updateStatus={
            updateStatus
          }
        />
      ) : (
        <VolunteerTable
          items={
            volunteers
          }
          t={t}
          formatDate={
            formatDate
          }
          updatingId={
            updatingId
          }
          updateStatus={
            updateStatus
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   CONTACT TABLE
   ========================================================= */

function ContactTable({
  items,
  t,
  formatDate,
  updatingId,
  updateStatus,
}: {
  items: ContactSubmission[];
  t: T;

  formatDate: (
    value: string | null,
  ) => string;

  updatingId: number | null;

  updateStatus: (
    id: number,
    status: SubmissionStatus,
  ) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <div className="portal-card portal-empty">
        <p>
          {t(
            'contactEmpty',
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="portal-card submissions-table-card">
      <div className="submissions-table-heading">
        <h2>
          {t(
            'contactSubmissions',
          )}
        </h2>

        <span>
          {items.length}
        </span>
      </div>

      <div className="portal-table-wrap submissions-table-wrap">
        <table className="portal-table submissions-table">
          <thead>
            <tr>
              <th>
                {t('name')}
              </th>

              <th>
                {t('email')}
              </th>

              <th>
                {t(
                  'subject',
                )}
              </th>

              <th>
                {t(
                  'message',
                )}
              </th>

              <th>
                {t(
                  'status',
                )}
              </th>

              <th>
                {t(
                  'submittedAt',
                )}
              </th>

              <th>
                {t(
                  'action',
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              item => (
                <tr
                  key={
                    item.id
                  }
                >
                  <td className="submission-name">
                    <b>
                      {
                        item.name
                      }
                    </b>
                  </td>

                  <td>
                    <a
                      className="submission-contact-link"
                      href={`mailto:${item.email}`}
                    >
                      {
                        item.email
                      }
                    </a>
                  </td>

                  <td>
                    {item.subject ||
                      t(
                        'noSubject',
                      )}
                  </td>

                  <td className="submission-message">
                    <span>
                      {item.message ||
                        '—'}
                    </span>
                  </td>

                  <td>
                    <SubmissionStatusCell
                      status={
                        item.status
                      }
                      reviewedBy={
                        item.reviewed_by_name
                      }
                      reviewedAt={
                        item.reviewed_at
                      }
                      formatDate={
                        formatDate
                      }
                      t={t}
                    />
                  </td>

                  <td className="submission-date">
                    {formatDate(
                      item.created_at,
                    )}
                  </td>

                  <td>
                    <StatusActions
                      id={
                        item.id
                      }
                      status={
                        item.status
                      }
                      t={t}
                      updating={
                        updatingId ===
                        item.id
                      }
                      updateStatus={
                        updateStatus
                      }
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   VOLUNTEER TABLE
   ========================================================= */

function VolunteerTable({
  items,
  t,
  formatDate,
  updatingId,
  updateStatus,
}: {
  items: VolunteerApplication[];
  t: T;

  formatDate: (
    value: string | null,
  ) => string;

  updatingId: number | null;

  updateStatus: (
    id: number,
    status: SubmissionStatus,
  ) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <div className="portal-card portal-empty">
        <p>
          {t(
            'volunteerEmpty',
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="portal-card submissions-table-card">
      <div className="submissions-table-heading">
        <h2>
          {t(
            'volunteerApplications',
          )}
        </h2>

        <span>
          {items.length}
        </span>
      </div>

      <div className="portal-table-wrap submissions-table-wrap">
        <table className="portal-table submissions-table">
          <thead>
            <tr>
              <th>
                {t('name')}
              </th>

              <th>
                {t('phone')}
              </th>

              <th>
                {t('area')}
              </th>

              <th>
                {t('role')}
              </th>

              <th>
                {t(
                  'status',
                )}
              </th>

              <th>
                {t(
                  'submittedAt',
                )}
              </th>

              <th>
                {t(
                  'action',
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              item => (
                <tr
                  key={
                    item.id
                  }
                >
                  <td className="submission-name">
                    <b>
                      {
                        item.name
                      }
                    </b>
                  </td>

                  <td>
                    <a
                      className="submission-contact-link"
                      href={`tel:${item.phone}`}
                    >
                      {
                        item.phone
                      }
                    </a>
                  </td>

                  <td>
                    {item.area ||
                      '—'}
                  </td>

                  <td>
                    {item.role_display ||
                      t(
                        item.role,
                      )}
                  </td>

                  <td>
                    <SubmissionStatusCell
                      status={
                        item.status
                      }
                      reviewedBy={
                        item.reviewed_by_name
                      }
                      reviewedAt={
                        item.reviewed_at
                      }
                      formatDate={
                        formatDate
                      }
                      t={t}
                    />
                  </td>

                  <td className="submission-date">
                    {formatDate(
                      item.created_at,
                    )}
                  </td>

                  <td>
                    <StatusActions
                      id={
                        item.id
                      }
                      status={
                        item.status
                      }
                      t={t}
                      updating={
                        updatingId ===
                        item.id
                      }
                      updateStatus={
                        updateStatus
                      }
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   STATUS DISPLAY
   ========================================================= */

function SubmissionStatusCell({
  status,
  reviewedBy,
  reviewedAt,
  formatDate,
  t,
}: {
  status: SubmissionStatus;

  reviewedBy:
    | string
    | null;

  reviewedAt:
    | string
    | null;

  formatDate: (
    value: string | null,
  ) => string;

  t: T;
}) {
  return (
    <div className="submission-status-cell">
      <span
        className={`submission-status-badge ${status.toLowerCase()}`}
      >
        {t(status)}
      </span>

      {reviewedBy && (
        <small>
          {t(
            'reviewedBy',
          )}
          :{' '}
          {
            reviewedBy
          }
        </small>
      )}

      {reviewedAt && (
        <small>
          {t(
            'reviewedAt',
          )}
          :{' '}
          {formatDate(
            reviewedAt,
          )}
        </small>
      )}
    </div>
  );
}

/* =========================================================
   ACTIONS
   ========================================================= */

function StatusActions({
  id,
  status,
  t,
  updating,
  updateStatus,
}: {
  id: number;

  status: SubmissionStatus;

  t: T;

  updating: boolean;

  updateStatus: (
    id: number,
    status: SubmissionStatus,
  ) => Promise<void>;
}) {
  return (
    <div className="submission-actions">
      {status ===
        'NEW' && (
        <button
          type="button"
          className="button button-secondary submission-action-secondary"
          disabled={
            updating
          }
          onClick={() =>
            void updateStatus(
              id,
              'REVIEWED',
            )
          }
        >
          {t(
            'markReviewed',
          )}
        </button>
      )}

      {status !==
        'CLOSED' && (
        <button
          type="button"
          className="button button-danger submission-close-button"
          disabled={
            updating
          }
          onClick={() =>
            void updateStatus(
              id,
              'CLOSED',
            )
          }
        >
          {t(
            'markClosed',
          )}
        </button>
      )}

      {status !==
        'NEW' && (
        <button
          type="button"
          className="button button-secondary submission-action-secondary"
          disabled={
            updating
          }
          onClick={() =>
            void updateStatus(
              id,
              'NEW',
            )
          }
        >
          {t(
            'reopenSubmission',
          )}
        </button>
      )}
    </div>
  );
}