import type { Dictionary, Locale } from '@/i18n/dictionaries';
import ButtonLink from '@/components/ui/ButtonLink';
import Icon from '@/components/ui/Icon';

export default function HeroSection({ copy, locale }: { copy: Dictionary; locale: Locale }) {
  return <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--ima-red-light)] to-white">
    <div className="page-container grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-3xl leading-tight font-bold sm:text-4xl">{copy.hero_title}</h1>
        <p className="mb-8 max-w-lg leading-relaxed text-[var(--text-secondary)]">{copy.hero_sub}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/${locale}/donate`} className="px-5 py-3 text-base"><Icon name="heart" className="size-4" />{copy.hero_cta_donate}</ButtonLink>
          <ButtonLink href={`/${locale}/volunteer`} variant="secondary" className="px-5 py-3 text-base">{copy.hero_cta_volunteer}</ButtonLink>
        </div>
      </div>
      <div aria-hidden="true" className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-[var(--foreground)] text-white/80 sm:h-80">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[var(--ima-red)]" />
        <Icon name="mission" className="size-24" />
      </div>
    </div>
  </section>;
}
