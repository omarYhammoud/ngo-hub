import type { Dictionary } from '@/i18n/dictionaries';
import Icon, { type IconName } from '@/components/ui/Icon';

const icons: IconName[] = ['mission', 'lending', 'user', 'activity'];
export function ServiceCards({ copy }: { copy: Dictionary }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{copy.services_list_t.map((title, index) => <article key={title} className="card p-5">
    <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[var(--ima-green-light)] text-[var(--ima-green-dark)]"><Icon name={icons[index]} /></div>
    <h3 className="mb-2 text-sm font-semibold">{title}</h3>
    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{copy.services_list_b[index]}</p>
  </article>)}</div>;
}
export default function ServicesSection({ copy }: { copy: Dictionary }) {
  return <section className="page-container py-16" aria-labelledby="services-heading">
    <h2 id="services-heading" className="mb-6 text-xl font-bold">{copy.services_title}</h2>
    <ServiceCards copy={copy} />
  </section>;
}
