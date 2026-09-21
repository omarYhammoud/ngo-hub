import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import Icon from '@/components/ui/Icon';
import { activities } from '@/features/public/activities';

export function ActivityCards({ locale, preview = false }: { locale: Locale; preview?: boolean }) {
  const entries = preview ? activities.slice(0, 3) : activities;
  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return <div className={`grid gap-5 ${preview ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{entries.map(activity => <article className="card overflow-hidden" key={activity.date}>
    <div aria-hidden="true" className="flex h-32 items-center justify-center bg-[#FEE2E2] text-[#F87171]"><Icon name="activity" className="size-8" /></div>
    <div className="p-5">
      <time dateTime={activity.date} className="mb-2 block text-xs text-[var(--text-secondary)]">{date.format(new Date(`${activity.date}T12:00:00Z`))}</time>
      <h3 className="text-sm leading-snug font-semibold">{activity.title[locale]}</h3>
      {!preview && <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{activity.description[locale]}</p>}
    </div>
  </article>)}</div>;
}
export default function ActivitiesSection({ copy, locale }: { copy: Dictionary; locale: Locale }) {
  return <section className="page-container py-16" aria-labelledby="activities-heading">
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id="activities-heading" className="text-xl font-bold">{copy.activities_title}</h2>
      <Link href={`/${locale}/activities`} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ima-red-dark)] hover:underline">{copy.view_all}<Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>
    </div>
    <p className="mb-5 text-xs text-[var(--text-secondary)]">{copy.sample_note}</p>
    <ActivityCards locale={locale} preview />
  </section>;
}
