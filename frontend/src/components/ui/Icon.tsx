import type { SVGProps } from 'react';

const paths = {
  mission: <><path d="M12 21c-4.5-3.2-8-6.7-8-11a8 8 0 0 1 16 0c0 4.3-3.5 7.8-8 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  lending: <><path d="M9 3v4m6-4v4" /><rect x="3.5" y="5.5" width="17" height="15" rx="2" /><path d="m8 13 2.5 2.5L16 10" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  activity: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
};
export type IconName = keyof typeof paths;
export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
