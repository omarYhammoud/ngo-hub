import Link from 'next/link';
import type { ComponentProps } from 'react';

export default function ButtonLink({ variant = 'primary', className = '', ...props }: ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' | 'positive' }) {
  return <Link className={`button button-${variant} ${className}`} {...props} />;
}
