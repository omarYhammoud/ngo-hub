/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function harness(session = { user: { id: 1 } }, response = { status: 200, body: {} }) {
  const calls = [];
  let sessionCalls = 0;
  const source = ts.transpileModule(fs.readFileSync('src/features/auth/portal-actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const mockedRequire = name => {
    if (name === 'next/headers') return { cookies: async () => ({ get: () => ({ value: 'server-token' }) }) };
    assert.equal(name, '@/features/auth/actions');
    return { currentUser: async () => { sessionCalls++; return session; } };
  };
  const fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status });
  };
  new Function('require', 'exports', 'fetch', source)(mockedRequire, exports, fetch);
  return { ...exports, calls, sessionCalls: () => sessionCalls };
}

test('portal bridge rejects external URLs, traversal and unsupported methods before accessing a session', async () => {
  const app = harness();
  for (const path of ['https://example.com/', '../auth/me/', 'missions/../staff/', 'missions/%2e%2e/staff/', 'auth/login/']) {
    assert.equal((await app.portalRequest(path)).status, 400);
  }
  assert.equal((await app.portalRequest('missions/1/', 'DELETE')).status, 400);
  assert.equal(app.sessionCalls(), 0);
  assert.equal(app.calls.length, 0);
});

test('portal bridge distinguishes expired sessions from temporary authentication outages', async () => {
  for (const [session, status] of [[{}, 401], [{ error: 'unavailable' }, 503]]) {
    const app = harness(session);
    assert.equal((await app.portalRequest('missions/')).status, status);
    assert.equal(app.calls.length, 0);
  }
});

test('portal bridge sends server-only authorization and preserves backend permission errors', async () => {
  const app = harness(undefined, { status: 403, body: { detail: 'planned_assignment_forbidden' } });
  const result = await app.portalRequest('missions/7/', 'PATCH', { planned_crew: [] }, 'ar');
  assert.deepEqual(result, { ok: false, status: 403, data: { detail: 'planned_assignment_forbidden' } });
  assert.equal(app.calls[0].headers.Authorization, 'Bearer server-token');
  assert.equal(app.calls[0].headers['Accept-Language'], 'ar');
  assert.equal(app.calls[0].cache, 'no-store');
  assert.equal(app.calls[0].body, '{"planned_crew":[]}');
  assert.ok(!JSON.stringify(result).includes('server-token'));
});

test('portal bridge supports filtered lists and reports backend connection failure', async () => {
  const app = harness(undefined, new Error('offline'));
  assert.equal((await app.portalRequest('missions/?search=Saida&status=COMPLETED')).status, 503);
  assert.ok(app.calls[0].url.endsWith('/api/missions/?search=Saida&status=COMPLETED'));
});

test('portal bridge supports explicit staff password reset without returning submitted secrets', async () => {
  const app = harness(undefined, { status: 200, body: { detail: 'password_reset_success' } });
  const payload = { new_password: 'Example-Only-Password-583!', confirm_password: 'Example-Only-Password-583!' };
  const result = await app.portalRequest('staff/2/reset_password/', 'POST', payload, 'ar');
  assert.equal(result.ok, true);
  assert.equal(app.calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(app.calls[0].body), payload);
  assert.deepEqual(result.data, { detail: 'password_reset_success' });
});
