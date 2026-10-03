'use client';

import {
  useState,
  type FormEvent,
} from 'react';

import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

type VolunteerFormProps = {
  copy: Dictionary;
  locale: Locale;
};

type VolunteerRole =
  | 'PARAMEDIC'
  | 'DRIVER'
  | 'LOGISTICS'
  | 'FUNDRAISING';

type VolunteerFormData = {
  name: string;
  phone: string;
  area: string;
  role: VolunteerRole;
};

const initialForm: VolunteerFormData = {
  name: '',
  phone: '',
  area: '',
  role: 'PARAMEDIC',
};

function getFirstError(
  data: unknown,
): string | null {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return null;
  }

  for (
    const value
    of Object.values(data)
  ) {
    if (
      typeof value === 'string'
    ) {
      return value;
    }

    if (
      Array.isArray(value)
    ) {
      const first =
        value.find(
          item =>
            typeof item ===
            'string',
        );

      if (
        typeof first ===
        'string'
      ) {
        return first;
      }
    }
  }

  return null;
}

export default function VolunteerForm({
  copy,
  locale,
}: VolunteerFormProps) {
  const isArabic =
    locale === 'ar';

  const [form, setForm] =
    useState<VolunteerFormData>(
      initialForm,
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [error, setError] =
    useState('');

  function updateField<
    K extends keyof VolunteerFormData,
  >(
    field: K,
    value:
      VolunteerFormData[K],
  ) {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError('');

    try {
      const apiBase =
        (
          process.env
            .NEXT_PUBLIC_API_BASE_URL ??
          'http://127.0.0.1:8000'
        ).replace(/\/$/, '');

      const response =
        await fetch(
          `${apiBase}/api/submissions/volunteer/`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        const firstError =
          getFirstError(data);

        throw new Error(
          firstError ??
            (
              isArabic
                ? 'تعذر إرسال طلب التطوع.'
                : 'Unable to submit your volunteer application.'
            ),
        );
      }

      setSubmitted(true);

      setForm(
        initialForm,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? 'حدث خطأ أثناء إرسال طلب التطوع.'
            : 'Something went wrong while submitting your application.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section
        dir={
          isArabic
            ? 'rtl'
            : 'ltr'
        }
        className="overflow-hidden rounded-2xl border border-[#CFE5D8] bg-[#F4FBF6] text-start"
      >
        <div className="border-s-4 border-s-[#4C9A6A] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1F3E7] text-lg text-[#327A50]">
              ✓
            </div>

            <div>
              <h2 className="text-start text-lg font-semibold text-[#244C32]">
                {isArabic
                  ? 'تم إرسال طلب التطوع بنجاح'
                  : 'Volunteer application submitted'}
              </h2>

              <p className="mt-2 text-start text-sm leading-relaxed text-[#4D6A58]">
                {isArabic
                  ? 'شكراً لاهتمامك بالتطوع معنا. تم استلام طلبك وسيتم مراجعته.'
                  : 'Thank you for your interest in volunteering with us. Your application has been received and will be reviewed.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
      onSubmit={
        handleSubmit
      }
      className="overflow-hidden rounded-2xl border border-[#E3E9E6] bg-[#FCFDFC] text-start shadow-[0_8px_30px_rgba(23,23,23,0.04)]"
    >
      <div className="border-s-4 border-s-[var(--ima-red)] p-6 sm:p-8">
        <div className="mb-7 text-start">
          <p className="text-start text-sm font-medium text-[var(--ima-red)]">
            {isArabic
              ? 'انضم إلى فريقنا'
              : 'Join our team'}
          </p>

          <p className="mt-2 text-start text-sm leading-7 text-[#66706B]">
            {isArabic
              ? 'أرسل طلب التطوع وسيتواصل معك فريقنا بعد مراجعته.'
              : 'Submit your volunteer application and our team will contact you after review.'}
          </p>
        </div>

        <div className="grid gap-x-5 sm:grid-cols-2">
          <div className="mb-5">
            <label
              htmlFor="volunteer-name"
              className="mb-2 block text-start text-sm font-semibold text-[#303633]"
            >
              {
                copy.volunteer_form_name
              }

              <span className="ms-1 text-[var(--ima-red)]">
                *
              </span>
            </label>

            <input
              id="volunteer-name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              autoComplete="name"
              value={
                form.name
              }
              placeholder={
                isArabic
                  ? 'الاسم الكامل'
                  : 'Full name'
              }
              onChange={event =>
                updateField(
                  'name',
                  event
                    .target
                    .value,
                )
              }
              className="w-full rounded-xl border border-[#DDE4E0] bg-[#F7F9F8] px-4 py-3 text-start text-[#222725] outline-none transition placeholder:text-[#9AA39F] hover:border-[#CBD5D0] focus:border-[var(--ima-red)] focus:bg-white focus:ring-4 focus:ring-red-500/5"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="volunteer-phone"
              className="mb-2 block text-start text-sm font-semibold text-[#303633]"
            >
              {
                copy.volunteer_form_phone
              }

              <span className="ms-1 text-[var(--ima-red)]">
                *
              </span>
            </label>

            <input
              id="volunteer-phone"
              type="tel"
              dir="ltr"
              required
              minLength={6}
              maxLength={30}
              autoComplete="tel"
              value={
                form.phone
              }
              placeholder="03 123 456"
              onChange={event =>
                updateField(
                  'phone',
                  event
                    .target
                    .value,
                )
              }
              className="w-full rounded-xl border border-[#DDE4E0] bg-[#F7F9F8] px-4 py-3 text-left text-[#222725] outline-none transition placeholder:text-[#9AA39F] hover:border-[#CBD5D0] focus:border-[var(--ima-red)] focus:bg-white focus:ring-4 focus:ring-red-500/5"
            />
          </div>
        </div>

        <div className="mb-5">
          <label
            htmlFor="volunteer-area"
            className="mb-2 block text-start text-sm font-semibold text-[#303633]"
          >
            {
              copy.volunteer_form_area
            }
          </label>

          <input
            id="volunteer-area"
            type="text"
            maxLength={150}
            value={
              form.area
            }
            placeholder={
              isArabic
                ? 'صيدا، بيروت، البقاع...'
                : 'Saida, Beirut, Bekaa...'
            }
            onChange={event =>
              updateField(
                'area',
                event
                  .target
                  .value,
              )
            }
            className="w-full rounded-xl border border-[#DDE4E0] bg-[#F7F9F8] px-4 py-3 text-start text-[#222725] outline-none transition placeholder:text-[#9AA39F] hover:border-[#CBD5D0] focus:border-[var(--ima-red)] focus:bg-white focus:ring-4 focus:ring-red-500/5"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="volunteer-role"
            className="mb-2 block text-start text-sm font-semibold text-[#303633]"
          >
            {
              copy.volunteer_form_role
            }
          </label>

          <select
            id="volunteer-role"
            required
            value={
              form.role
            }
            onChange={event =>
              updateField(
                'role',
                event
                  .target
                  .value as VolunteerRole,
              )
            }
            className="w-full rounded-xl border border-[#DDE4E0] bg-[#F7F9F8] px-4 py-3 text-start text-[#222725] outline-none transition hover:border-[#CBD5D0] focus:border-[var(--ima-red)] focus:bg-white focus:ring-4 focus:ring-red-500/5"
          >
            <option value="PARAMEDIC">
              {isArabic
                ? 'مسعف'
                : 'Paramedic'}
            </option>

            <option value="DRIVER">
              {isArabic
                ? 'سائق'
                : 'Driver'}
            </option>

            <option value="LOGISTICS">
              {isArabic
                ? 'دعم لوجستي'
                : 'Logistics'}
            </option>

            <option value="FUNDRAISING">
              {isArabic
                ? 'جمع التبرعات'
                : 'Fundraising'}
            </option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#F1C7C9] bg-[#FFF5F5] px-4 py-3 text-start text-sm leading-relaxed text-[#A72B31]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            submitting
          }
          className="rounded-xl bg-[var(--ima-red)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {submitting
            ? isArabic
              ? 'جارٍ الإرسال...'
              : 'Submitting...'
            : isArabic
              ? 'إرسال طلب التطوع'
              : 'Submit application'}
        </button>
      </div>
    </form>
  );
}