'use client';

import {
  useState,
  type FormEvent,
} from 'react';

import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

type ContactFormProps = {
  copy: Dictionary;
  locale: Locale;
};

type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const initialForm: ContactFormData = {
  name: '',
  email: '',
  subject: '',
  message: '',
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

export default function ContactForm({
  copy,
  locale,
}: ContactFormProps) {
  const isArabic =
    locale === 'ar';

  const [form, setForm] =
    useState<ContactFormData>(
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

  function updateField(
    field: keyof ContactFormData,
    value: string,
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
          `${apiBase}/api/submissions/contact/`,
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
                ? 'تعذر إرسال الرسالة.'
                : 'Unable to send your message.'
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
            ? 'حدث خطأ أثناء إرسال الرسالة.'
            : 'Something went wrong while sending your message.',
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

            <div className="text-start">
              <h2 className="text-start text-lg font-semibold text-[#244C32]">
                {isArabic
                  ? 'تم إرسال رسالتك بنجاح'
                  : 'Message sent successfully'}
              </h2>

              <p className="mt-2 text-start leading-relaxed text-[#4D6A58]">
                {isArabic
                  ? 'شكراً لتواصلك معنا. تم استلام رسالتك وسيتم مراجعتها.'
                  : 'Thank you for contacting us. Your message has been received and will be reviewed.'}
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
              ? 'تواصل معنا'
              : 'Get in touch'}
          </p>

          <p className="mt-2 max-w-xl text-start text-sm leading-7 text-[#66706B]">
            {isArabic
              ? 'أرسل لنا رسالتك وسنتواصل معك في أقرب وقت ممكن.'
              : 'Send us a message and our team will get back to you as soon as possible.'}
          </p>
        </div>

        <div className="grid gap-x-5 sm:grid-cols-2">
          <div className="mb-5">
            <label
              htmlFor="contact-name"
              className="mb-2 block text-start text-sm font-semibold text-[#303633]"
            >
              {
                copy.contact_form_name
              }

              <span className="ms-1 text-[var(--ima-red)]">
                *
              </span>
            </label>

            <input
              id="contact-name"
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
              htmlFor="contact-email"
              className="mb-2 block text-start text-sm font-semibold text-[#303633]"
            >
              {
                copy.contact_form_email
              }

              <span className="ms-1 text-[var(--ima-red)]">
                *
              </span>
            </label>

            <input
              id="contact-email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={
                form.email
              }
              placeholder="name@example.com"
              onChange={event =>
                updateField(
                  'email',
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
            htmlFor="contact-subject"
            className="mb-2 block text-start text-sm font-semibold text-[#303633]"
          >
            {
              copy.contact_form_subject
            }
          </label>

          <input
            id="contact-subject"
            type="text"
            maxLength={200}
            value={
              form.subject
            }
            placeholder={
              isArabic
                ? 'موضوع الرسالة'
                : 'How can we help?'
            }
            onChange={event =>
              updateField(
                'subject',
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
            htmlFor="contact-message"
            className="mb-2 block text-start text-sm font-semibold text-[#303633]"
          >
            {
              copy.contact_form_msg
            }
          </label>

          <textarea
            id="contact-message"
            rows={5}
            value={
              form.message
            }
            placeholder={
              isArabic
                ? 'اكتب رسالتك هنا...'
                : 'Write your message here...'
            }
            onChange={event =>
              updateField(
                'message',
                event
                  .target
                  .value,
              )
            }
            className="w-full resize-y rounded-xl border border-[#DDE4E0] bg-[#F7F9F8] px-4 py-3 text-start leading-relaxed text-[#222725] outline-none transition placeholder:text-[#9AA39F] hover:border-[#CBD5D0] focus:border-[var(--ima-red)] focus:bg-white focus:ring-4 focus:ring-red-500/5"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#F1C7C9] bg-[#FFF5F5] px-4 py-3 text-start text-sm leading-relaxed text-[#A72B31]"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="hidden text-start text-xs leading-relaxed text-[#8A948F] sm:block">
            {isArabic
              ? 'سيتم استخدام معلوماتك للرد على رسالتك فقط.'
              : 'Your information will only be used to respond to your message.'}
          </p>

          <button
            type="submit"
            disabled={
              submitting
            }
            className="min-w-[150px] rounded-xl bg-[var(--ima-red)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
          >
            {submitting
              ? isArabic
                ? 'جارٍ الإرسال...'
                : 'Sending...'
              : copy.contact_form_submit}
          </button>
        </div>
      </div>
    </form>
  );
}