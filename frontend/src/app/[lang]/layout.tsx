import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, locales } from '@/i18n/dictionaries';
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
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <html data-scroll-behavior="smooth" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`${inter.variable} ${cairo.variable}`}><body>{children}</body></html>;
}
