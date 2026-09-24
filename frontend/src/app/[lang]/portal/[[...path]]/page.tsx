import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/dictionaries';
import Portal from '@/features/portal/Portal';
export const dynamic = 'force-dynamic';
export default async function Page({params}: {params: Promise<{lang: string; path?: string[]}>}) {
  const {lang, path = []} = await params;
  if (!isLocale(lang)) notFound();
  return <Suspense><Portal locale={lang} path={path.join('/')}/></Suspense>;
}
