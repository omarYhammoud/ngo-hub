'use server';

import { cookies } from 'next/headers';

const origin = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';
const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export type StaffUser = { id: number; username: string; first_name: string; last_name: string; email: string; role: 'ADMIN' | 'PARAMEDIC' };

async function api(path: string, body?: object, access?: string) {
  return fetch(`${origin}/api/auth/${path}/`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function save(tokens: { access: string; refresh: string }) {
  const jar = await cookies();
  jar.set('ngo_access', tokens.access, { ...options, maxAge: 15 * 60 });
  jar.set('ngo_refresh', tokens.refresh, { ...options, maxAge: 24 * 60 * 60 });
}
async function clear() {
  const jar = await cookies();
  jar.delete('ngo_access');
  jar.delete('ngo_refresh');
}

export async function signIn(username: string, password: string): Promise<'ok' | 'invalid' | 'unavailable' | 'throttled'> {
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || username.length > 150 || password.length > 1024) return 'invalid';
  try {
    const response = await api('login', { username: username.trim(), password });
    if (response.status === 429) return 'throttled';
    if (!response.ok) return response.status < 500 ? 'invalid' : 'unavailable';
    await save(await response.json());
    return 'ok';
  } catch { return 'unavailable'; }
}

export async function currentUser(): Promise<{ user?: StaffUser; error?: 'unavailable' }> {
  const jar = await cookies();
  let access = jar.get('ngo_access')?.value;
  const refresh = jar.get('ngo_refresh')?.value;
  try {
    let response = access ? await api('me', undefined, access) : null;
    if ((!response || response.status === 401) && refresh) {
      const renewed = await api('refresh', { refresh });
      if (renewed.status === 401 || renewed.status === 400) { await clear(); return {}; }
      if (!renewed.ok) return { error: 'unavailable' };
      const tokens = await renewed.json();
      await save(tokens);
      access = tokens.access;
      response = await api('me', undefined, access);
    }
    if (!response || response.status === 401) { await clear(); return {}; }
    if (!response.ok) return { error: 'unavailable' };
    return { user: await response.json() };
  } catch { return { error: 'unavailable' }; }
}

export async function signOut(): Promise<boolean> {
  const refresh = (await cookies()).get('ngo_refresh')?.value;
  try {
    if (refresh) {
      const response = await api('logout', { refresh });
      if (!response.ok && response.status !== 401 && response.status !== 400) return false;
    }
    await clear();
    return true;
  } catch { return false; }
}
