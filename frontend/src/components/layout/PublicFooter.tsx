import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import BrandLockup from './BrandLockup';

export default function PublicFooter({ copy, locale }: { copy: Dictionary; locale: Locale }) {
  return <footer className="mt-16 bg-[var(--foreground)] text-white">
    <div className="page-container grid gap-8 py-12 sm:grid-cols-3">
      <div><Link href={`/${locale}`}><BrandLockup copy={copy} /></Link><p className="mt-3 text-sm text-white/70">{copy.footer_tagline}</p></div>
      <nav aria-label={copy.navigation}>
        <h2 className="mb-3 text-sm font-medium">{copy.nav_activities}</h2>
        <div className="flex flex-col gap-2 text-sm text-white/70">{[['about', copy.nav_about], ['services', copy.nav_services], ['volunteer', copy.nav_volunteer], ['donate', copy.nav_donate]].map(([route, label]) => <Link className="w-fit hover:text-white hover:underline" key={route} href={`/${locale}/${route}`}>{label}</Link>)}</div>
      </nav>
      <div><h2 className="mb-3 text-sm font-medium">{copy.contact_info_t}</h2><p className="mb-2 text-sm text-white/90">{copy.contact_addr}</p><p className="text-sm leading-relaxed text-white/70">{copy.contact_pending}</p><Link className="mt-3 inline-block text-sm underline underline-offset-4" href={`/${locale}/contact`}>{copy.nav_contact}</Link></div>
    </div>
    <div className="border-t border-white/15 px-4 py-4 text-center text-xs text-white/65">© 2026 {copy.brand_org}. {copy.footer_rights}</div>
  </footer>;
}
