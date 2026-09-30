/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function portal(user, locale, path) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const stub = () => null;
  const source = ts.transpileModule(fs.readFileSync('src/features/portal/Portal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireMock = name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: initial => [initial === undefined ? user : initial, stub], useCallback: fn => fn, useEffect: stub };
    if (name === 'next/navigation') return { useRouter: () => ({}), usePathname: () => `/${locale}/portal/submissions`, useSearchParams: () => new URLSearchParams() };
    if (name === './copy') return { translator: () => key => key };
    if (name === './Equipment') return { default: 'EquipmentScreen' };
    if (name === 'next/link') return { default: 'Link' };
    return { default: stub, DashboardIcon: stub };
  };
  new Function('require', 'exports', source)(requireMock, exports);
  return exports.default({ locale, path });
}
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...nodes(value.props?.children)];
}

test('Equipment and Lending navigation and screens follow capabilities in English and Arabic', () => {
  for (const locale of ['en', 'ar']) {
    for (const path of ['equipment', 'lending']) {
      for (const role of ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'PARAMEDIC', 'LENDING_OFFICER', 'VEHICLE_MANAGER']) {
        const allowed = ['SUPER_ADMIN', 'LENDING_OFFICER'].includes(role);
        const tree = nodes(portal({ username: 'tester', role, capabilities: allowed ? ['manage_lending'] : [] }, locale, path));
        const screens = tree.filter(node => node.type === 'EquipmentScreen');
        assert.equal(screens.length, Number(allowed), `${locale}/${role}/${path}`);
        assert.equal(tree.some(node => node.type === 'Link' && node.props.href === `/${locale}/portal/${path}`), allowed);
        if (allowed) {
          assert.equal(screens[0].props.locale, locale);
          assert.equal(screens[0].props.lending, path === 'lending');
        }
      }
      const tree = nodes(portal({ username: 'tester', role: 'SUPER_ADMIN', capabilities: [] }, locale, path));
      assert.equal(tree.some(node => node.type === 'EquipmentScreen'), false);
    }
  }
});


function equipmentHarness(api) {
  const state = [];
  let cursor = 0;
  let initial = true;
  const effects = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(fs.readFileSync('src/features/portal/Equipment.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireMock = name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === './ui') return { Field: 'Field' };
    assert.equal(name, 'react');
    return {
      useState: value => {
        const index = cursor++;
        if (initial) state[index] = value;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
      },
      useCallback: fn => fn,
      useEffect: fn => { if (initial) effects.push(fn); },
    };
  };
  class FormDataMock { constructor(form) { return Object.entries(form); } }
  new Function('require', 'exports', 'FormData', source)(requireMock, exports, FormDataMock);
  const render = () => {
    cursor = 0;
    const result = nodes(exports.default({ api, t: key => key, locale: 'ar', lending: true }));
    initial = false;
    return result;
  };
  return { render, start: async () => { render(); effects.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); } };
}

test('lending screen sends checkout and maintenance return payloads and refreshes history', async () => {
  const calls = [];
  const loan = { id: 7, equipment_code: 'WC-001', equipment_name: 'Wheelchair', borrower_name: 'Test', borrower_phone: '123', due_date: '2026-09-25', checked_out_at: '2026-09-25T10:00:00Z', returned_at: null, is_overdue: false };
  let history = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (method === 'POST' && path === 'lending/') { history = [loan]; return loan; }
    if (method === 'POST') { history = [{ ...loan, returned_at: '2026-09-25T12:00:00Z', return_status: 'MAINTENANCE' }]; return history[0]; }
    if (path === 'equipment/') return [{ id: 1, code: 'WC-001', name: 'Wheelchair', status: history.length ? 'ON_LOAN' : 'AVAILABLE' }];
    if (path === 'equipment/types/') return ['WC'];
    return history;
  };
  const app = equipmentHarness(api);
  await app.start();
  app.render().find(node => node.type === 'button' && node.props.children === 'checkout').props.onClick();
  const payload = { equipment: '1', borrower_name: 'Test', borrower_phone: '123', due_date: '2026-09-25' };
  await app.render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: payload });
  assert.deepEqual(calls.find(call => call.method === 'POST').body, { ...payload, equipment: 1 });
  assert.equal(app.render().some(node => node.type === 'form'), false);
  app.render().find(node => node.type === 'button' && node.props.children === 'returnEquipment').props.onClick();
  await app.render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { status: 'MAINTENANCE', return_notes: 'Needs service' } });
  assert.deepEqual(calls.filter(call => call.method === 'POST')[1], { path: 'lending/7/return/', method: 'POST', body: { status: 'MAINTENANCE', return_notes: 'Needs service' } });
  assert.equal(app.render().some(node => node.type === 'button' && node.props.children === 'returnEquipment'), false);
  assert.equal(calls.filter(call => call.path === 'lending/' && call.method === 'GET').length, 3);
});

test('a rejected checkout keeps borrower details in the open form for correction', async () => {
  const api = async (path, method = 'GET') => {
    if (method === 'POST') throw new Error('equipment_unavailable');
    return path === 'equipment/types/' ? ['WC'] : [];
  };
  const app = equipmentHarness(api);
  await app.start();
  app.render().find(node => node.type === 'button' && node.props.children === 'checkout').props.onClick();
  await app.render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { equipment: '1', borrower_name: 'Test' } });
  assert.equal(app.render().filter(node => node.type === 'form').length, 1);
  assert.equal(app.render().find(node => node.type === 'fieldset').props.disabled, false);
});
