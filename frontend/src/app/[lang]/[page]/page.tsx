import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/i18n/dictionaries';
import InformationPage, { isPublicPage, pageTitle, publicPages } from '@/features/public/InformationPage';

type Props = { params: Promise<{ lang: string; page: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return publicPages.map(page => ({ page })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, page } = await params;
  if (!isLocale(lang) || !isPublicPage(page)) notFound();
  return { title: pageTitle(page, getDictionary(lang)) };
}
export default async function Page({ params }: Props) {
  const { lang, page } = await params;
  if (!isLocale(lang) || !isPublicPage(page)) notFound();
  return <InformationPage page={page} locale={lang} copy={getDictionary(lang)} />;
}
