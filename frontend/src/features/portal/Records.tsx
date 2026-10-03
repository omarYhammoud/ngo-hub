'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type {
  Api,
  Staff,
  Vehicle,
} from './types';

import {
  roles,
  type T,
} from './copy';

import {
  Field,
  Notice,
} from './ui';

/* =========================================================
   STAFF
   ========================================================= */

export function StaffScreen({
  api,
  t,
}: {
  api: Api;
  t: T;
}) {
  const [rows, setRows] = useState<Staff[]>();
  const [editing, setEditing] = useState<Staff | null>();
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState<Staff>();
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    api<Staff[]>('staff/')
      .then(setRows)
      .catch(() => {});
  }, [api]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);

    const form = new FormData(
      event.currentTarget,
    );

    const body: Record<string, unknown> =
      Object.fromEntries(form);

    body.is_active =
      form.has('is_active');

    if (!body.password) {
      delete body.password;
    }

    try {
      await api(
        `staff/${
          editing
            ? `${editing.id}/`
            : ''
        }`,
        editing
          ? 'PATCH'
          : 'POST',
        body,
      );

      setRows(
        await api<Staff[]>(
          'staff/',
        ),
      );

      setEditing(undefined);
    } catch {
      // Portal handles API errors.
    } finally {
      setBusy(false);
    }
  }

  const totalStaff =
    rows?.length ?? 0;

  const enabledStaff =
    rows?.filter(
      row => row.is_active,
    ).length ?? 0;

  const disabledStaff =
    rows?.filter(
      row => !row.is_active,
    ).length ?? 0;

  const superAdmins =
    rows?.filter(
      row =>
        row.role ===
        'SUPER_ADMIN',
    ).length ?? 0;

  function roleClass(
    role: string,
  ) {
    return role
      .toLowerCase()
      .replaceAll(
        '_',
        '-',
      );
  }

  function scrollToStaffForm() {
    setTimeout(() => {
      document
        .querySelector(
          '.staff-form',
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }, 50);
  }

  function scrollToPasswordForm() {
    setTimeout(() => {
      document
        .querySelector(
          '.staff-password-card',
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }, 50);
  }

  return (
    <>
      <div className="portal-heading staff-heading">
        <div>
          <h1>
            {t('staff')}
          </h1>

          <p className="staff-heading-hint">
            {t('staffHint') ===
            'staffHint'
              ? ''
              : t(
                  'staffHint',
                )}
          </p>
        </div>

        <button
          className="button button-primary"
          onClick={() => {
            setEditing(null);
            setResetting(undefined);
            setResetSuccess(false);

            scrollToStaffForm();
          }}
        >
          ＋ {t('newStaff')}
        </button>
      </div>

      {resetSuccess && (
        <div
          className="portal-notice staff-success"
          role="status"
        >
          {t(
            'password_reset_success',
          )}
        </div>
      )}

      {rows && (
        <div className="staff-kpis">
          <div className="staff-kpi total">
            <span>
              {t('staff')}
            </span>

            <strong>
              {totalStaff}
            </strong>
          </div>

          <div className="staff-kpi enabled">
            <span>
              {t('enabled')}
            </span>

            <strong>
              {enabledStaff}
            </strong>
          </div>

          <div className="staff-kpi disabled">
            <span>
              {t('disabled')}
            </span>

            <strong>
              {disabledStaff}
            </strong>
          </div>

          <div className="staff-kpi admin">
            <span>
              {t(
                'SUPER_ADMIN',
              )}
            </span>

            <strong>
              {superAdmins}
            </strong>
          </div>
        </div>
      )}

      {resetting && (
        <PasswordResetForm
          key={resetting.id}
          staff={resetting}
          api={api}
          t={t}
          onClose={() =>
            setResetting(
              undefined,
            )
          }
          onSuccess={() => {
            setResetting(
              undefined,
            );

            setResetSuccess(true);
          }}
        />
      )}

      {editing !==
        undefined && (
        <form
          method="post"
          key={
            editing?.id ||
            'new'
          }
          className="portal-card staff-form"
          onSubmit={submit}
        >
          <div className="staff-form-heading">
            <span>
              {editing
                ? t('edit')
                : t(
                    'newStaff',
                  )}
            </span>

            <h2>
              {editing
                ? editing.username
                : t(
                    'newStaff',
                  )}
            </h2>
          </div>

          <fieldset
            disabled={busy}
          >
            <div className="portal-form-grid">
              {[
                'username',
                'first_name',
                'last_name',
                'phone',
                'email',
              ].map(
                key => (
                  <Field
                    key={key}
                    label={t(
                      key,
                    )}
                  >
                    <input
                      name={key}
                      type={
                        key ===
                        'email'
                          ? 'email'
                          : 'text'
                      }
                      autoComplete="off"
                      required={
                        key ===
                        'username'
                      }
                      defaultValue={String(
                        editing?.[
                          key as keyof Staff
                        ] ??
                          '',
                      )}
                    />
                  </Field>
                ),
              )}

              <Field
                label={t(
                  'role',
                )}
              >
                <select
                  name="role"
                  defaultValue={
                    editing?.role ||
                    'PARAMEDIC'
                  }
                >
                  {roles.map(
                    role => (
                      <option
                        key={
                          role
                        }
                        value={
                          role
                        }
                      >
                        {t(
                          role,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              {!editing && (
                <Field
                  label={t(
                    'password',
                  )}
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
              )}

              <label className="portal-checkbox staff-active-checkbox">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={
                    editing
                      ?.is_active ??
                    true
                  }
                />

                <span>
                  {t(
                    'is_active',
                  )}
                </span>
              </label>
            </div>
          </fieldset>

          {!editing && (
            <Notice
              text={t(
                'passwordRules',
              )}
            />
          )}

          <div className="portal-buttons staff-form-actions">
            <button
              disabled={busy}
              className="button button-primary"
            >
              {busy
                ? t(
                    'loading',
                  )
                : t(
                    'save',
                  )}
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() =>
                setEditing(
                  undefined,
                )
              }
            >
              {t('close')}
            </button>
          </div>
        </form>
      )}

      <section className="portal-card portal-table-wrap staff-table-card">
        <div className="staff-table-heading">
          <div>
            <h2>
              {t('staff')}
            </h2>

            {rows && (
              <span>
                {rows.length}{' '}
                {t('staff')}
              </span>
            )}
          </div>
        </div>

        {!rows ? (
          <p role="status">
            {t('loading')}
          </p>
        ) : !rows.length ? (
          <div className="portal-empty">
            <p>
              {t('empty')}
            </p>
          </div>
        ) : (
          <table className="portal-table staff-table">
            <thead>
              <tr>
                {[
                  'username',
                  'role',
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
              {rows.map(
                row => (
                  <tr
                    key={row.id}
                  >
                    <td>
                      <div className="staff-identity">
                        <div className="staff-avatar-small">
                          {row.username
                            .slice(
                              0,
                              2,
                            )
                            .toUpperCase()}
                        </div>

                        <div>
                          <b>
                            {
                              row.username
                            }
                          </b>

                          {(row.first_name ||
                            row.last_name) && (
                            <small>
                              {
                                row.first_name
                              }{' '}
                              {
                                row.last_name
                              }
                            </small>
                          )}

                          {row.email && (
                            <small>
                              {
                                row.email
                              }
                            </small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`staff-role-badge ${roleClass(
                          row.role,
                        )}`}
                      >
                        {t(
                          row.role,
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          row.is_active
                            ? 'staff-status enabled'
                            : 'staff-status disabled'
                        }
                      >
                        <span className="staff-status-dot" />

                        {t(
                          row.is_active
                            ? 'enabled'
                            : 'disabled',
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="staff-actions">
                        <button
                          className="button button-secondary"
                          onClick={() => {
                            setEditing(
                              row,
                            );

                            setResetting(
                              undefined,
                            );

                            setResetSuccess(
                              false,
                            );

                            scrollToStaffForm();
                          }}
                        >
                          {t('edit')}
                        </button>

                        <button
                          className="button button-secondary staff-reset-button"
                          onClick={() => {
                            setResetting(
                              row,
                            );

                            setResetSuccess(
                              false,
                            );

                            setEditing(
                              undefined,
                            );

                            scrollToPasswordForm();
                          }}
                        >
                          {t(
                            'resetPassword',
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* =========================================================
   PASSWORD RESET
   ========================================================= */

function PasswordResetForm({
  staff,
  api,
  t,
  onClose,
  onSuccess,
}: {
  staff: Staff;
  api: Api;
  t: T;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [visible, setVisible] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    const form =
      event.currentTarget;

    const data =
      new FormData(form);

    const newPassword =
      String(
        data.get(
          'new_password',
        ) || '',
      );

    const confirmation =
      String(
        data.get(
          'confirm_password',
        ) || '',
      );

    if (
      newPassword !==
      confirmation
    ) {
      setError(
        t(
          'password_mismatch',
        ),
      );

      return;
    }

    setBusy(true);

    try {
      await api(
        `staff/${staff.id}/reset_password/`,
        'POST',
        {
          new_password:
            newPassword,

          confirm_password:
            confirmation,
        },
      );

      form.reset();

      onSuccess();
    } catch {
      // Portal handles API errors.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      method="post"
      className="portal-card staff-password-card"
      onSubmit={submit}
    >
      <div className="staff-form-heading">
        <span>
          {t(
            'resetPassword',
          )}
        </span>

        <h2>
          {staff.username}
        </h2>
      </div>

      {error && (
        <div
          className="portal-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <fieldset
        disabled={busy}
        className="portal-form-grid"
      >
        {[
          'new_password',
          'confirm_password',
        ].map(
          name => (
            <Field
              key={name}
              label={t(
                name,
              )}
            >
              <input
                name={name}
                type={
                  visible
                    ? 'text'
                    : 'password'
                }
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={1024}
              />
            </Field>
          ),
        )}
      </fieldset>

      <button
        type="button"
        className="button button-secondary staff-password-toggle"
        aria-pressed={
          visible
        }
        onClick={() =>
          setVisible(
            value =>
              !value,
          )
        }
      >
        {t(
          visible
            ? 'hidePassword'
            : 'showPassword',
        )}
      </button>

      <Notice
        text={t(
          'passwordRules',
        )}
      />

      <div className="portal-buttons staff-form-actions">
        <button
          disabled={busy}
          className="button button-primary"
        >
          {busy
            ? t(
                'loading',
              )
            : t(
                'resetPassword',
              )}
        </button>

        <button
          type="button"
          disabled={busy}
          className="button button-secondary"
          onClick={onClose}
        >
          {t('close')}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   VEHICLES
   ========================================================= */

export function VehiclesScreen({
  api,
  t,
}: {
  api: Api;
  t: T;
}) {
  const [rows, setRows] =
    useState<Vehicle[]>();

  const [editing, setEditing] =
    useState<Vehicle | null>();

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    api<Vehicle[]>(
      'vehicles/',
    )
      .then(setRows)
      .catch(() => {});
  }, [api]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);

    const form =
      new FormData(
        event.currentTarget,
      );

    const body: Record<
      string,
      unknown
    > =
      Object.fromEntries(
        form,
      );

    body.mileage =
      Number(
        body.mileage ||
          0,
      );

    body.year =
      body.year
        ? Number(
            body.year,
          )
        : null;

    try {
      await api(
        `vehicles/${
          editing
            ? `${editing.id}/`
            : ''
        }`,
        editing
          ? 'PATCH'
          : 'POST',
        body,
      );

      setRows(
        await api<
          Vehicle[]
        >(
          'vehicles/',
        ),
      );

      setEditing(
        undefined,
      );
    } catch {
      // Portal handles API errors.
    } finally {
      setBusy(false);
    }
  }

  const totalVehicles =
    rows?.length ?? 0;

  const availableVehicles =
    rows?.filter(
      vehicle =>
        vehicle.status ===
        'AVAILABLE',
    ).length ?? 0;

  const missionVehicles =
    rows?.filter(
      vehicle =>
        vehicle.status ===
        'ON_MISSION',
    ).length ?? 0;

  const maintenanceVehicles =
    rows?.filter(
      vehicle =>
        vehicle.status ===
        'MAINTENANCE',
    ).length ?? 0;

  function scrollToVehicleForm() {
    setTimeout(() => {
      document
        .querySelector(
          '.vehicle-form',
        )
        ?.scrollIntoView({
          behavior:
            'smooth',
          block:
            'start',
        });
    }, 50);
  }

  function openNewVehicle() {
    setEditing(
      null,
    );

    scrollToVehicleForm();
  }

  function openVehicleEdit(
    vehicle: Vehicle,
  ) {
    setEditing(
      vehicle,
    );

    scrollToVehicleForm();
  }

  return (
    <>
      {/* =====================================================
          HEADING
          ===================================================== */}

      <div className="portal-heading vehicles-heading">
        <div>
          <h1>
            {t(
              'vehicles',
            )}
          </h1>
        </div>

        <button
          className="button button-primary"
          onClick={
            openNewVehicle
          }
        >
          ＋{' '}
          {t(
            'newVehicle',
          )}
        </button>
      </div>

      {/* =====================================================
          KPI CARDS
          ===================================================== */}

      {rows && (
        <div className="vehicle-kpis">
          <div className="vehicle-kpi total">
            <span>
              {t(
                'vehicles',
              )}
            </span>

            <strong>
              {
                totalVehicles
              }
            </strong>
          </div>

          <div className="vehicle-kpi available">
            <span>
              {t(
                'AVAILABLE',
              )}
            </span>

            <strong>
              {
                availableVehicles
              }
            </strong>
          </div>

          <div className="vehicle-kpi mission">
            <span>
              {t(
                'ON_MISSION',
              )}
            </span>

            <strong>
              {
                missionVehicles
              }
            </strong>
          </div>

          <div className="vehicle-kpi maintenance">
            <span>
              {t(
                'MAINTENANCE',
              )}
            </span>

            <strong>
              {
                maintenanceVehicles
              }
            </strong>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE / EDIT VEHICLE
          ===================================================== */}

      {editing !==
        undefined && (
        <form
          method="post"
          key={
            editing?.id ||
            'new'
          }
          onSubmit={
            submit
          }
          className="portal-card vehicle-form"
        >
          <div className="vehicle-form-heading">
            <span>
              {editing
                ? t(
                    'edit',
                  )
                : t(
                    'newVehicle',
                  )}
            </span>

            <h2>
              {editing
                ? editing.code
                : t(
                    'newVehicle',
                  )}
            </h2>
          </div>

          <fieldset
            disabled={
              busy
            }
          >
            <div className="portal-form-grid">
              {[
                'code',
                'plate_number',
                'type',
                'model',
              ].map(
                key => (
                  <Field
                    key={
                      key
                    }
                    label={t(
                      key,
                    )}
                  >
                    <input
                      name={
                        key
                      }
                      required={
                        key !==
                        'model'
                      }
                      defaultValue={
                        String(
                          editing?.[
                            key as keyof Vehicle
                          ] ||
                            '',
                        )
                      }
                    />
                  </Field>
                ),
              )}

              <Field
                label={t(
                  'year',
                )}
              >
                <input
                  name="year"
                  type="number"
                  min={
                    1900
                  }
                  max={
                    2100
                  }
                  defaultValue={
                    editing?.year ||
                    ''
                  }
                />
              </Field>

              <Field
                label={t(
                  'mileage',
                )}
              >
                <input
                  name="mileage"
                  type="number"
                  min={0}
                  defaultValue={
                    editing?.mileage ||
                    0
                  }
                />
              </Field>

              <Field
                label={t(
                  'status',
                )}
              >
                <select
                  name="status"
                  defaultValue={
                    editing?.status ||
                    'AVAILABLE'
                  }
                >
                  {(editing?.status ===
                  'ON_MISSION'
                    ? [
                        'AVAILABLE',
                        'ON_MISSION',
                        'MAINTENANCE',
                      ]
                    : [
                        'AVAILABLE',
                        'MAINTENANCE',
                      ]
                  ).map(
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
            </div>
          </fieldset>

          <div className="portal-buttons vehicle-form-actions">
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
                    'save',
                  )}
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={
                busy
              }
              onClick={() =>
                setEditing(
                  undefined,
                )
              }
            >
              {t(
                'close',
              )}
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          VEHICLES TABLE
          ===================================================== */}

      <section className="portal-card portal-table-wrap vehicles-table-card">
        <div className="vehicles-table-heading">
          <div>
            <h2>
              {t(
                'vehicles',
              )}
            </h2>

            {rows && (
              <span>
                {
                  rows.length
                }{' '}
                {t(
                  'vehicles',
                )}
              </span>
            )}
          </div>
        </div>

        {!rows ? (
          <p role="status">
            {t(
              'loading',
            )}
          </p>
        ) : !rows.length ? (
          <div className="portal-empty">
            <p>
              {t(
                'empty',
              )}
            </p>
          </div>
        ) : (
          <table className="portal-table vehicles-table">
            <thead>
              <tr>
                {[
                  'code',
                  'plate_number',
                  'model',
                  'status',
                  'action',
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
              {rows.map(
                row => (
                  <tr
                    key={
                      row.id
                    }
                  >
                    <td>
                      <div className="vehicle-code-cell">
                        <div className="vehicle-code-icon">
                          🚑
                        </div>

                        <div>
                          <b>
                            {
                              row.code
                            }
                          </b>

                          {row.type && (
                            <small>
                              {
                                row.type
                              }
                            </small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="vehicle-plate">
                        {
                          row.plate_number
                        }
                      </span>
                    </td>

                    <td>
                      {row.model ? `${row.model}${row.year ? ` (${row.year})` : ''}` : '—'}
                    </td>

                    <td>
                      <span
                        className={`vehicle-list-status ${row.status
                          .toLowerCase()
                          .replaceAll(
                            '_',
                            '-',
                          )}`}
                      >
                        <span className="vehicle-status-dot" />

                        {t(
                          row.status,
                        )}
                      </span>
                    </td>

                    <td>
                      <button
                        className="button button-secondary vehicle-edit-button"
                        onClick={() =>
                          openVehicleEdit(
                            row,
                          )
                        }
                      >
                        {t(
                          'edit',
                        )}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}