import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, locales } from '@/i18n/dictionaries';
import PublicNavbar, { type NavigationCopy } from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
export const dynamicParams = false;
export function generateStaticParams() { return locales.map(lang => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = getDictionary(lang);
  return { title: { default: copy.brand_org, template: `%s | ${copy.brand_org}` }, description: copy.hero_sub };
}
export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = getDictionary(lang);
  const { brand_org, brand_product, nav_home, nav_about, nav_services, nav_activities, nav_volunteer, nav_contact, nav_login, nav_donate, lang_switch, navigation, menu, close_menu } = copy;
  const navigationCopy: NavigationCopy = { brand_org, brand_product, nav_home, nav_about, nav_services, nav_activities, nav_volunteer, nav_contact, nav_login, nav_donate, lang_switch, navigation, menu, close_menu };
  return <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-scroll-behavior="smooth" className={`${inter.variable} ${cairo.variable}`}>
    <body>
      <a href="#main-content" className="skip-link">{copy.skip}</a>
      <PublicNavbar locale={lang} copy={navigationCopy} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <PublicFooter copy={copy} locale={lang} />
    </body>
  </html>;
}
