import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

export default function ImpactSection({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  const isArabic = locale === 'ar';

  const stats = [
    [612, copy.stat_missions],
    [184, copy.stat_equipment],
    [47, copy.stat_volunteers],
    [22, copy.stat_areas],
  ] as const;

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="border-y border-[var(--border)] bg-[var(--background)] py-12"
      aria-labelledby="impact-heading"
    >
      <div className="page-container">
        <h2
          id="impact-heading"
          className="sr-only"
        >
          {copy.impact_title}
        </h2>

        <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map(([value, label]) => (
            <div
              key={label}
              className="flex flex-col-reverse text-center"
            >
              <dt className="mt-1 text-sm text-[var(--text-secondary)]">
                {label}
              </dt>

              <dd className="text-3xl font-bold tabular-nums">
                {new Intl.NumberFormat(
                  isArabic ? 'ar-LB' : 'en-GB',
                ).format(value)}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-7 text-center text-xs text-[var(--text-secondary)]">
          {copy.sample_note}
        </p>
      </div>
    </section>
  );
}