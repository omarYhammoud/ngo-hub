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

test('submissions bridge allows staff routes and preserves permission denials', async () => {
  for (const kind of ['contact', 'volunteer']) {
    for (const suffix of ['', '?status=NEW', '1/', '1/status/']) {
      const path = `submissions/staff/${kind}/${suffix}`;
      const method = suffix.endsWith('status/') ? 'PATCH' : 'GET';
      const app = harness();
      assert.equal((await app.portalRequest(path, method, undefined, 'ar')).status, 200);
      assert.ok(app.calls[0].url.endsWith(`/api/${path}`));
      assert.equal(app.calls[0].headers['Accept-Language'], 'ar');
      const denied = harness(undefined, { status: 403, body: { detail: 'denied' } });
      assert.equal((await denied.portalRequest(path, method)).status, 403);
    }
  }
  const app = harness();
  for (const path of ['submissions/contact/', 'submissions/staff/contact/../', 'submissions/staff/volunteer/1/delete/']) {
    assert.equal((await app.portalRequest(path)).status, 400);
  }
  assert.equal(app.calls.length, 0);
});


test('equipment and lending bridge supports only the declared routes', async () => {
  for (const [path, method] of [
    ['equipment/', 'POST'], ['equipment/types/', 'GET'], ['equipment/summary/', 'GET'],
    ['equipment/1/', 'PATCH'], ['equipment/?status=AVAILABLE', 'GET'],
    ['lending/', 'POST'], ['lending/1/', 'GET'], ['lending/1/return/', 'POST'],
    ['lending/?status=OVERDUE', 'GET'],
  ]) {
    const app = harness();
    assert.equal((await app.portalRequest(path, method, undefined, 'ar')).status, 200);
    assert.ok(app.calls[0].url.endsWith(`/api/${path}`));
    assert.equal(app.calls[0].headers['Accept-Language'], 'ar');
  }
  const app = harness();
  for (const path of ['equipment/../staff/', 'equipment/1/return/', 'lending/return/', 'lending/1/delete/', 'lending/%2e%2e/auth/']) {
    assert.equal((await app.portalRequest(path)).status, 400);
  }
  assert.equal(app.sessionCalls(), 0);
});

test('vehicle issue bridge permits only explicit routes and methods', async () => {
  for (const [path, method] of [
    ['vehicle-issues/', 'GET'], ['vehicle-issues/', 'POST'],
    ['vehicle-issues/?vehicle=1&status=OPEN&severity=HIGH&category=brake', 'GET'],
    ['vehicle-issues/summary/', 'GET'], ['vehicle-issues/7/', 'GET'],
    ['vehicle-issues/7/', 'PATCH'], ['vehicle-issues/7/maintenance/', 'POST'],
    ['vehicle-issues/7/resolve/', 'POST'],
  ]) {
    const app = harness();
    assert.equal((await app.portalRequest(path, method)).status, 200, `${method} ${path}`);
  }
  const app = harness();
  for (const [path, method] of [
    ['vehicle-issues/7/delete/', 'POST'], ['vehicle-issues/7/', 'DELETE'],
    ['vehicle-issues/summary/', 'POST'], ['vehicle-issues/7/resolve/', 'GET'],
    ['vehicle-issues/7/maintenance/', 'PATCH'], ['vehicle-issues/../staff/', 'GET'],
    ['vehicle-issues/7/', 'POST'], ['vehicle-issues/', 'PATCH'],
  ]) assert.equal((await app.portalRequest(path, method)).status, 400, `${method} ${path}`);
  assert.equal(app.sessionCalls(), 0);
  const denied = harness(undefined, { status: 403, body: { detail: 'denied' } });
  assert.equal((await denied.portalRequest('vehicle-issues/')).status, 403);
});
