'use client';

import { createPortal } from 'react-dom';
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import type { Locale } from '@/i18n/dictionaries';

import { DashboardIcon } from './Dashboard';
import {
  incidentTypes,
  type T,
} from './copy';
import type {
  Api,
  Mission,
} from './types';
import { Field } from './ui';

import './activity.css';

type ReportData = {
  count: number;
  counts: Record<string, number>;
  page: number;
  page_size: number;

  staff_options: {
    id: number;
    name: string;
  }[];

  vehicle_options: {
    id: number;
    name: string;
  }[];

  results: Mission[];
};

type StaffActivityReportData = {
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

type CsvExportData = {
  filename: string;
  content: string;
};

type MissionPrintData = {
  count: number;
  counts: Record<string, number>;

  results: {
    id: number;
    mission_number: string;
    date: string | null;
    incident_type: string;
    location: string;
    vehicle: string;
    status: string;

    crew: {
      name: string;
      role: string;
      actual: boolean;
    }[];
  }[];
};

type ActivityPrintData = {
  count: number;
  completed_missions: number;

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
    user_id: number;
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

type ReportType =
  | 'missions'
  | 'paramedic'
  | 'equipment'
  | 'vehicle';

const statuses = [
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
];

export default function Reports({
  api,
  t,
  base,
  locale,
}: {
  api: Api;
  t: T;
  base: string;
  locale: Locale;
}) {
  const router = useRouter();
  const search =
    useSearchParams();

  const requestedReportType =
    search.get(
      'report_type',
    );

  const reportType: ReportType =
    requestedReportType ===
    'paramedic'
      ? 'paramedic'
      : 'missions';

  const [data, setData] =
    useState<ReportData>();

  const [
    activityData,
    setActivityData,
  ] =
    useState<StaffActivityReportData>();

  const [error, setError] =
    useState('');

  const [retry, setRetry] =
    useState(0);

  const [
    exportingCsv,
    setExportingCsv,
  ] =
    useState(false);

  const [
    missionPrintData,
    setMissionPrintData,
  ] =
    useState<MissionPrintData>();

  const [
    activityPrintData,
    setActivityPrintData,
  ] =
    useState<ActivityPrintData>();

  const [
    preparingPrint,
    setPreparingPrint,
  ] =
    useState(false);

  const ui =
    locale === 'ar'
      ? {
          reportsTitle:
            'التقارير والتحليلات',

          missionReports:
            'تقارير المهمات',

          paramedicReports:
            'تقارير نشاط المسعفين',

          equipmentReports:
            'تقارير المعدات',

          vehicleReports:
            'تقارير المركبات',

          unavailable:
            'غير متاح حاليًا',

          generateReport:
            'إنشاء التقرير',

          reportPreview:
            'معاينة التقرير',

          completedParticipation:
            'المشاركة الفعلية في المهمات المكتملة',

          exportCsv:
            'تصدير CSV',

          printPdf:
            'طباعة / حفظ PDF',

          crewMembers:
            'أفراد الطاقم',
        }
      : {
          reportsTitle:
            'Reports & analytics',

          missionReports:
            'Mission reports',

          paramedicReports:
            'Paramedic activity reports',

          equipmentReports:
            'Equipment reports',

          vehicleReports:
            'Vehicle reports',

          unavailable:
            'Not available yet',

          generateReport:
            'Generate report',

          reportPreview:
            'Report preview',

          completedParticipation:
            'Actual participation in completed missions',

          exportCsv:
            'Export CSV',

          printPdf:
            'Print / Save as PDF',

          crewMembers:
            'Crew members',
        };

  const reportCategories: {
    key: ReportType;
    label: string;
    icon: string;
    enabled: boolean;
  }[] = [
    {
      key: 'missions',
      label:
        ui.missionReports,
      icon: 'missions',
      enabled: true,
    },
    {
      key: 'paramedic',
      label:
        ui.paramedicReports,
      icon: 'activity',
      enabled: true,
    },
    {
      key: 'equipment',
      label:
        ui.equipmentReports,
      icon: 'equipment',
      enabled: false,
    },
    {
      key: 'vehicle',
      label:
        ui.vehicleReports,
      icon: 'vehicles',
      enabled: false,
    },
  ];

  /*
   * Mission report query
   */

  const missionParams =
    new URLSearchParams();

  for (const key of [
    'date_from',
    'date_to',
    'status',
    'incident_type',
    'crew',
    'vehicle',
    'page',
  ]) {
    const value =
      search.get(key);

    if (value) {
      missionParams.set(
        key,
        value,
      );
    }
  }

  const missionQuery =
    missionParams.toString();

  /*
   * Staff activity query
   */

  const activityParams =
    new URLSearchParams();

  for (const key of [
    'date_from',
    'date_to',
  ]) {
    const value =
      search.get(key);

    if (value) {
      activityParams.set(
        key,
        value,
      );
    }
  }

  const selectedStaff =
    search.get('crew');

  if (selectedStaff) {
    activityParams.set(
      'user_id',
      selectedStaff,
    );
  }

  const currentPage =
    Math.max(
      1,
      Number(
        search.get(
          'page',
        ),
      ) || 1,
    );

  activityParams.set(
    'page',
    String(currentPage),
  );

  const activityQuery =
    activityParams.toString();

  /*
   * Load mission report
   */

  useEffect(() => {
    if (
      reportType !==
      'missions'
    ) {
      return;
    }

    let active = true;

    async function loadMissionReport() {
      try {
        setError('');

        const result =
          await api<ReportData>(
            `missions/report/${
              missionQuery
                ? `?${missionQuery}`
                : ''
            }`,
          );

        if (active) {
          setData(result);
        }
      } catch {
        if (active) {
          setError(
            'reportLoadError',
          );
        }
      }
    }

    void loadMissionReport();

    return () => {
      active = false;
    };
  }, [
    api,
    missionQuery,
    reportType,
    retry,
  ]);

  /*
   * Load paramedic activity
   */

  useEffect(() => {
    if (
      reportType !==
      'paramedic'
    ) {
      return;
    }

    let active = true;

    async function loadActivity() {
      try {
        setError('');

        const result =
          await api<StaffActivityReportData>(
            `missions/activity-history/?${activityQuery}`,
          );

        if (active) {
          setActivityData(
            result,
          );
        }
      } catch {
        if (active) {
          setActivityData(
            undefined,
          );

          setError(
            'activityLoadError',
          );
        }
      }
    }

    void loadActivity();

    return () => {
      active = false;
    };
  }, [
    api,
    activityQuery,
    reportType,
    retry,
  ]);

  function switchReportType(
    nextType: ReportType,
  ) {
    if (
      nextType !==
        'missions' &&
      nextType !==
        'paramedic'
    ) {
      return;
    }

    setError('');

    setMissionPrintData(
      undefined,
    );

    setActivityPrintData(
      undefined,
    );

    const next =
      new URLSearchParams();

    next.set(
      'report_type',
      nextType,
    );

    router.push(
      `${base}/reports?${next}`,
    );
  }

  function applyFilters(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      new FormData(
        event.currentTarget,
      );

    const next =
      new URLSearchParams();

    next.set(
      'report_type',
      reportType,
    );

    const from =
      String(
        form.get(
          'date_from',
        ) || '',
      );

    const to =
      String(
        form.get(
          'date_to',
        ) || '',
      );

    if (
      from &&
      to &&
      from > to
    ) {
      setError(
        'reportDateError',
      );

      return;
    }

    const keys =
      reportType ===
      'missions'
        ? [
            'date_from',
            'date_to',
            'status',
            'incident_type',
            'crew',
            'vehicle',
          ]
        : [
            'date_from',
            'date_to',
            'crew',
          ];

    for (const key of keys) {
      const value =
        String(
          form.get(key) ||
            '',
        ).trim();

      if (value) {
        next.set(
          key,
          value,
        );
      }
    }

    setMissionPrintData(
      undefined,
    );

    setActivityPrintData(
      undefined,
    );

    setError('');

    router.push(
      `${base}/reports?${next}`,
    );
  }

  function clearFilters() {
    setError('');

    setMissionPrintData(
      undefined,
    );

    setActivityPrintData(
      undefined,
    );

    router.push(
      `${base}/reports?report_type=${reportType}`,
    );
  }

  function changePage(
    page: number,
  ) {
    const next =
      new URLSearchParams(
        search.toString(),
      );

    next.set(
      'page',
      String(page),
    );

    router.push(
      `${base}/reports?${next}`,
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

  function reportValue(
    value:
      | string
      | null
      | undefined,
  ) {
    if (!value) {
      return '—';
    }

    return t(value);
  }

  function reportDate(
    value: string | null,
  ) {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      locale === 'ar'
        ? 'ar-LB'
        : 'en-GB',
      {
        year: 'numeric',
        month:
          '2-digit',
        day: '2-digit',
        timeZone:
          'UTC',
      },
    ).format(
      new Date(
        `${value}T00:00:00Z`,
      ),
    );
  }

  /*
   * Print / Save as PDF
   */

  async function printReport(
    form:
      | HTMLFormElement
      | null,
  ) {
    if (!form) {
      return;
    }

    setPreparingPrint(
      true,
    );

    setError('');

    try {
      const formData =
        new FormData(
          form,
        );

      const from =
        String(
          formData.get(
            'date_from',
          ) || '',
        );

      const to =
        String(
          formData.get(
            'date_to',
          ) || '',
        );

      if (
        from &&
        to &&
        from > to
      ) {
        setError(
          'reportDateError',
        );

        return;
      }

      const params =
        new URLSearchParams();

      if (from) {
        params.set(
          'date_from',
          from,
        );
      }

      if (to) {
        params.set(
          'date_to',
          to,
        );
      }

      if (
        reportType ===
        'missions'
      ) {
        for (const key of [
          'status',
          'incident_type',
          'crew',
          'vehicle',
        ]) {
          const value =
            String(
              formData.get(
                key,
              ) || '',
            ).trim();

          if (value) {
            params.set(
              key,
              value,
            );
          }
        }

        const query =
          params.toString();

        const result =
          await api<MissionPrintData>(
            `missions/report-print/${
              query
                ? `?${query}`
                : ''
            }`,
          );

        setMissionPrintData(
          result,
        );

        setActivityPrintData(
          undefined,
        );
      } else {
        const staffId =
          String(
            formData.get(
              'crew',
            ) || '',
          ).trim();

        if (staffId) {
          params.set(
            'user_id',
            staffId,
          );
        }

        const query =
          params.toString();

        const result =
          await api<ActivityPrintData>(
            `missions/activity-print/${
              query
                ? `?${query}`
                : ''
            }`,
          );

        setActivityPrintData(
          result,
        );

        setMissionPrintData(
          undefined,
        );
      }

      await new Promise<void>(
        resolve => {
          window.requestAnimationFrame(
            () => {
              window.requestAnimationFrame(
                () =>
                  resolve(),
              );
            },
          );
        },
      );

      window.print();
    } catch {
      setError(
        reportType ===
          'missions'
          ? 'reportLoadError'
          : 'activityLoadError',
      );
    } finally {
      setPreparingPrint(
        false,
      );
    }
  }

  /*
   * Mission CSV export
   */

  async function exportMissionCsv(
    form:
      | HTMLFormElement
      | null,
  ) {
    if (
      reportType !==
        'missions' ||
      !form
    ) {
      return;
    }

    setExportingCsv(
      true,
    );

    setError('');

    try {
      const formData =
        new FormData(
          form,
        );

      const from =
        String(
          formData.get(
            'date_from',
          ) || '',
        );

      const to =
        String(
          formData.get(
            'date_to',
          ) || '',
        );

      if (
        from &&
        to &&
        from > to
      ) {
        setError(
          'reportDateError',
        );

        return;
      }

      const exportParams =
        new URLSearchParams();

      for (const key of [
        'date_from',
        'date_to',
        'status',
        'incident_type',
        'crew',
        'vehicle',
      ]) {
        const value =
          String(
            formData.get(
              key,
            ) || '',
          ).trim();

        if (value) {
          exportParams.set(
            key,
            value,
          );
        }
      }

      const exportQuery =
        exportParams.toString();

      const result =
        await api<CsvExportData>(
          `missions/report-export/${
            exportQuery
              ? `?${exportQuery}`
              : ''
          }`,
        );

      const blob =
        new Blob(
          [
            `\uFEFF${result.content}`,
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          'a',
        );

      link.href = url;

      link.download =
        result.filename ||
        'mission-report.csv';

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch {
      setError(
        'reportLoadError',
      );
    } finally {
      setExportingCsv(
        false,
      );
    }
  }

  /*
   * Activity CSV export
   */

  async function exportActivityCsv(
    form:
      | HTMLFormElement
      | null,
  ) {
    if (
      reportType !==
        'paramedic' ||
      !form
    ) {
      return;
    }

    setExportingCsv(
      true,
    );

    setError('');

    try {
      const formData =
        new FormData(
          form,
        );

      const from =
        String(
          formData.get(
            'date_from',
          ) || '',
        );

      const to =
        String(
          formData.get(
            'date_to',
          ) || '',
        );

      if (
        from &&
        to &&
        from > to
      ) {
        setError(
          'reportDateError',
        );

        return;
      }

      const exportParams =
        new URLSearchParams();

      const userId =
        String(
          formData.get(
            'crew',
          ) || '',
        ).trim();

      if (from) {
        exportParams.set(
          'date_from',
          from,
        );
      }

      if (to) {
        exportParams.set(
          'date_to',
          to,
        );
      }

      if (userId) {
        exportParams.set(
          'user_id',
          userId,
        );
      }

      const exportQuery =
        exportParams.toString();

      const result =
        await api<CsvExportData>(
          `missions/activity-export/${
            exportQuery
              ? `?${exportQuery}`
              : ''
          }`,
        );

      const blob =
        new Blob(
          [
            `\uFEFF${result.content}`,
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          'a',
        );

      link.href = url;

      link.download =
        result.filename ||
        'paramedic-activity-report.csv';

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch {
      setError(
        'activityLoadError',
      );
    } finally {
      setExportingCsv(
        false,
      );
    }
  }

  function formatMonth(
    value: string,
  ) {
    return new Intl.DateTimeFormat(
      locale,
      {
        month: 'long',
        year: 'numeric',
        timeZone:
          'UTC',
      },
    ).format(
      new Date(
        `${value}T00:00:00Z`,
      ),
    );
  }

  const staffOptions =
    reportType ===
    'missions'
      ? data?.staff_options
      : activityData
          ?.staff_options;

  const loading =
    reportType ===
    'missions'
      ? !data
      : !activityData;

  const maxActivityIncident =
    Math.max(
      1,
      ...(
        activityData?.incident_types.map(
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
            {
              ui.reportsTitle
            }
          </h1>
        </div>
      </div>

      {/* Report category cards */}
      <div
        style={{
          display: 'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',

          gap: '16px',

          marginBottom:
            '24px',
        }}
      >
        {reportCategories.map(
          category => {
            const selected =
              reportType ===
              category.key;

            return (
              <button
                key={
                  category.key
                }
                type="button"
                disabled={
                  !category.enabled
                }
                onClick={() =>
                  switchReportType(
                    category.key,
                  )
                }
                style={{
                  textAlign:
                    'start',

                  padding:
                    '16px',

                  minHeight:
                    '116px',

                  borderRadius:
                    '12px',

                  border:
                    selected
                      ? '1px solid #ED1C24'
                      : '1px solid #D8DBDA',

                  background:
                    selected
                      ? '#FEF2F2'
                      : '#FFFFFF',

                  cursor:
                    category.enabled
                      ? 'pointer'
                      : 'not-allowed',

                  opacity:
                    category.enabled
                      ? 1
                      : 0.55,

                  transition:
                    'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width:
                      '36px',

                    height:
                      '36px',

                    display:
                      'flex',

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    borderRadius:
                      '8px',

                    marginBottom:
                      '10px',

                    background:
                      selected
                        ? '#ED1C24'
                        : '#F7F8F7',

                    color:
                      selected
                        ? '#FFFFFF'
                        : '#66706B',
                  }}
                >
                  <DashboardIcon
                    name={
                      category.icon
                    }
                  />
                </div>

                <div
                  style={{
                    fontSize:
                      '0.875rem',

                    fontWeight:
                      600,
                  }}
                >
                  {
                    category.label
                  }
                </div>

                {!category.enabled && (
                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '6px',

                      opacity:
                        0.6,
                    }}
                  >
                    {
                      ui.unavailable
                    }
                  </small>
                )}
              </button>
            );
          },
        )}
      </div>

      {/* Filters */}
      <form
        className="portal-card portal-filters"
        onSubmit={
          applyFilters
        }
      >
        <Field
          label={t(
            'date_from',
          )}
        >
          <input
            type="date"
            name="date_from"
            defaultValue={
              search.get(
                'date_from',
              ) || ''
            }
          />
        </Field>

        <Field
          label={t(
            'date_to',
          )}
        >
          <input
            type="date"
            name="date_to"
            defaultValue={
              search.get(
                'date_to',
              ) || ''
            }
          />
        </Field>

        {reportType ===
          'missions' && (
          <>
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
                        status,
                      )}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'incident_type',
              )}
            >
              <input
                name="incident_type"
                list="report-incident-types"
                defaultValue={
                  search.get(
                    'incident_type',
                  ) || ''
                }
              />

              <datalist
                id="report-incident-types"
              >
                {incidentTypes.map(
                  type => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {t(
                        type,
                      )}
                    </option>
                  ),
                )}
              </datalist>
            </Field>
          </>
        )}

        <Field
          label={t(
            'activityStaffName',
          )}
        >
          <select
            name="crew"
            defaultValue={
              search.get(
                'crew',
              ) || ''
            }
            disabled={
              !staffOptions
            }
          >
            <option value="">
              {t(
                'all',
              )}
            </option>

            {search.get(
              'crew',
            ) &&
              !staffOptions?.some(
                person =>
                  String(
                    person.id,
                  ) ===
                  search.get(
                    'crew',
                  ),
              ) && (
                <option
                  value={
                    search.get(
                      'crew',
                    )!
                  }
                >
                  #
                  {search.get(
                    'crew',
                  )}
                </option>
              )}

            {staffOptions?.map(
              person => (
                <option
                  key={
                    person.id
                  }
                  value={
                    person.id
                  }
                >
                  {
                    person.name
                  }
                </option>
              ),
            )}
          </select>
        </Field>

        {reportType ===
          'missions' && (
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
              disabled={
                !data
              }
            >
              <option value="">
                {t(
                  'all',
                )}
              </option>

              {search.get(
                'vehicle',
              ) &&
                !data?.vehicle_options?.some(
                  vehicle =>
                    String(
                      vehicle.id,
                    ) ===
                    search.get(
                      'vehicle',
                    ),
                ) && (
                  <option
                    value={
                      search.get(
                        'vehicle',
                      )!
                    }
                  >
                    #
                    {search.get(
                      'vehicle',
                    )}
                  </option>
                )}

              {data?.vehicle_options?.map(
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
                      vehicle.name
                    }
                  </option>
                ),
              )}
            </select>
          </Field>
        )}

        <div className="portal-buttons portal-full">
          <button
            type="submit"
            className="button button-primary"
          >
            {
              ui.generateReport
            }
          </button>

          {reportType ===
            'missions' && (
            <button
              type="button"
              className="button button-secondary"
              onClick={
                event =>
                  exportMissionCsv(
                    event
                      .currentTarget
                      .form,
                  )
              }
              disabled={
                exportingCsv
              }
            >
              {exportingCsv
                ? t(
                    'loading',
                  )
                : ui.exportCsv}
            </button>
          )}

          {reportType ===
            'paramedic' && (
            <button
              type="button"
              className="button button-secondary"
              onClick={
                event =>
                  exportActivityCsv(
                    event
                      .currentTarget
                      .form,
                  )
              }
              disabled={
                exportingCsv
              }
            >
              {exportingCsv
                ? t(
                    'loading',
                  )
                : ui.exportCsv}
            </button>
          )}

          <button
            type="button"
            className="button button-secondary"
            onClick={
              event =>
                printReport(
                  event
                    .currentTarget
                    .form,
                )
            }
            disabled={
              preparingPrint
            }
          >
            {preparingPrint
              ? t(
                  'loading',
                )
              : ui.printPdf}
          </button>

          <button
            type="button"
            className="button button-secondary"
            onClick={
              clearFilters
            }
          >
            {t(
              'clear',
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          className="portal-error"
          role="alert"
        >
          <span>
            {t(
              error,
            )}
          </span>

          {(error ===
            'reportLoadError' ||
            error ===
              'activityLoadError') && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setError(
                  '',
                );

                setRetry(
                  value =>
                    value +
                    1,
                );
              }}
            >
              {t(
                'retry',
              )}
            </button>
          )}
        </div>
      )}

      {/* Normal on-screen report */}
      {loading ? (
        !error && (
          <div
            className="portal-card"
            role="status"
          >
            {t(
              'loading',
            )}
          </div>
        )
      ) : (
        <>
          <div
            className="portal-heading"
            style={{
              marginTop:
                '24px',
            }}
          >
            <div>
              <h2>
                {
                  ui.reportPreview
                }
              </h2>
            </div>
          </div>

          {/* Mission report */}
          {reportType ===
            'missions' &&
            data && (
              <>
                <section className="portal-card">
                  <h2>
                    {t(
                      'reportSummary',
                    )}
                  </h2>

                  <p>
                    {t(
                      'reportTotalsHint',
                    )}
                  </p>

                  <div className="portal-table-wrap">
                    <table className="portal-table">
                      <thead>
                        <tr>
                          <th scope="col">
                            {t(
                              'total',
                            )}
                          </th>

                          {statuses.map(
                            status => (
                              <th
                                key={
                                  status
                                }
                                scope="col"
                              >
                                {t(
                                  status,
                                )}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>
                            <strong>
                              {
                                data.count
                              }
                            </strong>
                          </td>

                          {statuses.map(
                            status => (
                              <td
                                key={
                                  status
                                }
                              >
                                {data
                                  .counts[
                                  status
                                ] ||
                                  0}
                              </td>
                            ),
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="portal-card portal-table-wrap">
                  <h2>
                    {
                      ui.missionReports
                    }
                  </h2>

                  {!data.results
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
                            'mission_number',
                            'date',
                            'incident_type',
                            'location',
                            'vehicle',
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
                          mission => (
                            <tr
                              key={
                                mission.id
                              }
                            >
                              <td>
                                <Link
                                  href={`${base}/missions/${mission.id}`}
                                >
                                  {
                                    mission.mission_number
                                  }
                                </Link>
                              </td>

                              <td>
                                {mission.date ||
                                  '—'}
                              </td>

                              <td>
                                {mission.incident_type
                                  ? t(
                                      mission.incident_type,
                                    )
                                  : '—'}
                              </td>

                              <td>
                                {mission.location ||
                                  '—'}
                              </td>

                              <td>
                                {mission.vehicle_code ||
                                  '—'}
                              </td>

                              <td>
                                <span
                                  className={`portal-badge ${mission.status}`}
                                >
                                  {t(
                                    mission.status,
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

                {(data.count >
                  data.page_size ||
                  data.page >
                    1) && (
                  <div className="portal-buttons">
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        data.page <=
                        1
                      }
                      onClick={() =>
                        changePage(
                          data.page -
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
                        data.page
                      }
                    </span>

                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        data.page *
                          data.page_size >=
                        data.count
                      }
                      onClick={() =>
                        changePage(
                          data.page +
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

          {/* Paramedic activity */}
          {reportType ===
            'paramedic' &&
            activityData && (
              <>
                <div className="activity-stats">
                  <section className="portal-card activity-summary-card">
                    <h2>
                      {t(
                        'activityMissionTotal',
                      )}
                    </h2>

                    <strong className="activity-total">
                      {
                        activityData.completed_missions
                      }
                    </strong>
                  </section>

                  <section className="portal-card activity-summary-card">
                    <h2>
                      {t(
                        'activityParticipationTotal',
                      )}
                    </h2>

                    <strong className="activity-total">
                      {
                        activityData.count
                      }
                    </strong>
                  </section>
                </div>

                <div className="activity-stats">
                  {/* Incident types */}
                  <section className="portal-card activity-breakdown-card">
                    <h2>
                      {t(
                        'activityIncidents',
                      )}
                    </h2>

                    {!activityData
                      .incident_types
                      .length ? (
                      <p>
                        {t(
                          'empty',
                        )}
                      </p>
                    ) : (
                      <div className="activity-chart-list">
                        {activityData.incident_types.map(
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
                                  {
                                    row.total
                                  }
                                </strong>
                              </div>

                              <div className="activity-chart-track">
                                <div
                                  className="activity-chart-fill"
                                  style={{
                                    width: `${(
                                      row.total /
                                      maxActivityIncident
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

                  {/* Monthly */}
                  <section className="portal-card activity-month-card">
                    <h2>
                      {t(
                        'activityMonthly',
                      )}
                    </h2>

                    {!activityData
                      .monthly
                      .length ? (
                      <p>
                        {t(
                          'empty',
                        )}
                      </p>
                    ) : (
                      <>
                        <div className="activity-month-primary">
                          <div className="activity-month-number">
                            {
                              activityData
                                .monthly[0]
                                .total
                            }
                          </div>

                          <div className="activity-month-info">
                            <strong>
                              {formatMonth(
                                activityData
                                  .monthly[0]
                                  .month,
                              )}
                            </strong>

                            <span>
                              {t(
                                'activityMissionTotal',
                              )}
                            </span>
                          </div>
                        </div>

                        {activityData
                          .monthly
                          .length >
                          1 && (
                          <div className="activity-month-previous">
                            {activityData.monthly
                              .slice(
                                1,
                              )
                              .map(
                                row => (
                                  <div
                                    className="activity-month-row"
                                    key={
                                      row.month
                                    }
                                  >
                                    <span>
                                      {formatMonth(
                                        row.month,
                                      )}
                                    </span>

                                    <strong>
                                      {
                                        row.total
                                      }
                                    </strong>
                                  </div>
                                ),
                              )}
                          </div>
                        )}
                      </>
                    )}

                    {activityData.undated_missions >
                      0 && (
                      <p className="activity-undated">
                        {t(
                          'activityUndated',
                        )}
                        :{' '}
                        {
                          activityData.undated_missions
                        }
                      </p>
                    )}
                  </section>
                </div>

                <section className="portal-card portal-table-wrap activity-history">
                  <h2>
                    {t(
                      'activityHistory',
                    )}
                  </h2>

                  {!activityData
                    .results
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
                        {activityData.results.map(
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

                {(activityData.count >
                  20 ||
                  currentPage >
                    1) && (
                  <div className="portal-buttons">
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        currentPage <=
                        1
                      }
                      onClick={() =>
                        changePage(
                          currentPage -
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
                        currentPage
                      }
                    </span>

                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        currentPage *
                          20 >=
                        activityData.count
                      }
                      onClick={() =>
                        changePage(
                          currentPage +
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
      )}

      {/* PRINT-ONLY REPORT */}
      {typeof document !==
        'undefined' &&
        createPortal(
          <div
            id="report-print-area"
            className="report-print-area"
            dir={
              locale === 'ar'
                ? 'rtl'
                : 'ltr'
            }
          >
            <div className="report-print-header">
              <div className="report-print-brand">
                <Image
                  src="/ima-logo.png"
                  alt="Islamic Medical Association"
                  width={64}
                  height={64}
                  loading="eager"
                  unoptimized
                  className="report-print-logo"
                />

                <div>
                  <div className="report-print-org">
                    {locale ===
                    'ar'
                      ? 'الجمعية الطبية الإسلامية'
                      : 'Islamic Medical Association'}
                  </div>

                  <div className="report-print-system">
                    {locale ===
                    'ar'
                      ? 'NGO Hub — بوابة العمليات'
                      : 'NGO Hub — Operations Portal'}
                  </div>
                </div>
              </div>

              <div className="report-print-title">
                <h1>
                  {reportType ===
                  'missions'
                    ? ui.missionReports
                    : ui.paramedicReports}
                </h1>

                <p>
                  {
                    ui.reportsTitle
                  }
                </p>
              </div>
            </div>

            {reportType ===
              'missions' &&
              missionPrintData && (
                <>
                  <section className="portal-card">
                    <h2>
                      {t(
                        'reportSummary',
                      )}
                    </h2>

                    <div className="portal-table-wrap">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>
                              {t(
                                'total',
                              )}
                            </th>

                            {statuses.map(
                              status => (
                                <th
                                  key={
                                    status
                                  }
                                >
                                  {t(
                                    status,
                                  )}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          <tr>
                            <td>
                              <strong>
                                {
                                  missionPrintData.count
                                }
                              </strong>
                            </td>

                            {statuses.map(
                              status => (
                                <td
                                  key={
                                    status
                                  }
                                >
                                  {missionPrintData
                                    .counts[
                                    status
                                  ] ||
                                    0}
                                </td>
                              ),
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="portal-card portal-table-wrap">
                    <h2>
                      {
                        ui.missionReports
                      }
                    </h2>

                    {!missionPrintData
                      .results
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
                            <th>
                              {t(
                                'mission_number',
                              )}
                            </th>

                            <th>
                              {t(
                                'date',
                              )}
                            </th>

                            <th>
                              {t(
                                'incident_type',
                              )}
                            </th>

                            <th>
                              {t(
                                'location',
                              )}
                            </th>

                            <th>
                              {t(
                                'vehicle',
                              )}
                            </th>

                            <th>
                              {
                                ui.crewMembers
                              }
                            </th>

                            <th>
                              {t(
                                'status',
                              )}
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {missionPrintData.results.map(
                            mission => (
                              <tr
                                key={
                                  mission.id
                                }
                              >
                                <td>
                                  {
                                    mission.mission_number
                                  }
                                </td>

                                <td>
                                  {reportDate(
                                    mission.date,
                                  )}
                                </td>

                                <td>
                                  {reportValue(
                                    mission.incident_type,
                                  )}
                                </td>

                                <td>
                                  {mission.location ||
                                    '—'}
                                </td>

                                <td>
                                  {mission.vehicle ||
                                    '—'}
                                </td>

                                <td>
                                  {mission.crew
                                    .length
                                    ? mission.crew
                                        .map(
                                          member =>
                                            `${member.name} (${crewLabel(
                                              member.role,
                                            )})`,
                                        )
                                        .join(
                                          ', ',
                                        )
                                    : '—'}
                                </td>

                                <td>
                                  {t(
                                    mission.status,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )}
                  </section>
                </>
              )}

            {reportType ===
              'paramedic' &&
              activityPrintData && (
                <>
                  <section className="portal-card">
                    <h2>
                      {
                        ui.paramedicReports
                      }
                    </h2>

                    <p>
                      {
                        ui.completedParticipation
                      }
                    </p>

                    <div className="portal-table-wrap">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>
                              {t(
                                'activityMissionTotal',
                              )}
                            </th>

                            <th>
                              {t(
                                'activityParticipationTotal',
                              )}
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <tr>
                            <td>
                              <strong>
                                {
                                  activityPrintData.completed_missions
                                }
                              </strong>
                            </td>

                            <td>
                              <strong>
                                {
                                  activityPrintData.count
                                }
                              </strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <div className="report-print-breakdowns">
                    <section className="portal-card">
                      <h2>
                        {t(
                          'activityIncidents',
                        )}
                      </h2>

                      {!activityPrintData
                        .incident_types
                        .length ? (
                        <p>
                          {t(
                            'empty',
                          )}
                        </p>
                      ) : (
                        <ul className="activity-breakdown">
                          {activityPrintData.incident_types.map(
                            row => (
                              <li
                                key={
                                  row.incident_type ||
                                  'unspecified'
                                }
                              >
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
                                  {
                                    row.total
                                  }
                                </strong>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </section>

                    <section className="portal-card">
                      <h2>
                        {t(
                          'activityMonthly',
                        )}
                      </h2>

                      {!activityPrintData
                        .monthly
                        .length ? (
                        <p>
                          {t(
                            'empty',
                          )}
                        </p>
                      ) : (
                        <ul className="activity-breakdown">
                          {activityPrintData.monthly.map(
                            row => (
                              <li
                                key={
                                  row.month
                                }
                              >
                                <span>
                                  {formatMonth(
                                    row.month,
                                  )}
                                </span>

                                <strong>
                                  {
                                    row.total
                                  }
                                </strong>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </section>
                  </div>

                  <section className="portal-card portal-table-wrap">
                    <h2>
                      {t(
                        'activityHistory',
                      )}
                    </h2>

                    {!activityPrintData
                      .results
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
                            <th>
                              {t(
                                'activityStaffName',
                              )}
                            </th>

                            <th>
                              {t(
                                'mission_number',
                              )}
                            </th>

                            <th>
                              {t(
                                'date',
                              )}
                            </th>

                            <th>
                              {t(
                                'incident_type',
                              )}
                            </th>

                            <th>
                              {t(
                                'location',
                              )}
                            </th>

                            <th>
                              {t(
                                'crew_role',
                              )}
                            </th>

                            <th>
                              {t(
                                'status',
                              )}
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {activityPrintData.results.map(
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
                                  {row.mission_number ||
                                    `#${row.mission_id}`}
                                </td>

                                <td>
                                  {reportDate(
                                    row.date,
                                  )}
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
                                  {t(
                                    row.status,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )}
                  </section>
                </>
              )}
          </div>,
          document.body,
        )}
    </>
  );
}