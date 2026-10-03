'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';

import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

import ButtonLink from '@/components/ui/ButtonLink';
import Icon from '@/components/ui/Icon';

import BrandLockup from './BrandLockup';


export type NavigationCopy = Pick<
  Dictionary,
  | 'brand_org'
  | 'brand_product'
  | 'nav_home'
  | 'nav_about'
  | 'nav_services'
  | 'nav_activities'
  | 'nav_volunteer'
  | 'nav_contact'
  | 'nav_login'
  | 'nav_donate'
  | 'lang_switch'
  | 'navigation'
  | 'menu'
  | 'close_menu'
>;


export default function PublicNavbar({
  locale,
  copy,
}: {
  locale: Locale;
  copy: NavigationCopy;
}) {
  const pathname = usePathname();

  const [openPath, setOpenPath] =
    useState<string | null>(null);

  const open = openPath === pathname;

  const toggle =
    useRef<HTMLButtonElement>(null);

  const isArabic = locale === 'ar';

  const otherLocale: Locale =
    locale === 'en'
      ? 'ar'
      : 'en';

  const languageHref =
    pathname.replace(
      /^\/(en|ar)(?=\/|$)/,
      `/${otherLocale}`,
    );


  const items = [
    ['', copy.nav_home],
    ['about', copy.nav_about],
    ['services', copy.nav_services],
    ['activities', copy.nav_activities],
    ['volunteer', copy.nav_volunteer],
    ['contact', copy.nav_contact],
  ] as const;


  const links = items.map(
    ([slug, label]) => {
      const href =
        `/${locale}${
          slug
            ? `/${slug}`
            : ''
        }`;

      return (
        <Link
          key={slug}
          href={href}
          className="nav-link"
          aria-current={
            pathname === href
              ? 'page'
              : undefined
          }
          onClick={() =>
            setOpenPath(null)
          }
        >
          {label}
        </Link>
      );
    },
  );


  /*
   * Full-page navigation is intentional here.
   * It allows the locale layout to refresh
   * <html lang> and <html dir>.
   */
  const languageLink = (
    <a
      href={languageHref}
      hrefLang={otherLocale}
      lang={otherLocale}
      dir={
        otherLocale === 'ar'
          ? 'rtl'
          : 'ltr'
      }
      className="nav-link inline-flex items-center gap-1.5"
    >
      <Icon
        name="globe"
        className="size-4 shrink-0"
      />

      <span>
        {copy.lang_switch}
      </span>
    </a>
  );


  return (
    <header
      dir={isArabic ? 'rtl' : 'ltr'}
      className="sticky top-0 z-40 border-b border-[var(--border)] bg-white"
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          open
        ) {
          setOpenPath(null);
          toggle.current?.focus();
        }
      }}
    >
      <div className="page-container flex min-h-16 items-center justify-between gap-3 py-2">

        {/* Brand */}
        <Link
          href={`/${locale}`}
          className="min-w-0 shrink"
          onClick={() =>
            setOpenPath(null)
          }
        >
          <BrandLockup
            copy={copy}
            locale={locale}
          />
        </Link>


        {/* Desktop navigation */}
        <nav
          aria-label={copy.navigation}
          className="hidden items-center xl:flex"
        >
          {links}
        </nav>


        {/* Desktop actions */}
        <div className="flex shrink-0 items-center gap-2">

          <span className="hidden sm:block">
            {languageLink}
          </span>


          <ButtonLink
            href={`/${locale}/login`}
            variant="secondary"
            className="hidden md:inline-flex"
          >
            <Icon
              name="user"
              className="size-4 shrink-0"
            />

            <span>
              {copy.nav_login}
            </span>
          </ButtonLink>


          <ButtonLink
            href={`/${locale}/donate`}
            className="hidden sm:inline-flex"
          >
            <Icon
              name="heart"
              className="size-4 shrink-0"
            />

            <span>
              {copy.nav_donate}
            </span>
          </ButtonLink>


          <button
            ref={toggle}
            type="button"
            className="rounded-lg p-2.5 xl:hidden"
            aria-label={
              open
                ? copy.close_menu
                : copy.menu
            }
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() =>
              setOpenPath(
                open
                  ? null
                  : pathname,
              )
            }
          >
            <Icon
              name={
                open
                  ? 'close'
                  : 'menu'
              }
            />
          </button>

        </div>
      </div>


      {/* Mobile navigation */}
      <nav
        id="mobile-navigation"
        aria-label={copy.navigation}
        hidden={!open}
        dir={
          isArabic
            ? 'rtl'
            : 'ltr'
        }
        className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-[var(--border)] px-4 py-3 xl:hidden"
      >
        <div className="flex flex-col gap-1">

          {links}

          {languageLink}

          <Link
            className="nav-link"
            href={`/${locale}/login`}
            onClick={() =>
              setOpenPath(null)
            }
          >
            {copy.nav_login}
          </Link>

          <ButtonLink
            href={`/${locale}/donate`}
            onClick={() =>
              setOpenPath(null)
            }
          >
            {copy.nav_donate}
          </ButtonLink>

        </div>
      </nav>
    </header>
  );
}