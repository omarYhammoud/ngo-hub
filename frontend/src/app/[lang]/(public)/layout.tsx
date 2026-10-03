import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/i18n/dictionaries';
import PublicNavbar, { type NavigationCopy } from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = getDictionary(lang);
  const { brand_org, brand_product, nav_home, nav_about, nav_services, nav_activities, nav_volunteer, nav_contact, nav_login, nav_donate, lang_switch, navigation, menu, close_menu } = copy;
  const navigationCopy: NavigationCopy = { brand_org, brand_product, nav_home, nav_about, nav_services, nav_activities, nav_volunteer, nav_contact, nav_login, nav_donate, lang_switch, navigation, menu, close_menu };
  return <><a href="#main-content" className="skip-link">{copy.skip}</a><PublicNavbar locale={lang} copy={navigationCopy}/><main id="main-content" tabIndex={-1}>{children}</main><PublicFooter copy={copy} locale={lang}/></>;
}
