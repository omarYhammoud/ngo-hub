'use server';

import { cookies } from 'next/headers';
import { currentUser } from '@/features/auth/actions';

export async function portalRequest(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: unknown, locale = 'en'): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (!/^(?:(missions|staff|vehicles)\/(?:[0-9]+\/)?(?:historical\/|start\/|complete\/|cancel\/|correct\/|summary\/|activity\/|activity-history\/|crew_options\/)?(?:\?[^#]*)?|staff\/[0-9]+\/reset_password\/)$/.test(path) || !['GET', 'POST', 'PATCH'].includes(method)) return { ok: false, status: 400, data: { detail: 'invalid_request' } };
  const session = await currentUser();
  if (!session.user) return { ok: false, status: session.error ? 503 : 401, data: { detail: session.error ? 'unavailable' : 'session_expired' } };
  try {
    const access = (await cookies()).get('ngo_access')?.value;
    const response = await fetch(`${process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'}/api/${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'Accept-Language': locale === 'ar' ? 'ar' : 'en' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({ detail: 'unavailable' }));
    return { ok: response.ok, status: response.status, data };
  } catch { return { ok: false, status: 503, data: { detail: 'unavailable' } }; }
}
