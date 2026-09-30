import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

import Icon, {
  type IconName,
} from '@/components/ui/Icon';


const icons: IconName[] = [
  'mission',
  'lending',
  'user',
  'activity',
];


export function ServiceCards({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  const isArabic =
    locale === 'ar';

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {copy.services_list_t.map(
        (title, index) => (
          <article
            key={title}
            className="card p-5 text-start"
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[var(--ima-green-light)] text-[var(--ima-green-dark)]">
              <Icon
                name={icons[index]}
              />
            </div>

            <h3 className="mb-2 text-sm font-semibold">
              {title}
            </h3>

            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {
                copy
                  .services_list_b[
                    index
                  ]
              }
            </p>
          </article>
        ),
      )}
    </div>
  );
}


export default function ServicesSection({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  return (
    <section
      dir={
        locale === 'ar'
          ? 'rtl'
          : 'ltr'
      }
      className="page-container py-16"
      aria-labelledby="services-heading"
    >
      <h2
        id="services-heading"
        className="mb-6 text-start text-xl font-bold"
      >
        {copy.services_title}
      </h2>

      <ServiceCards
        copy={copy}
        locale={locale}
      />
    </section>
  );
}