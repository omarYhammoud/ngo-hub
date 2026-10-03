import type { Dictionary, Locale } from '@/i18n/dictionaries';
import ButtonLink from '@/components/ui/ButtonLink';
import Icon from '@/components/ui/Icon';

export default function HeroSection({
  copy,
  locale,
}: {
  copy: Dictionary;
  locale: Locale;
}) {
  const isArabic = locale === 'ar';

  return (
    <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--ima-red-light)] to-white">
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        className="page-container grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2"
      >
        <div className="text-start">
          <h1 className="mb-4 text-start text-3xl leading-tight font-bold sm:text-4xl">
            {copy.hero_title}
          </h1>

          <p className="mb-8 max-w-lg text-start leading-relaxed text-[var(--text-secondary)]">
            {copy.hero_sub}
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href={`/${locale}/donate`}
              className="px-5 py-3 text-base"
            >
              <Icon name="heart" className="size-4" />
              {copy.hero_cta_donate}
            </ButtonLink>

            <ButtonLink
              href={`/${locale}/volunteer`}
              variant="secondary"
              className="px-5 py-3 text-base"
            >
              {copy.hero_cta_volunteer}
            </ButtonLink>
          </div>
        </div>

        <figure className="overflow-hidden rounded-2xl border-t-4 border-[var(--ima-red)] bg-white shadow-sm">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6233.403939243966!2d35.3871513!3d33.5668299!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151ef01cdabef75f%3A0x7b7c657a8951d3f2!2z2YXYsdmD2LIg2KfZhNis2YXYudmK2Kkg2KfZhNi32KjZitipINin2YTYp9iz2YTYp9mF2YrYqSAt2LXZitiv2Kc!5e1!3m2!1sar!2slb"
            title={
              isArabic
                ? 'موقع مركز الجمعية الطبية الإسلامية في صيدا'
                : 'Islamic Medical Association centre in Saida'
            }
            className="block h-64 w-full border-0 sm:h-80"
            loading="eager"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />

          <figcaption className="flex justify-between gap-4 px-4 py-3 text-sm text-[var(--text-secondary)]">
            <span>
              {isArabic ? 'القياعة، صيدا، لبنان' : 'Al-Qayaa, Saida, Lebanon'}
            </span>

            <a
              href="https://maps.app.goo.gl/Lx3wGCQwzqsWYCwR7"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--ima-red-dark)] hover:underline"
            >
              {isArabic ? 'الاتجاهات' : 'Get directions'} ↗
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}