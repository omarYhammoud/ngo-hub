import type { Dictionary } from '@/i18n/dictionaries';

export default function AboutSection({ copy }: { copy: Dictionary }) {
  return <section className="page-container py-16" aria-labelledby="about-heading">
    <h2 id="about-heading" className="mb-3 text-xl font-bold">{copy.intro_title}</h2>
    <p className="max-w-3xl leading-relaxed text-[var(--text-secondary)]">{copy.intro_body}</p>
  </section>;
}
