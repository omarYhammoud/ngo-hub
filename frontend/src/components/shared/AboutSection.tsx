import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

export default function AboutSection({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  const isArabic =
    locale === 'ar';

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="page-container py-16 text-start"
      aria-labelledby="about-heading"
    >
      <h2
        id="about-heading"
        className="mb-3 text-start text-xl font-bold"
      >
        {copy.intro_title}
      </h2>

      <p className="max-w-3xl text-start leading-relaxed text-[var(--text-secondary)]">
        {copy.intro_body}
      </p>
    </section>
  );
}