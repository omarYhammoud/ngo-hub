/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function harness(responses, initial = {}) {
  const jar = new Map(Object.entries(initial));
  const calls = [];
  const cookieOptions = [];
  const source = ts.transpileModule(fs.readFileSync('src/features/auth/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const mockedRequire = (name) => {
    assert.equal(name, 'next/headers');
    return { cookies: async () => ({
      get: key => jar.has(key) ? { value: jar.get(key) } : undefined,
      set: (key, value, options) => { jar.set(key, value); cookieOptions.push(options); },
      delete: key => jar.delete(key),
    }) };
  };
  const fetch = async (url, options) => {
    calls.push({ url, ...options });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    assert.ok(response, 'Unexpected backend request');
    return new Response(JSON.stringify(response.body || {}), { status: response.status || 200 });
  };
  new Function('require', 'exports', 'fetch', source)(mockedRequire, exports, fetch);
  return { ...exports, jar, calls, cookieOptions };
}

test('login stores tokens only in HTTP-only cookies', async () => {
  const app = harness([{ body: { access: 'access', refresh: 'refresh' } }]);
  assert.equal(await app.signIn(' medic ', 'password'), 'ok');
  assert.deepEqual(JSON.parse(app.calls[0].body), { username: 'medic', password: 'password' });
  assert.equal(app.jar.get('ngo_refresh'), 'refresh');
  assert.ok(app.cookieOptions.every(o => o.httpOnly && o.sameSite === 'lax'));
});
test('invalid credentials, throttling and outages remain distinct', async () => {
  for (const [response, expected] of [[{ status: 401 }, 'invalid'], [{ status: 429 }, 'throttled'], [new Error('offline'), 'unavailable']]) {
    const app = harness([response]);
    assert.equal(await app.signIn('medic', 'password'), expected);
    assert.equal(app.jar.size, 0);
  }
});
test('expired access renews and rotates refresh before retrieving profile', async () => {
  const app = harness([{ status: 401 }, { body: { access: 'new', refresh: 'rotated' } }, { body: { username: 'medic', role: 'PARAMEDIC' } }], { ngo_access: 'old', ngo_refresh: 'original' });
  assert.equal((await app.currentUser()).user.username, 'medic');
  assert.equal(app.jar.get('ngo_refresh'), 'rotated');
  assert.equal(app.calls[2].headers.Authorization, 'Bearer new');
});
test('invalid refresh clears session; outage preserves retryable session', async () => {
  const invalid = harness([{ status: 401 }], { ngo_refresh: 'invalid' });
  assert.deepEqual(await invalid.currentUser(), {});
  assert.equal(invalid.jar.size, 0);
  const offline = harness([new Error('offline')], { ngo_refresh: 'valid' });
  assert.deepEqual(await offline.currentUser(), { error: 'unavailable' });
  assert.equal(offline.jar.get('ngo_refresh'), 'valid');
});
test('logout blacklists refresh before clearing cookies, and can retry outages', async () => {
  const app = harness([new Error('offline'), {}], { ngo_access: 'access', ngo_refresh: 'refresh' });
  assert.equal(await app.signOut(), false);
  assert.equal(app.jar.size, 2);
  assert.equal(await app.signOut(), true);
  assert.equal(app.jar.size, 0);
  assert.deepEqual(JSON.parse(app.calls[1].body), { refresh: 'refresh' });
});
