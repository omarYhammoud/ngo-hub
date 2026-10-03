'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { StaffUser } from '@/features/auth/actions';
import type { Locale } from '@/i18n/dictionaries';

import type {
  Api,
  Mission,
  Vehicle,
  VehicleIssueSummary,
} from './types';

import type { T } from './copy';

import './dashboard.css';

const labels = {
  greeting: [
    'Welcome back',
    'مرحباً بعودتك',
  ],

  overview: [
    "Here's an overview of today's operations.",
    'إليك نظرة عامة على عمليات اليوم.',
  ],

  scoped: [
    'Mission statistics include only your own and assigned missions.',
    'تشمل إحصاءات المهمات مهماتك والمهمات المكلّف بها فقط.',
  ],

  today: [
    "Today's missions",
    'مهمات اليوم',
  ],

  active: [
    'Active missions',
    'المهمات النشطة',
  ],

  ambulances: [
    'Available ambulances',
    'سيارات الإسعاف المتاحة',
  ],

  equipment: [
    'Equipment on loan',
    'معدات قيد الإعارة',
  ],

  overdue: [
    'Overdue equipment',
    'معدات متأخرة الإرجاع',
  ],

  vehicles: [
    'Available vehicles',
    'المركبات المتاحة',
  ],

  issues: [
    'Open vehicle issues',
    'بلاغات المركبات المفتوحة',
  ],

  monthly: [
    'Missions per month',
    'المهمات حسب الشهر',
  ],

  byType: [
    'Missions by incident type',
    'المهمات حسب نوع الحادث',
  ],

  recent: [
    'Recent missions',
    'أحدث المهمات',
  ],

  all: [
    'View all',
    'عرض الكل',
  ],

  alerts: [
    'Alerts',
    'التنبيهات',
  ],

  pendingAlert: [
    'missions awaiting completion or assignment',
    'مهمات بانتظار الإنجاز أو التكليف',
  ],

  activeAlert: [
    'missions currently active',
    'مهمات نشطة حالياً',
  ],

  noAlerts: [
    'No mission alerts at the moment.',
    'لا توجد تنبيهات مهمات حالياً.',
  ],

  upcoming: [
    'Not available yet',
    'غير متاح بعد',
  ],

  upcomingNote: [
    'Vehicle issue tracking is not available yet.',
    'تتبع بلاغات المركبات غير متاح بعد.',
  ],

  sixMonths: [
    'Last 6 months · through today',
    'آخر ٦ أشهر · حتى اليوم',
  ],

  allTime: [
    'All recorded missions',
    'جميع المهمات المسجلة',
  ],

  total: [
    'missions',
    'مهمات',
  ],

  unspecified: [
    'Unspecified',
    'غير محدد',
  ],

  failed: [
    'Unable to load the dashboard. Please try again.',
    'تعذر تحميل لوحة التحكم. يرجى المحاولة مجدداً.',
  ],

} satisfies Record<
  string,
  [string, string]
>;

type Summary = {
  counts: Record<string, number>;
  today: string;
  today_missions: number;
  available_vehicles: number;
  available_ambulances: number;

  monthly: {
    month: string;
    total: number;
  }[];

  incident_types: {
    incident_type: string;
    total: number;
  }[];

  recent: Mission[];
};

export function DashboardIcon({
  name,
}: {
  name: string;
}) {
  const paths: Record<
    string,
    React.ReactNode
  > = {
    dashboard: (
      <>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
        />

        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
        />
      </>
    ),

    missions: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="17"
          rx="2"
        />

        <path d="M9 3h6v4H9zM9 12h6M9 16h4" />
      </>
    ),

    activity: (
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    ),

    vehicles: (
      <>
        <path d="M3 6h11v12H3zM14 10h4l3 4v4h-7M6 10h5M8.5 7.5v5" />

        <circle
          cx="6"
          cy="18"
          r="2"
        />

        <circle
          cx="18"
          cy="18"
          r="2"
        />
      </>
    ),

    equipment: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="15"
          rx="2"
        />

        <path d="M8 5V3h8v2M12 9v7M8.5 12.5h7" />
      </>
    ),

    'ai-assistant': (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
        <path d="M20 2v4M18 4h4" />
      </>
    ),

    'vehicle-issues': (
      <path d="M21 6a6 6 0 0 1-7.8 5.7L6 19a2.1 2.1 0 0 1-3-3l7.3-7.2A6 6 0 0 1 18 1l-4 4 1 4 4 1 2-4Z" />
    ),

    lending: (
      <>
        <path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4" />
      </>
    ),

    reports: (
      <>
        <path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-7-7Z M14 2v7h7" />
        <path d="M7 17v-3M12 17v-6M17 17v-4" />
      </>
    ),

    submissions: (
      <>
        <path d="M4 4h16l2 10v6H2v-6L4 4Z M2 14h6l2 3h4l2-3h6" />
        <path d="M12 6v7m-3-3 3 3 3-3" />
      </>
    ),

    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),

    staff: (
      <>
        <circle
          cx="9"
          cy="7"
          r="3"
        />

        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2" />
      </>
    ),
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.dashboard}
    </svg>
  );
}

const colors = [
  '#2563eb',
  '#171717',
  '#d97706',
  '#66706b',
  '#ed1c24',
  '#007a3d',
];

export default function Dashboard({
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
  const [data, setData] =
    useState<Summary>();

  const [
    lending,
    setLending,
  ] = useState<{
    on_loan: number;
    overdue: number;
  }>();

  const [
    fleet,
    setFleet,
  ] = useState<Vehicle[]>();

  const [
    issues,
    setIssues,
  ] = useState<
    VehicleIssueSummary
  >();

  const [
    failed,
    setFailed,
  ] = useState(false);

  const [
    attempt,
    setAttempt,
  ] = useState(0);

  const missionAccess =
    user.capabilities.includes(
      'manage_missions',
    );

  const lendingAccess =
    user.capabilities.includes(
      'manage_lending',
    );

  const vehicleAccess =
    user.capabilities.includes(
      'manage_vehicles',
    );

  const copy = (
    key: keyof typeof labels,
  ) =>
    labels[key][
      locale === 'ar'
        ? 1
        : 0
    ];

  const number = (
    value: number,
  ) =>
    value.toLocaleString(
      locale,
    );

  const dateLabel = (
    value: string,
    month = false,
  ) =>
    new Date(
      `${value}T12:00:00`,
    ).toLocaleDateString(
      locale,
      month
        ? {
            month: 'short',
          }
        : {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          },
    );

  useEffect(() => {
    let live = true;

    async function load() {
      try {
        if (missionAccess) {
          const result =
            await api<Summary>(
              'missions/summary/',
            );

          if (
            !Array.isArray(
              result.monthly,
            ) ||
            !Array.isArray(
              result.incident_types,
            )
          ) {
            throw new Error(
              'Dashboard summary is not available yet.',
            );
          }

          if (live) {
            setData(result);
          }
        } else if (
          vehicleAccess
        ) {
          const result =
            await api<
              Vehicle[]
            >('vehicles/');

          if (live) {
            setFleet(result);
          }
        }

        if (lendingAccess) {
          const result =
            await api<{
              on_loan: number;
              overdue: number;
            }>(
              'equipment/summary/',
            );

          if (live) {
            setLending(
              result,
            );
          }
        }

        if (vehicleAccess) {
          const result =
            await api<
              VehicleIssueSummary
            >(
              'vehicle-issues/summary/',
            );

          if (live) {
            setIssues(
              result,
            );
          }
        }

        if (live) {
          setFailed(false);
        }
      } catch {
        if (live) {
          setFailed(true);
        }
      }
    }

    void load();

    return () => {
      live = false;
    };
  }, [
    api,
    missionAccess,
    vehicleAccess,
    lendingAccess,
    attempt,
  ]);

  const cards = [
    {
      key: 'today',
      icon: 'missions',
      tone: 'neutral',
      value:
        data?.today_missions,
      show: missionAccess,
    },

    {
      key: 'active',
      icon: 'activity',
      tone: 'info',
      value: data
        ? data.counts.ACTIVE ||
          0
        : undefined,
      show: missionAccess,
    },

    {
      key: 'ambulances',
      icon: 'vehicles',
      tone: 'positive',
      value:
        data?.available_ambulances ??
        fleet?.filter(
          vehicle =>
            vehicle.status ===
              'AVAILABLE' &&
            [
              'ambulance',
              'إسعاف',
              'سيارة إسعاف',
            ].includes(
              vehicle.type.toLowerCase(),
            ),
        ).length,
      show:
        missionAccess ||
        vehicleAccess,
    },

    {
      key: 'equipment',
      icon: 'equipment',
      tone: 'warn',
      value:
        lending?.on_loan,
      show: lendingAccess,
    },

    {
      key: 'overdue',
      icon: 'alert',
      tone: 'bad',
      value:
        lending?.overdue,
      show: lendingAccess,
    },

    {
      key: 'vehicles',
      icon: 'vehicles',
      tone: 'positive',
      value:
        data?.available_vehicles ??
        fleet?.filter(
          vehicle =>
            vehicle.status ===
            'AVAILABLE',
        ).length,
      show:
        missionAccess ||
        vehicleAccess,
    },

    {
      key: 'issues',
      icon: 'alert',
      tone: 'bad',
      value:
        issues?.unresolved,
      show: vehicleAccess,
    },
  ] as const;

  const typeTotal =
    data?.incident_types.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.total,
      0,
    ) || 0;

  const maxMonth =
    Math.max(
      1,
      ...(
        data?.monthly.map(
          item =>
            item.total,
        ) || []
      ),
    );

  let offset = 0;

  const slices =
    data?.incident_types.map(
      (
        item,
        index,
      ) => {
        const start =
          offset;

        offset +=
          typeTotal
            ? (
                item.total /
                typeTotal
              ) *
              100
            : 0;

        return `${colors[index % colors.length]} ${start}% ${offset}%`;
      },
    );

  return (
    <div className="reference-dashboard">
      <div className="portal-heading">
        <div>
          <h1>
            {copy(
              'greeting',
            )}
            ,{' '}
            {user.first_name ||
              user.username}
          </h1>

          <p>
            {copy(
              'overview',
            )}
          </p>

          {user.role ===
            'PARAMEDIC' && (
            <p className="dashboard-scope">
              {copy(
                'scoped',
              )}
            </p>
          )}
        </div>
      </div>

      {failed && (
        <div
          className="portal-error"
          role="alert"
        >
          <span>
            {copy(
              'failed',
            )}
          </span>

          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              setAttempt(
                value =>
                  value +
                  1,
              )
            }
          >
            {t('retry')}
          </button>
        </div>
      )}

      <div className="dashboard-kpis">
        {cards
          .filter(
            card =>
              card.show,
          )
          .map(
            card => (
              <div
                className="dashboard-panel dashboard-kpi"
                key={
                  card.key
                }
              >
                <span
                  className={`dashboard-icon ${card.tone}`}
                >
                  <DashboardIcon
                    name={
                      card.icon
                    }
                  />
                </span>

                <div>
                  <strong>
                    {card.value ===
                    undefined
                      ? '…'
                      : number(
                          card.value,
                        )}
                  </strong>

                  <p>
                    {card.key ===
                    'issues' ? (
                      <Link
                        href={`${base}/vehicle-issues`}
                      >
                        {copy(
                          card.key,
                        )}
                      </Link>
                    ) : (
                      copy(
                        card.key,
                      )
                    )}
                  </p>
                </div>
              </div>
            ),
          )}
      </div>

      {missionAccess && (
        <>
          <div className="dashboard-grid">
            <section className="dashboard-panel dashboard-wide">
              <h2>
                {copy(
                  'monthly',
                )}
              </h2>

              <p className="dashboard-caption">
                {copy(
                  'sixMonths',
                )}
              </p>

              {!data ? (
                <p role="status">
                  {failed
                    ? copy(
                        'failed',
                      )
                    : t(
                        'loading',
                      )}
                </p>
              ) : (
                <div
                  className="dashboard-bars"
                  role="img"
                  aria-label={`${copy(
                    'monthly',
                  )}: ${data.monthly
                    .map(
                      item =>
                        `${dateLabel(
                          item.month,
                          true,
                        )} ${number(
                          item.total,
                        )}`,
                    )
                    .join(
                      ', ',
                    )}`}
                >
                  {data.monthly.map(
                    item => (
                      <div
                        className="dashboard-bar-column"
                        key={
                          item.month
                        }
                      >
                        <span>
                          {number(
                            item.total,
                          )}
                        </span>

                        <div className="dashboard-bar-track">
                          <div
                            style={{
                              height: `${(
                                item.total /
                                maxMonth
                              ) *
                                100}%`,
                            }}
                          />
                        </div>

                        <span>
                          {dateLabel(
                            item.month,
                            true,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <h2>
                {copy(
                  'byType',
                )}
              </h2>

              <p className="dashboard-caption">
                {copy(
                  'allTime',
                )}
              </p>

              {!data ? (
                <p role="status">
                  {failed
                    ? copy(
                        'failed',
                      )
                    : t(
                        'loading',
                      )}
                </p>
              ) : (
                <div className="dashboard-types">
                  <div
                    className="dashboard-donut"
                    style={{
                      background:
                        typeTotal
                          ? `conic-gradient(${slices?.join(
                              ',',
                            )})`
                          : '#e5e7e6',
                    }}
                    role="img"
                    aria-label={`${number(
                      typeTotal,
                    )} ${copy(
                      'total',
                    )}`}
                  >
                    <div>
                      <strong>
                        {number(
                          typeTotal,
                        )}
                      </strong>

                      <small>
                        {copy(
                          'total',
                        )}
                      </small>
                    </div>
                  </div>

                  <ul className="dashboard-legend">
                    {data
                      .incident_types
                      .length ? (
                      data.incident_types.map(
                        (
                          item,
                          index,
                        ) => (
                          <li
                            key={
                              item.incident_type
                            }
                          >
                            <span
                              className="dashboard-legend-dot"
                              style={{
                                background:
                                  colors[
                                    index %
                                      colors.length
                                  ],
                              }}
                            />

                            <span>
                              {item.incident_type
                                ? t(
                                    item.incident_type,
                                  )
                                : copy(
                                    'unspecified',
                                  )}
                            </span>

                            <b>
                              {number(
                                item.total,
                              )}
                            </b>
                          </li>
                        ),
                      )
                    ) : (
                      <li>
                        {t(
                          'empty',
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel dashboard-wide">
              <div className="dashboard-panel-heading">
                <h2>
                  {copy(
                    'recent',
                  )}
                </h2>

                <Link
                  href={`${base}/missions`}
                >
                  {copy(
                    'all',
                  )}
                </Link>
              </div>

              {!data ? (
                <p role="status">
                  {failed
                    ? copy(
                        'failed',
                      )
                    : t(
                        'loading',
                      )}
                </p>
              ) : !data.recent
                  .length ? (
                <p className="dashboard-empty">
                  {t(
                    'empty',
                  )}
                </p>
              ) : (
                data.recent.map(
                  mission => (
                    <Link
                      className="dashboard-recent"
                      key={
                        mission.id
                      }
                      href={`${base}/missions/${mission.id}`}
                    >
                      <div>
                        <div className="dashboard-recent-title">
                          <strong>
                            {
                              mission.mission_number
                            }
                          </strong>

                          <span>
                            {mission.location ||
                              mission.title ||
                              '—'}
                          </span>
                        </div>

                        <small>
                          {mission.date
                            ? dateLabel(
                                mission.date,
                              )
                            : '—'}

                          {mission.actual_start &&
                            ` · ${new Date(
                              mission.actual_start,
                            ).toLocaleTimeString(
                              locale,
                              {
                                hour: '2-digit',
                                minute:
                                  '2-digit',
                                timeZone:
                                  'Asia/Beirut',
                              },
                            )}`}
                        </small>
                      </div>

                      <span
                        className={`portal-badge ${mission.status}`}
                      >
                        {t(
                          mission.status,
                        )}
                      </span>
                    </Link>
                  ),
                )
              )}
            </section>

            <section className="dashboard-panel">
              <h2>
                {copy(
                  'alerts',
                )}
              </h2>

              {!data ? (
                <p role="status">
                  {failed
                    ? copy(
                        'failed',
                      )
                    : t(
                        'loading',
                      )}
                </p>
              ) : (
                <>
                  {!!data.counts
                    .PENDING && (
                    <Link
                      className="dashboard-alert warn"
                      href={`${base}/missions?status=PENDING`}
                    >
                      <DashboardIcon
                        name="alert"
                      />

                      <span>
                        <b>
                          {number(
                            data
                              .counts
                              .PENDING,
                          )}
                        </b>{' '}
                        {copy(
                          'pendingAlert',
                        )}
                      </span>
                    </Link>
                  )}

                  {!!data.counts
                    .ACTIVE && (
                    <Link
                      className="dashboard-alert info"
                      href={`${base}/missions?status=ACTIVE`}
                    >
                      <DashboardIcon
                        name="activity"
                      />

                      <span>
                        <b>
                          {number(
                            data
                              .counts
                              .ACTIVE,
                          )}
                        </b>{' '}
                        {copy(
                          'activeAlert',
                        )}
                      </span>
                    </Link>
                  )}

                  {!data.counts
                    .PENDING &&
                    !data
                      .counts
                      .ACTIVE && (
                      <div className="dashboard-empty-state">
                        <span className="dashboard-empty-icon">
                          ✓
                        </span>

                        <p>
                          {copy(
                            'noAlerts',
                          )}
                        </p>
                      </div>
                    )}
                </>
              )}

              {vehicleAccess &&
                !!issues?.unresolved && (
                  <Link
                    className="dashboard-alert warn"
                    href={`${base}/vehicle-issues`}
                  >
                    <DashboardIcon
                      name="alert"
                    />

                    <span>
                      {number(
                        issues.unresolved,
                      )}{' '}
                      {copy(
                        'issues',
                      )}
                    </span>
                  </Link>
                )}
            </section>
          </div>
        </>
      )}




      {!missionAccess &&
        !lendingAccess && (
          <div className="dashboard-panel">
            <h2>
              {t(
                user.role,
              )}
            </h2>

            {vehicleAccess ? (
              <Link
                className="button button-secondary"
                href={`${base}/vehicles`}
              >
                {t(
                  'vehicles',
                )}
              </Link>
            ) : (
              <p className="dashboard-caption">
                {copy(
                  'upcomingNote',
                )}
              </p>
            )}
          </div>
        )}
    </div>
  );
}