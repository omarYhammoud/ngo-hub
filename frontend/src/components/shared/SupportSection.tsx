import type { Dictionary, Locale } from '@/i18n/dictionaries';
import ButtonLink from '@/components/ui/ButtonLink';

export default function SupportSection({ copy, locale }: { copy: Dictionary; locale: Locale }) {
  return <section className="page-container grid gap-5 pb-16 sm:grid-cols-2">
    <div className="rounded-xl border border-green-200 bg-[var(--ima-green-light)] p-7">
      <h2 className="mb-2 font-semibold">{copy.volunteer_cta_title}</h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{copy.volunteer_cta_body}</p>
      <ButtonLink href={`/${locale}/volunteer`} variant="positive">{copy.hero_cta_volunteer}</ButtonLink>
    </div>
    <div className="rounded-xl border border-red-100 bg-[var(--ima-red-light)] p-7">
      <h2 className="mb-2 font-semibold">{copy.donate_cta_title}</h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{copy.donate_cta_body}</p>
      <ButtonLink href={`/${locale}/donate`}>{copy.hero_cta_donate}</ButtonLink>
    </div>
  </section>;
}
