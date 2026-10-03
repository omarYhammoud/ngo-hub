import type { Locale } from '@/i18n/dictionaries';
export default function LocationMap({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  return <section className="card overflow-hidden" aria-label={ar ? 'موقع المركز' : 'Centre location'}>
    <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6233.403939243966!2d35.3871513!3d33.5668299!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151ef01cdabef75f%3A0x7b7c657a8951d3f2!2z2YXYsdmD2LIg2KfZhNis2YXYudmK2Kkg2KfZhNi32KjZitipINin2YTYp9iz2YTYp9mF2YrYqSAt2LXZitiv2Kc!5e1!3m2!1sar!2slb!4v1790549577070!5m2!1sar!2slb" title={ar ? 'مركز الجمعية الطبية الإسلامية — صيدا' : 'Islamic Medical Association centre — Saida'} width="600" height="380" className="block w-full border-0" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    <div className="p-5">
      <h2 className="mb-2 text-xl font-bold">{ar ? 'زوروا مركزنا' : 'Visit our centre'}</h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{ar ? 'القياعة، صيدا، لبنان' : 'Al-Qayaa, Saida, Lebanon'}</p>
      <a href="https://maps.app.goo.gl/Lx3wGCQwzqsWYCwR7" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--ima-red-dark)] hover:underline">{ar ? 'الاتجاهات على خرائط Google' : 'Get directions on Google Maps'} ↗</a>
    </div>
  </section>;
}
