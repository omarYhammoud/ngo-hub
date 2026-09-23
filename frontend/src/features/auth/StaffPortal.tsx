'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { currentUser, signIn, signOut, type StaffUser } from './actions';
import type { Locale } from '@/i18n/dictionaries';

const labels = {
  en: { username: 'Username', password: 'Password', login: 'Sign in', busy: 'Please wait…', invalid: 'Incorrect username or password.', unavailable: 'Unable to reach the service. Please try again.', throttled: 'Too many attempts. Please wait a minute and try again.', welcome: 'Staff portal', logout: 'Sign out', admin: 'Administrator', paramedic: 'Paramedic', note: 'You are signed in. Operational modules are still under development.', retry: 'Try again' },
  ar: { username: 'اسم المستخدم', password: 'كلمة المرور', login: 'تسجيل الدخول', busy: 'يرجى الانتظار…', invalid: 'اسم المستخدم أو كلمة المرور غير صحيحة.', unavailable: 'تعذر الاتصال بالخدمة. يرجى المحاولة مجدداً.', throttled: 'محاولات كثيرة. يرجى الانتظار دقيقة ثم المحاولة مجدداً.', welcome: 'بوابة الموظفين', logout: 'تسجيل الخروج', admin: 'مسؤول', paramedic: 'مسعف', note: 'تم تسجيل الدخول. الوحدات التشغيلية لا تزال قيد التطوير.', retry: 'إعادة المحاولة' },
};

export default function StaffPortal({ locale }: { locale: Locale }) {
  const copy = labels[locale];
  const [user, setUser] = useState<StaffUser>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setBusy(true);
    const result = await currentUser();
    setUser(result.user);
    setError(result.error ? copy.unavailable : '');
    setBusy(false);
  }
  useEffect(() => {
    let active = true;
    async function check() {
      const result = await currentUser();
      if (active) { setUser(result.user); setError(result.error ? copy.unavailable : ''); setBusy(false); }
    }
    void check();
    const timer = window.setInterval(check, 10 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [copy.unavailable]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError('');
    const result = await signIn(String(data.get('username') || ''), String(data.get('password') || ''));
    form.reset();
    if (result === 'ok') await load();
    else { setError(copy[result]); setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    if (await signOut()) { setUser(undefined); setError(''); }
    else setError(copy.unavailable);
    setBusy(false);
  }
  return <section className="card max-w-md p-6" aria-busy={busy}>
    {error && <p role="alert" className="mb-4 text-[var(--ima-red)]">{error}</p>}
    {busy ? <p role="status">{copy.busy}</p> : user ? <>
      <h2 className="mb-3 text-xl font-semibold">{copy.welcome}</h2>
      <p>{user.first_name || user.username} {user.last_name}</p>
      <p className="mt-2">{user.role === 'ADMIN' ? copy.admin : copy.paramedic}</p>
      <p className="my-5 text-[var(--text-secondary)]">{copy.note}</p>
      <button onClick={logout} className="rounded-lg bg-[var(--ima-red)] px-5 py-3 text-white">{copy.logout}</button>
    </> : <form onSubmit={submit} className="space-y-5">
      <label className="block">{copy.username}<input name="username" required maxLength={150} autoComplete="username" className="mt-2 block w-full rounded-lg border p-3" /></label>
      <label className="block">{copy.password}<input name="password" type="password" required maxLength={1024} autoComplete="current-password" className="mt-2 block w-full rounded-lg border p-3" /></label>
      <button type="submit" className="w-full rounded-lg bg-[var(--ima-red)] px-5 py-3 text-white">{copy.login}</button>
    </form>}
    {error && !busy && <button onClick={load} className="mt-4 underline">{copy.retry}</button>}
  </section>;
}
