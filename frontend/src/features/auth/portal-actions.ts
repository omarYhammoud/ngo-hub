'use server';

import { cookies } from 'next/headers';

import { currentUser } from '@/features/auth/actions';

export async function portalRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown,
  locale = 'en',
): Promise<{
  ok: boolean;
  status: number;
  data: unknown;
}> {
  const allowedPath =
    /^(?:(missions|staff|vehicles)\/?(?:[0-9]+\/?)?(?:historical\/?|start\/?|complete\/?|cancel\/?|correct\/?|summary\/?|report\/?|report-export\/?|report-print\/?|activity\/?|activity-history\/?|activity-export\/?|activity-print\/?|crew_options\/?)?(?:\?[^#]*)?|staff\/[0-9]+\/reset_password\/|(?:equipment\/(?:[0-9]+\/|types\/|summary\/)?|lending\/(?:[0-9]+\/(?:return\/)?)?)(?:\?[^#]*)?|submissions\/staff\/contact\/(?:[0-9]+\/(?:status\/)?)?(?:\?[^#]*)?|submissions\/staff\/volunteer\/(?:[0-9]+\/(?:status\/)?)?(?:\?[^#]*)?)$/;

  const issueRouteAllowed =
    method === 'GET'
      ? /^vehicle-issues\/(?:[0-9]+\/|summary\/)?(?:\?[^#]*)?$/.test(
          path,
        )
      : method === 'POST'
        ? /^vehicle-issues\/(?:[0-9]+\/(?:maintenance|resolve)\/?)?$/.test(
            path,
          )
        : method === 'PATCH' &&
          /^vehicle-issues\/[0-9]+\/$/.test(
            path,
          );

  const aiRouteAllowed =
    method === 'POST' &&
    path === 'ai/analyze/';

  if (
    (
      !allowedPath.test(path) &&
      !issueRouteAllowed &&
      !aiRouteAllowed
    ) ||
    ![
      'GET',
      'POST',
      'PATCH',
    ].includes(method)
  ) {
    return {
      ok: false,
      status: 400,
      data: {
        detail:
          'invalid_request',
      },
    };
  }

  const session =
    await currentUser();

  if (!session.user) {
    return {
      ok: false,
      status:
        session.error
          ? 503
          : 401,
      data: {
        detail:
          session.error
            ? 'unavailable'
            : 'session_expired',
      },
    };
  }

  try {
    const access =
      (
        await cookies()
      ).get(
        'ngo_access',
      )?.value;

    const apiBase =
      process.env
        .DJANGO_API_URL ||
      'http://127.0.0.1:8000';

    const response =
      await fetch(
        `${apiBase}/api/${path}`,
        {
          method,

          cache:
            'no-store',

          /*
           * Give Django/Groq enough time to complete AI analysis.
           *
           * Groq itself will be limited to 25 seconds.
           * This forwarding layer allows 30 seconds so Django
           * still has time to return a controlled error.
           */
          signal:
            AbortSignal.timeout(
              30000,
            ),

          headers: {
            Authorization:
              `Bearer ${access}`,

            'Content-Type':
              'application/json',

            'Accept-Language':
              locale ===
              'ar'
                ? 'ar'
                : 'en',
          },

          ...(body ===
          undefined
            ? {}
            : {
                body:
                  JSON.stringify(
                    body,
                  ),
              }),
        },
      );

    const data =
      await response
        .json()
        .catch(() => ({
          detail:
            'unavailable',
        }));

    return {
      ok:
        response.ok,
      status:
        response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      data: {
        detail:
          'unavailable',
      },
    };
  }
}