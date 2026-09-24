import type { ReactNode } from 'react';
export function Field({label,children}: {label:string; children: ReactNode}) { return <label className="portal-field"><span>{label}</span>{children}</label>; }
export function Notice({text}: {text:string}) { return <p className="portal-notice">{text}</p>; }
