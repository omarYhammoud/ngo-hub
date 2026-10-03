/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function compile(file, dependencies, timers = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', source)(
    name => dependencies[name] || {}, exports, timers.setTimeout || setTimeout, timers.clearTimeout || clearTimeout,
  );
  return exports;
}

test('production static parameters cover every public page in both languages', () => {
  const pages = ['about', 'services', 'activities', 'volunteer', 'contact', 'donate', 'login'];
  const page = compile('src/app/[lang]/(public)/[page]/page.tsx', {
    '@/i18n/dictionaries': { locales: ['en', 'ar'] },
    '@/features/public/InformationPage': { publicPages: pages },
  });
  assert.equal(page.dynamicParams, false);
  assert.deepEqual(page.generateStaticParams(), ['en', 'ar'].flatMap(lang => pages.map(page => ({ lang, page }))));
});

function loginHarness(currentUser, locale) {
  const state = [];
  const effects = [];
  const redirects = [];
  let index = 0;
  let timeout;
  const router = { replace: value => redirects.push(value) };
  const jsx = (type, props) => ({ type, props });
  const component = compile('src/features/auth/StaffPortal.tsx', {
    react: {
      useState: initial => { const slot = index++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = value; }]; },
      useEffect: fn => effects.push(fn),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => router },
    'next/image': { default: 'Image' },
    './actions': { currentUser },
  }, { setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => {} });
  component.default({ locale });
  return { state, redirects, start: () => effects[0](), expire: () => timeout() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('login unlocks after anonymous, rejected, and unavailable session checks in EN/AR', async () => {
  for (const locale of ['en', 'ar']) {
    for (const mode of ['anonymous', 'rejected', 'unavailable']) {
      const harness = loginHarness(() => mode === 'rejected' ? Promise.reject(new Error('offline')) : Promise.resolve(mode === 'unavailable' ? { error: 'unavailable' } : {}), locale);
      harness.start(); await flush();
      assert.equal(harness.state[0], false);
      assert.equal(Boolean(harness.state[1]), mode !== 'anonymous');
      assert.deepEqual(harness.redirects, []);
    }
  }
});

test('session timeout unlocks login and ignores a late response; cleanup ignores responses', async () => {
  let resolve;
  const harness = loginHarness(() => new Promise(done => { resolve = done; }), 'en');
  harness.start(); harness.expire();
  assert.equal(harness.state[0], false);
  resolve({ user: { username: 'late' } }); await flush();
  assert.deepEqual(harness.redirects, []);
  const unmounted = loginHarness(() => Promise.resolve({ user: {} }), 'ar');
  unmounted.start()(); await flush();
  assert.deepEqual(unmounted.redirects, []);
});

test('authenticated session redirects to the correct localized portal', async () => {
  for (const locale of ['en', 'ar']) {
    const harness = loginHarness(() => Promise.resolve({ user: { username: 'tester' } }), locale);
    harness.start(); await flush();
    assert.deepEqual(harness.redirects, [`/${locale}/portal`]);
  }
});
