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
    if (name === './VehicleIssues') return { default: 'VehicleIssues' };
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


test('Vehicle Issues navigation and detail access follow vehicle capability in both languages', () => {
  for (const locale of ['en','ar']) {
    for (const role of ['SUPER_ADMIN','VEHICLE_MANAGER','OPERATIONS_MANAGER','PARAMEDIC','LENDING_OFFICER']) {
      const allowed=['SUPER_ADMIN','VEHICLE_MANAGER'].includes(role);
      const tree=nodes(portal({username:'tester',role,capabilities:allowed?['manage_vehicles']:[]},locale,'vehicle-issues/7'));
      assert.equal(tree.some(n=>n.type==='VehicleIssues'),allowed);
      assert.equal(tree.some(n=>n.type==='Link'&&n.props.href==='/'+locale+'/portal/vehicle-issues'),allowed);
      if(allowed)assert.equal(tree.find(n=>n.type==='VehicleIssues').props.id,'7');
    }
  }
});
