import LocationMap from '@/components/shared/LocationMap';
import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

import { ServiceCards } from '@/components/shared/ServicesSection';
import { ActivityCards } from '@/components/shared/ActivitiesSection';
import ButtonLink from '@/components/ui/ButtonLink';
import StaffPortal from '@/features/auth/StaffPortal';
import ContactForm from '@/features/public/ContactForm';
import VolunteerForm from '@/features/public/VolunteerForm';


export const publicPages = [
  'about',
  'services',
  'activities',
  'volunteer',
  'donate',
  'contact',
  'login',
] as const;


export type PublicPage =
  (typeof publicPages)[number];


export function isPublicPage(
  value: string,
): value is PublicPage {
  return publicPages.some(
    (page) => page === value,
  );
}


export function pageTitle(
  page: PublicPage,
  copy: Dictionary,
) {
  return {
    about: copy.about_intro_t,
    services: copy.services_title,
    activities: copy.activities_title,
    volunteer: copy.volunteer_title,
    donate: copy.donate_title,
    contact: copy.contact_title,
    login: copy.login_title,
  }[page];
}


export default function InformationPage({
  page,
  copy,
  locale,
}: {
  page: PublicPage;
  copy: Dictionary;
  locale: Locale;
}) {
  if (page === 'login') {
    return (
      <StaffPortal
        locale={locale}
      />
    );
  }


  const isArabic =
    locale === 'ar';


  const introductions:
    Partial<
      Record<
        PublicPage,
        string
      >
    > = {
      volunteer:
        copy.volunteer_cta_body,

      donate:
        copy.donate_cta_body,

      contact:
        copy.footer_tagline,

      login:
        copy.login_sub,
    };


  const pendingMessages:
    Partial<
      Record<
        PublicPage,
        string
      >
    > = {
      volunteer:
        copy.volunteer_pending,

      donate:
        copy.donate_pending,

      contact:
        copy.contact_pending,

      login:
        copy.login_pending,
    };


  return (
    <div
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
      className="page-container min-h-[55vh] py-16 text-start"
    >

      <h1 className="mb-8 text-start text-2xl font-bold sm:text-3xl">
        {pageTitle(
          page,
          copy,
        )}
      </h1>


      {page === 'contact' && (
        <p className="mb-6 text-start text-lg font-medium">
          {copy.contact_addr}
        </p>
      )}


      {/* =========================
          About
          ========================= */}

      {page === 'about' && (
        <>
          <p className="mb-8 max-w-3xl text-start leading-relaxed text-[var(--text-secondary)]">
            {copy.intro_body}
          </p>

          <div
            dir={
              isArabic
                ? 'rtl'
                : 'ltr'
            }
            className="grid gap-5 sm:grid-cols-3"
          >
            {[
              [
                copy.about_mission_t,
                copy.about_mission_b,
              ],

              [
                copy.about_vision_t,
                copy.about_vision_b,
              ],

              [
                copy.about_values_t,
                copy.about_values_b,
              ],
            ].map(
              ([
                title,
                body,
              ]) => (
                <section
                  key={title}
                  className="card p-6 text-start"
                >
                  <h2 className="mb-3 text-start font-semibold">
                    {title}
                  </h2>

                  <p className="text-start text-sm leading-relaxed text-[var(--text-secondary)]">
                    {body}
                  </p>
                </section>
              ),
            )}
          </div>
        </>
      )}


      {/* =========================
          Services
          ========================= */}

      {page === 'services' && (
        <ServiceCards
          copy={copy}
          locale={locale}
        />
      )}


      {/* =========================
          Activities
          ========================= */}

      {page === 'activities' && (
        <>
          <p className="mb-6 text-start text-sm text-[var(--text-secondary)]">
            {isArabic ? 'من حساب الجمعية الرسمي على إنستغرام.' : 'From the association’s official Instagram.'}
          </p>

          <ActivityCards
            locale={locale}
          />
        </>
      )}


      {/* =========================
          Contact
          ========================= */}

      {page === 'contact' && (
        <div className="grid gap-8 text-start lg:grid-cols-2">
          <div>
          <p className="mb-6 text-start leading-relaxed text-[var(--text-secondary)]">
            {introductions[page]}
          </p>

          <ContactForm
            copy={copy}
            locale={locale}
          />
          </div>
          <LocationMap locale={locale} />
        </div>
      )}


      {/* =========================
          Volunteer
          ========================= */}

      {page === 'volunteer' && (
        <div className="max-w-2xl text-start">
          <p className="mb-6 text-start leading-relaxed text-[var(--text-secondary)]">
            {introductions[page]}
          </p>

          <VolunteerForm
            copy={copy}
            locale={locale}
          />
        </div>
      )}


      {/* =========================
          Donate
          ========================= */}

      {page === 'donate' && (
        <div className="max-w-2xl text-start">

          <p className="mb-6 text-start leading-relaxed text-[var(--text-secondary)]">
            {introductions[page]}
          </p>

          <section className="card border-s-4 border-s-[var(--ima-red)] p-6 text-start">

            <h2 className="mb-2 text-start font-semibold">
              {copy.unavailable}
            </h2>

            <p className="text-start text-sm leading-relaxed text-[var(--text-secondary)]">
              {
                pendingMessages[
                  page
                ]
              }
            </p>
          </section>


          <ButtonLink
            href={`/${locale}`}
            variant="secondary"
            className="mt-6"
          >
            {copy.nav_home}
          </ButtonLink>

        </div>
      )}

    </div>
  );
}