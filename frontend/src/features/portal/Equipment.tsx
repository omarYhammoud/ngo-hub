'use client';

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type {
  Api,
  Equipment,
  EquipmentSummary,
  Loan,
} from './types';

import type { T } from './copy';
import type { Locale } from '@/i18n/dictionaries';

import { Field } from './ui';

export default function EquipmentScreen({
  api,
  t,
  locale,
  lending = false,
}: {
  api: Api;
  t: T;
  locale: Locale;
  lending?: boolean;
}) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const [summary, setSummary] =
    useState<EquipmentSummary>({
      total: 0,
      available: 0,
      on_loan: 0,
      overdue: 0,
    });

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editing, setEditing] =
    useState<Equipment | null>();

  const [checkout, setCheckout] =
    useState(false);

  const [returning, setReturning] =
    useState<Loan>();

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState('');

  const fetchRecords = useCallback(
    () =>
      Promise.all([
        api<Equipment[]>('equipment/'),
        api<string[]>('equipment/types/'),
        api<EquipmentSummary>('equipment/summary/'),
        lending
          ? api<Loan[]>('lending/')
          : Promise.resolve([] as Loan[]),
      ]),
    [api, lending],
  );

  const applyRecords = useCallback(
    (
      [
        inventory,
        catalogue,
        equipmentSummary,
        history,
      ]: [
        Equipment[],
        string[],
        EquipmentSummary,
        Loan[],
      ],
    ) => {
      setItems(inventory);
      setTypes(catalogue);
      setSummary(equipmentSummary);
      setLoans(history);
      setLoaded(true);
      setFailed(false);
    },
    [],
  );

  async function load() {
    try {
      applyRecords(
        await fetchRecords(),
      );
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    let live = true;

    fetchRecords()
      .then(result => {
        if (live) {
          applyRecords(result);
        }
      })
      .catch(() => {
        if (live) {
          setFailed(true);
        }
      });

    return () => {
      live = false;
    };
  }, [
    fetchRecords,
    applyRecords,
  ]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setSaved(false);

    const body: Record<
      string,
      unknown
    > = Object.fromEntries(
      new FormData(
        event.currentTarget,
      ),
    );

    try {
      if (returning) {
        await api(
          `lending/${returning.id}/return/`,
          'POST',
          body,
        );
      } else if (checkout) {
        body.equipment =
          Number(body.equipment);

        await api(
          'lending/',
          'POST',
          body,
        );
      } else {
        await api(
          `equipment/${
            editing
              ? `${editing.id}/`
              : ''
          }`,
          editing
            ? 'PATCH'
            : 'POST',
          body,
        );
      }

      setEditing(undefined);
      setCheckout(false);
      setReturning(undefined);
      setSaved(true);

      await load();
    } catch {
      // API errors are handled by the portal layer.
    } finally {
      setBusy(false);
    }
  }

  const loanStatus = (
    loan: Loan,
  ) =>
    loan.returned_at
      ? 'RETURNED'
      : loan.is_overdue
        ? 'OVERDUE'
        : 'ACTIVE';

  const query =
    search
      .trim()
      .toLocaleLowerCase(locale);

  const visibleItems =
    items.filter(
      item =>
        (
          !status ||
          item.status === status
        ) &&
        `${item.code} ${item.name} ${item.type} ${item.serial_number}`
          .toLocaleLowerCase(locale)
          .includes(query),
    );

  const visibleLoans =
    loans.filter(
      loan =>
        (
          !status ||
          loanStatus(loan) === status
        ) &&
        `${loan.equipment_code} ${loan.borrower_name} ${loan.borrower_phone}`
          .toLocaleLowerCase(locale)
          .includes(query),
    );

  const date = (
    value: string,
  ) =>
    new Date(
      value.length === 10
        ? `${value}T12:00:00`
        : value,
    ).toLocaleDateString(
      locale,
      {
        timeZone:
          'Asia/Beirut',
      },
    );

  const today =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Beirut',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    ).format(
      new Date(),
    );

  const formOpen =
    editing !== undefined ||
    checkout ||
    returning;

  function closeForm() {
    setEditing(undefined);
    setCheckout(false);
    setReturning(undefined);
  }

  const pageStyle = {
    width: '100%',
    maxWidth: '980px',
    marginInline: 'auto',
  } as const;

  const accentCardStyle = {
    background: '#ffffff',
    border:
      '1px solid #e3e7e5',
    borderInlineStart:
      '4px solid #ed1c24',
    borderRadius: '16px',
    padding: '28px',
    boxShadow:
      '0 8px 24px rgba(0,0,0,0.035)',
  } as const;

  const cardStyle = {
    background: '#ffffff',
    border:
      '1px solid #e3e7e5',
    borderRadius: '16px',
    boxShadow:
      '0 8px 24px rgba(0,0,0,0.025)',
  } as const;

  const maintenanceCount =
    items.filter(
      item =>
        item.status ===
        'MAINTENANCE',
    ).length;

  /*
   * =========================================================
   * LENDING
   * =========================================================
   */

  if (lending) {
    return (
      <div style={pageStyle}>
        <div className="portal-heading lending-heading">
          <div>
            <h1>{t('lending')}</h1>
            <p>{t('lendingHint')}</p>
          </div>

          <button
            className="button button-primary"
            disabled={
              !loaded ||
              busy ||
              !!formOpen
            }
            onClick={() => {
              setSaved(false);
              setCheckout(true);
            }}
          >
            {t('checkout')}
          </button>
        </div>

        {saved && (
          <p role="status">
            {t('saved')}
          </p>
        )}

        {failed && (
          <div
            className="portal-error"
            role="alert"
          >
            {t('unavailable')}

            <button
              disabled={busy}
              onClick={() =>
                void load()
              }
            >
              {t('retry')}
            </button>
          </div>
        )}

        {loaded && (
          <div className="lending-kpis">
            <div className="lending-kpi total">
              <span>
                {locale === 'ar'
                  ? 'إجمالي المعدات'
                  : 'Total equipment'}
              </span>

              <strong>
                {summary.total}
              </strong>
            </div>

            <div className="lending-kpi available">
              <span>
                {locale === 'ar'
                  ? 'متاح'
                  : 'Available'}
              </span>

              <strong>
                {summary.available}
              </strong>
            </div>

            <div className="lending-kpi loan">
              <span>
                {locale === 'ar'
                  ? 'قيد الإعارة'
                  : 'On loan'}
              </span>

              <strong>
                {summary.on_loan}
              </strong>
            </div>

            <div className="lending-kpi overdue">
              <span>
                {locale === 'ar'
                  ? 'متأخر'
                  : 'Overdue'}
              </span>

              <strong>
                {summary.overdue}
              </strong>
            </div>
          </div>
        )}

        {formOpen && (
          <form
            className="equipment-form lending-form"
            method="post"
            onSubmit={submit}
            key={
              returning
                ? `return-${returning.id}`
                : checkout
                  ? 'checkout'
                  : 'new'
            }
            style={{
              ...accentCardStyle,
              marginBottom:
                '24px',
            }}
          >
            <div
              style={{
                marginBottom:
                  '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color:
                    '#ed1c24',
                  fontWeight:
                    600,
                  fontSize:
                    '0.9rem',
                }}
              >
                {returning
                  ? t(
                      'returnEquipment',
                    )
                  : t(
                      'checkout',
                    )}
              </p>

              <h2
                style={{
                  margin:
                    '0.4rem 0 0',
                }}
              >
                {returning
                  ? `${t(
                      'returnEquipment',
                    )} · ${returning.equipment_code}`
                  : t(
                      'checkout',
                    )}
              </h2>

              {returning && (
                <p
                  style={{
                    margin:
                      '0.4rem 0 0',
                    opacity:
                      0.7,
                  }}
                >
                  {
                    returning.borrower_name
                  }
                </p>
              )}
            </div>

            <fieldset
              className="portal-form-grid"
              disabled={busy}
              style={{
                border: 0,
                margin: 0,
                padding: 0,
              }}
            >
              {returning ? (
                <>
                  <Field
                    label={t(
                      'return_status',
                    )}
                  >
                    <select
                      name="status"
                    >
                      <option value="AVAILABLE">
                        {t(
                          'AVAILABLE',
                        )}
                      </option>

                      <option value="MAINTENANCE">
                        {t(
                          'MAINTENANCE',
                        )}
                      </option>
                    </select>
                  </Field>

                  <div className="portal-full">
                    <Field
                      label={t(
                        'return_notes',
                      )}
                    >
                      <textarea
                        name="return_notes"
                        rows={5}
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <Field
                    label={t(
                      'equipment',
                    )}
                  >
                    <select
                      name="equipment"
                      required
                      defaultValue=""
                    >
                      <option value="">
                        {t(
                          'select',
                        )}
                      </option>

                      {items
                        .filter(
                          item =>
                            item.status ===
                            'AVAILABLE',
                        )
                        .map(
                          item => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                item.code
                              }
                              {' · '}
                              {
                                item.name
                              }
                            </option>
                          ),
                        )}
                    </select>
                  </Field>

                  <Field
                    label={t(
                      'borrower_name',
                    )}
                  >
                    <input
                      name="borrower_name"
                      required
                      maxLength={120}
                    />
                  </Field>

                  <Field
                    label={t(
                      'borrower_phone',
                    )}
                  >
                    <input
                      name="borrower_phone"
                      type="tel"
                      dir="ltr"
                      required
                      maxLength={32}
                    />
                  </Field>

                  <Field
                    label={t(
                      'borrower_address',
                    )}
                  >
                    <input
                      name="borrower_address"
                      maxLength={250}
                    />
                  </Field>

                  <Field
                    label={t(
                      'due_date',
                    )}
                  >
                    <input
                      name="due_date"
                      type="date"
                      min={today}
                      required
                    />
                  </Field>

                  <div className="portal-full">
                    <Field
                      label={t(
                        'equipmentNotes',
                      )}
                    >
                      <textarea
                        name="notes"
                        rows={5}
                      />
                    </Field>
                  </div>

                  {!items.some(
                    item =>
                      item.status ===
                      'AVAILABLE',
                  ) && (
                    <p className="portal-full">
                      {t(
                        'noAvailableEquipment',
                      )}
                    </p>
                  )}

                  <p
                    className="portal-full"
                    style={{
                      margin: 0,
                      fontSize:
                        '0.85rem',
                      opacity:
                        0.65,
                    }}
                  >
                    {t(
                      'dueDateHint',
                    )}
                  </p>
                </>
              )}
            </fieldset>

            <div
              className="portal-buttons"
              style={{
                marginTop:
                  '1.5rem',
                justifyContent:
                  'flex-end',
              }}
            >
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={
                  closeForm
                }
              >
                {t('close')}
              </button>

              <button
                className="button button-primary"
                disabled={busy}
              >
                {t(
                  busy
                    ? 'loading'
                    : returning
                      ? 'returnEquipment'
                      : 'checkout',
                )}
              </button>
            </div>
          </form>
        )}

        {/* Filter container restored */}
        <div className="portal-card portal-filters lending-filters">
          <Field
            label={t(
              'search',
            )}
          >
            <input
              value={search}
              onChange={
                event =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
              }
              type="search"
            />
          </Field>

          <Field
            label={t(
              'status',
            )}
          >
            <select
              value={status}
              onChange={
                event =>
                  setStatus(
                    event
                      .target
                      .value,
                  )
              }
            >
              <option value="">
                {t('all')}
              </option>

              {[
                'ACTIVE',
                'OVERDUE',
                'RETURNED',
              ].map(
                value => (
                  <option
                    key={value}
                    value={value}
                  >
                    {t(value)}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>

        {!loaded ? (
          <p role="status">
            {t(
              failed
                ? 'unavailable'
                : 'loading',
            )}
          </p>
        ) : !visibleLoans.length ? (
          <div
            style={{
              ...cardStyle,
              padding:
                '32px',
              textAlign:
                'center',
            }}
          >
            <p
              style={{
                margin: 0,
                opacity:
                  0.7,
              }}
            >
              {t('empty')}
            </p>
          </div>
        ) : (
          /* White table card restored */
          <div className="portal-card portal-table-wrap lending-table">
            <table className="portal-table">
              <thead>
                <tr>
                  {[
                    'equipment',
                    'borrower_name',
                    'due_date',
                    'status',
                    'action',
                  ].map(
                    key => (
                      <th
                        key={key}
                      >
                        {t(key)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {visibleLoans.map(
                  loan => {
                    const currentLoanStatus =
                      loanStatus(
                        loan,
                      );

                    return (
                      <tr
                        key={loan.id}
                      >
                        <td>
                          <b>
                            {
                              loan.equipment_code
                            }
                          </b>

                          <small>
                            {
                              loan.equipment_name
                            }
                          </small>

                          <small>
                            #{loan.id}
                          </small>
                        </td>

                        <td>
                          {
                            loan.borrower_name
                          }

                          <small dir="ltr">
                            {
                              loan.borrower_phone
                            }
                          </small>

                          {loan.borrower_address && (
                            <small>
                              {
                                loan.borrower_address
                              }
                            </small>
                          )}

                          {loan.notes && (
                            <small>
                              {
                                loan.notes
                              }
                            </small>
                          )}
                        </td>

                        <td>
                          <strong>
                            {date(
                              loan.due_date,
                            )}
                          </strong>

                          <small>
                            {t(
                              'checked_out_at',
                            )}
                            :{' '}
                            {date(
                              loan.checked_out_at,
                            )}
                            {' · '}
                            {
                              loan.checked_out_by_name
                            }
                          </small>

                          {loan.returned_at && (
                            <small>
                              {t(
                                'returned_at',
                              )}
                              :{' '}
                              {date(
                                loan.returned_at,
                              )}
                              {' · '}
                              {
                                loan.returned_by_name
                              }
                            </small>
                          )}
                        </td>

                        <td>
                          <span
                            className={`portal-badge lending-status-${currentLoanStatus.toLowerCase()}`}
                          >
                            {t(
                              currentLoanStatus,
                            )}
                          </span>

                          {loan.returned_at && (
                            <>
                              <small>
                                {t(
                                  loan.return_status,
                                )}
                              </small>

                              {loan.return_notes && (
                                <small>
                                  {
                                    loan.return_notes
                                  }
                                </small>
                              )}
                            </>
                          )}
                        </td>

                        <td>
                          {!loan.returned_at ? (
                            <button
                              className="button button-secondary"
                              disabled={
                                busy ||
                                !!formOpen
                              }
                              onClick={() => {
                                setReturning(
                                  loan,
                                );

                                setSaved(
                                  false,
                                );
                              }}
                            >
                              {t(
                                'returnEquipment',
                              )}
                            </button>
                          ) : (
                            <span className="lending-completed">
                              {locale === 'ar'
                                ? 'مكتمل'
                                : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  /*
   * =========================================================
   * EQUIPMENT INVENTORY
   * =========================================================
   */

  return (
    <div style={pageStyle}>
      <div
        className="portal-heading"
        style={{
          marginBottom:
            '1.5rem',
        }}
      >
        <div>
          <h1>
            {t('equipment')}
          </h1>

          <p>
            {t(
              'equipmentHint',
            )}
          </p>
        </div>

        <button
          className="button button-primary"
          disabled={
            !loaded ||
            busy ||
            !!formOpen
          }
          onClick={() => {
            setSaved(false);
            setEditing(null);
          }}
        >
          {t(
            'addEquipment',
          )}
        </button>
      </div>

      {saved && (
        <p role="status">
          {t('saved')}
        </p>
      )}

      {failed && (
        <div
          className="portal-error"
          role="alert"
        >
          {t('unavailable')}

          <button
            disabled={busy}
            onClick={() =>
              void load()
            }
          >
            {t('retry')}
          </button>
        </div>
      )}

      {loaded && (
        <div className="equipment-kpis">
          <div className="equipment-kpi">
            <span>
              {locale === 'ar'
                ? 'إجمالي المعدات'
                : 'Total equipment'}
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>

          <div className="equipment-kpi available">
            <span>
              {locale === 'ar'
                ? 'متاح'
                : 'Available'}
            </span>

            <strong>
              {
                summary.available
              }
            </strong>
          </div>

          <div className="equipment-kpi loan">
            <span>
              {locale === 'ar'
                ? 'قيد الإعارة'
                : 'On loan'}
            </span>

            <strong>
              {
                summary.on_loan
              }
            </strong>
          </div>

          <div className="equipment-kpi maintenance">
            <span>
              {locale === 'ar'
                ? 'صيانة'
                : 'Maintenance'}
            </span>

            <strong>
              {
                maintenanceCount
              }
            </strong>
          </div>
        </div>
      )}

      {formOpen && (
        <form
          className="equipment-form"
          method="post"
          onSubmit={submit}
          key={
            editing?.id ??
            'new'
          }
          style={{
            ...accentCardStyle,
            marginBottom:
              '24px',
          }}
        >
          <div
            style={{
              marginBottom:
                '1.5rem',
            }}
          >
            <p
              style={{
                margin: 0,
                color:
                  '#ed1c24',
                fontWeight:
                  600,
                fontSize:
                  '0.9rem',
              }}
            >
              {editing
                ? t('edit')
                : t(
                    'addEquipment',
                  )}
            </p>

            <h2
              style={{
                margin:
                  '0.4rem 0 0',
              }}
            >
              {editing
                ? `${t(
                    'edit',
                  )} · ${editing.code}`
                : t(
                    'addEquipment',
                  )}
            </h2>
          </div>

          <fieldset
            className="portal-form-grid"
            disabled={busy}
            style={{
              border: 0,
              margin: 0,
              padding: 0,
            }}
          >
            <Field
              label={t(
                'equipmentCode',
              )}
            >
              <input
                name="code"
                required
                maxLength={40}
                defaultValue={
                  editing?.code ??
                  ''
                }
              />
            </Field>

            <Field
              label={t(
                'type',
              )}
            >
              <select
                name="type"
                required
                defaultValue={
                  editing?.type ??
                  ''
                }
              >
                <option value="">
                  {t('select')}
                </option>

                {types.map(
                  code => (
                    <option
                      key={code}
                      value={code}
                    >
                      {code}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label={t(
                'equipmentName',
              )}
            >
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={
                  editing?.name ??
                  ''
                }
              />
            </Field>

            <Field
              label={t(
                'serial_number',
              )}
            >
              <input
                name="serial_number"
                maxLength={100}
                defaultValue={
                  editing?.serial_number ??
                  ''
                }
              />
            </Field>

            <Field
              label={t('status')}
            >
              <select
                name="status"
                defaultValue={
                  editing?.status ??
                  'AVAILABLE'
                }
              >
                {[
                  'AVAILABLE',
                  'MAINTENANCE',
                  'RETIRED',
                ].map(
                  value => (
                    <option
                      key={value}
                      value={value}
                    >
                      {t(value)}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <div className="portal-full">
              <Field
                label={t(
                  'equipmentNotes',
                )}
              >
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={
                    editing?.notes ??
                    ''
                  }
                />
              </Field>
            </div>
          </fieldset>

          <div
            className="portal-buttons"
            style={{
              marginTop:
                '1.5rem',
              justifyContent:
                'flex-end',
            }}
          >
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={
                closeForm
              }
            >
              {t('close')}
            </button>

            <button
              className="button button-primary"
              disabled={busy}
            >
              {t(
                busy
                  ? 'loading'
                  : 'save',
              )}
            </button>
          </div>
        </form>
      )}

      <div
        className="equipment-filters"
        style={{
          ...accentCardStyle,
          padding:
            '26px',
          marginBottom:
            '20px',
        }}
      >
        <div className="portal-form-grid">
          <Field
            label={t('search')}
          >
            <input
              value={search}
              onChange={
                event =>
                  setSearch(
                    event.target.value,
                  )
              }
              type="search"
            />
          </Field>

          <Field
            label={t('status')}
          >
            <select
              value={status}
              onChange={
                event =>
                  setStatus(
                    event.target.value,
                  )
              }
            >
              <option value="">
                {t('all')}
              </option>

              {[
                'AVAILABLE',
                'ON_LOAN',
                'MAINTENANCE',
                'RETIRED',
              ].map(
                value => (
                  <option
                    key={value}
                    value={value}
                  >
                    {t(value)}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>
      </div>

      {!loaded ? (
        <p role="status">
          {t(
            failed
              ? 'unavailable'
              : 'loading',
          )}
        </p>
      ) : !visibleItems.length ? (
        <div
          style={{
            ...cardStyle,
            padding:
              '32px',
            textAlign:
              'center',
          }}
        >
          <p
            style={{
              margin: 0,
              opacity:
                0.7,
            }}
          >
            {t('empty')}
          </p>
        </div>
      ) : (
        <div
          className="portal-table-wrap equipment-table"
          style={{
            ...cardStyle,
            overflow:
              'hidden',
          }}
        >
          <table className="portal-table">
            <thead>
              <tr>
                {[
                  'equipmentCode',
                  'equipmentName',
                  'type',
                  'status',
                  'action',
                ].map(
                  key => (
                    <th key={key}>
                      {t(key)}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {visibleItems.map(
                item => (
                  <tr
                    key={item.id}
                  >
                    <td>
                      <b>
                        {item.code}
                      </b>

                      {item.serial_number && (
                        <small>
                          {
                            item.serial_number
                          }
                        </small>
                      )}
                    </td>

                    <td>
                      {item.name}

                      {item.notes && (
                        <small>
                          {item.notes}
                        </small>
                      )}
                    </td>

                    <td>
                      {item.type}
                    </td>

                    <td>
                      <span
                        className={`portal-badge ${item.status}`}
                      >
                        {t(
                          item.status,
                        )}
                      </span>
                    </td>

                    <td>
                      {item.status ===
                      'ON_LOAN' ? (
                        <small>
                          {t(
                            'equipment_on_loan_locked',
                          )}
                        </small>
                      ) : (
                        <button
                          className="button button-secondary"
                          disabled={
                            busy ||
                            !!formOpen
                          }
                          onClick={() => {
                            setEditing(
                              item,
                            );

                            setSaved(
                              false,
                            );
                          }}
                        >
                          {t('edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}