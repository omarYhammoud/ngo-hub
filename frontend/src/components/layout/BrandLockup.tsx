import Image from 'next/image';

import type {
  Dictionary,
  Locale,
} from '@/i18n/dictionaries';

type BrandLockupProps = {
  copy: Pick<
    Dictionary,
    'brand_org' | 'brand_product'
  >;
  locale: Locale;
};

export default function BrandLockup({
  copy,
  locale,
}: BrandLockupProps) {
  const isArabic = locale === 'ar';

  return (
    <span
      dir={isArabic ? 'rtl' : 'ltr'}
      className="flex min-w-0 items-center gap-2.5"
    >
      <Image
        src="/ima-logo.png"
        alt=""
        width={40}
        height={40}
        className="shrink-0 object-contain"
      />

      <span className="min-w-0 text-start leading-tight">
        <span className="block text-xs font-bold sm:text-sm">
          {copy.brand_org}
        </span>

        <span className="mt-0.5 block text-[10px] opacity-65 sm:text-[11px]">
          {copy.brand_product}
        </span>
      </span>
    </span>
  );
}