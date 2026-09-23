import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { ServiceCards } from '@/components/shared/ServicesSection';
import { ActivityCards } from '@/components/shared/ActivitiesSection';
import ButtonLink from '@/components/ui/ButtonLink';
import StaffPortal from '@/features/auth/StaffPortal';

export const publicPages = ['about', 'services', 'activities', 'volunteer', 'donate', 'contact', 'login'] as const;
export type PublicPage = typeof publicPages[number];
export function isPublicPage(value: string): value is PublicPage {
  return publicPages.some(page => page === value);
}
export function pageTitle(page: PublicPage, copy: Dictionary) {
  return { about: copy.about_intro_t, services: copy.services_title, activities: copy.activities_title, volunteer: copy.volunteer_title, donate: copy.donate_title, contact: copy.contact_title, login: copy.login_title }[page];
}

export default function InformationPage({ page, copy, locale }: { page: PublicPage; copy: Dictionary; locale: Locale }) {
  const introductions: Partial<Record<PublicPage, string>> = { volunteer: copy.volunteer_cta_body, donate: copy.donate_cta_body, contact: copy.footer_tagline, login: copy.login_sub };
  const pendingMessages: Partial<Record<PublicPage, string>> = { volunteer: copy.volunteer_pending, donate: copy.donate_pending, contact: copy.contact_pending, login: copy.login_pending };
  return <div className="page-container min-h-[55vh] py-16">
    <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{pageTitle(page, copy)}</h1>
    {page === 'contact' && <p className="mb-6 text-lg font-medium">{copy.contact_addr}</p>}
    {page === 'about' && <>
      <p className="mb-8 max-w-3xl leading-relaxed text-[var(--text-secondary)]">{copy.intro_body}</p>
      <div className="grid gap-5 sm:grid-cols-3">{[[copy.about_mission_t, copy.about_mission_b], [copy.about_vision_t, copy.about_vision_b], [copy.about_values_t, copy.about_values_b]].map(([title, body]) => <section key={title} className="card p-6"><h2 className="mb-3 font-semibold">{title}</h2><p className="text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p></section>)}</div>
    </>}
    {page === 'services' && <ServiceCards copy={copy} />}
    {page === 'activities' && <><p className="mb-6 text-sm text-[var(--text-secondary)]">{copy.sample_note}</p><ActivityCards locale={locale} /></>}
    {page === 'login' && <><p className="mb-6 text-[var(--text-secondary)]">{copy.login_sub}</p><StaffPortal locale={locale} /></>}
    {['volunteer', 'donate', 'contact'].includes(page) && <div className="max-w-2xl">
      <p className="mb-6 leading-relaxed text-[var(--text-secondary)]">{introductions[page]}</p>
      <section className="card border-s-4 border-s-[var(--ima-red)] p-6">
        <h2 className="mb-2 font-semibold">{copy.unavailable}</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{pendingMessages[page]}</p>
      </section>
      <ButtonLink href={`/${locale}`} variant="secondary" className="mt-6">{copy.nav_home}</ButtonLink>
    </div>}
  </div>;
}
