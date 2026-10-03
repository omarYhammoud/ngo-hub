import Image from 'next/image';
import Link from 'next/link';

import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

import Icon from '@/components/ui/Icon';
import { activities } from '@/features/public/activities';

export function ActivityCards({
  locale,
  preview = false,
}: {
  locale: Locale;
  preview?: boolean;
}) {
  const isArabic = locale === 'ar';
  const entries = preview
    ? activities.slice(0, 3)
    : activities;

  const date = new Intl.DateTimeFormat(
    isArabic ? 'ar-LB' : 'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    },
  );

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`grid gap-5 ${
        preview ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      }`}
    >
      {entries.map((activity) => (
        <article
          className="card overflow-hidden text-start"
          key={activity.source}
        >
          <a
            href={activity.source}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-[4/3] overflow-hidden bg-[#f3f4f6]"
            aria-label={activity.title[locale]}
          >
            <Image
              src={activity.image}
              alt={activity.title[locale]}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover object-center transition-transform duration-300 hover:scale-105"
            />
          </a>

          <div className="p-5">
            <time
              dateTime={activity.date}
              className="mb-2 block text-xs text-[var(--text-secondary)]"
            >
              {date.format(
                new Date(`${activity.date}T12:00:00Z`),
              )}
            </time>

            <h3 className="text-sm leading-snug font-semibold">
              {activity.title[locale]}
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {activity.description[locale]}
            </p>

            <a
              href={activity.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-[var(--ima-red-dark)] hover:underline"
            >
              {isArabic
                ? 'شاهد المنشور الأصلي'
                : 'View original post'}{' '}
              ↗
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function ActivitiesSection({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  const isArabic = locale === 'ar';

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="page-container py-16"
      aria-labelledby="activities-heading"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2
          id="activities-heading"
          className="text-start text-xl font-bold"
        >
          {copy.activities_title}
        </h2>

        <Link
          href={`/${locale}/activities`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ima-red-dark)] hover:underline"
        >
          {copy.view_all}

          <Icon
            name="arrow"
            className={`size-4 ${
              isArabic ? 'rotate-180' : ''
            }`}
          />
        </Link>
      </div>

      <p className="mb-5 text-start text-xs text-[var(--text-secondary)]">
        {isArabic
          ? 'أخبار ومنشورات من حساب الجمعية الرسمي على إنستغرام.'
          : 'News and posts from the association’s official Instagram.'}
      </p>

      <ActivityCards
        locale={locale}
        preview
      />
    </section>
  );
}