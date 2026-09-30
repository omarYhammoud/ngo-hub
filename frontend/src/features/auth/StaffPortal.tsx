'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { currentUser, signIn } from './actions';
import type { Locale } from '@/i18n/dictionaries';

const labels = {
 en: {username:'Username',password:'Password',login:'Sign in',busy:'Please wait…',invalid:'Incorrect username or password.',unavailable:'Unable to reach the service. Please try again.',throttled:'Too many attempts. Please wait a minute and try again.',subtitle:'Staff operations portal',note:'Accounts are created by your Super Admin. Contact them if you need access or a password reset.'},
 ar: {username:'اسم المستخدم',password:'كلمة المرور',login:'تسجيل الدخول',busy:'يرجى الانتظار…',invalid:'اسم المستخدم أو كلمة المرور غير صحيحة.',unavailable:'تعذر الاتصال بالخدمة. يرجى المحاولة مجدداً.',throttled:'محاولات كثيرة. يرجى الانتظار دقيقة ثم المحاولة مجدداً.',subtitle:'بوابة عمليات الموظفين',note:'ينشئ المسؤول العام الحسابات. تواصل معه للحصول على صلاحية الدخول أو إعادة تعيين كلمة المرور.'},
};
export default function StaffPortal({locale}: {locale:Locale}) {
 const copy=labels[locale];const router=useRouter();const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(() => {
   let active = true;
   const timer = setTimeout(() => {
     if (!active) return;
     active = false;
     setError(copy.unavailable);
     setBusy(false);
   }, 35000);
   currentUser().then(result => {
     if (!active) return;
     if (result.user) router.replace(`/${locale}/portal`);
     else {
       if (result.error) setError(copy.unavailable);
       setBusy(false);
     }
   }).catch(() => {
     if (active) { setError(copy.unavailable); setBusy(false); }
   }).finally(() => clearTimeout(timer));
   return () => { active = false; clearTimeout(timer); };
 }, [locale, router, copy.unavailable]);
 async function submit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault();
   const data = new FormData(event.currentTarget);
   setBusy(true); setError('');
   try {
     const result = await signIn(String(data.get('username') || ''), String(data.get('password') || ''));
     if (result === 'ok') router.replace(`/${locale}/portal`);
     else { setError(copy[result]); setBusy(false); }
   } catch { setError(copy.unavailable); setBusy(false); }
 }
 return <div className="mx-auto max-w-md px-5 py-14"><div className="mb-8 text-center"><Image src="/ima-logo.png" alt="IMA" width={64} height={64} className="mx-auto mb-4"/><h1 className="text-xl font-bold">Islamic Medical Association</h1><p dir="rtl" className="text-lg font-bold">الجمعية الطبية الإسلامية</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.subtitle}</p></div><section className="portal-card"><form method="post" onSubmit={submit} aria-busy={busy}>{error&&<p role="alert" className="portal-error">{error}</p>}<label className="portal-field"><span>{copy.username}</span><input name="username" autoComplete="username" required maxLength={150} disabled={busy}/></label><label className="portal-field"><span>{copy.password}</span><input type="password" name="password" autoComplete="current-password" required maxLength={1024} disabled={busy}/></label><button className="button button-primary w-full" disabled={busy}>{busy?copy.busy:copy.login}</button></form><a className="mt-5 block text-center text-xs text-[var(--text-secondary)]" href={`/${locale==='en'?'ar':'en'}/login`}>{locale==='en'?'العربية':'English'}</a></section><p className="text-center text-xs leading-relaxed text-[var(--text-secondary)]">{copy.note}</p></div>;
}
