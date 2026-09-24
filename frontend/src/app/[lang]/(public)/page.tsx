import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/i18n/dictionaries';
import HeroSection from '@/components/shared/HeroSection';
import AboutSection from '@/components/shared/AboutSection';
import ImpactSection from '@/components/shared/ImpactSection';
import ServicesSection from '@/components/shared/ServicesSection';
import ActivitiesSection from '@/components/shared/ActivitiesSection';
import SupportSection from '@/components/shared/SupportSection';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = getDictionary(lang);
  return <>
    <HeroSection copy={copy} locale={lang} />
    <AboutSection copy={copy} />
    <ImpactSection copy={copy} locale={lang} />
    <ServicesSection copy={copy} />
    <ActivitiesSection copy={copy} locale={lang} />
    <SupportSection copy={copy} locale={lang} />
  </>;
}
