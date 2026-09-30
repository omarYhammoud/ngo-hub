/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function compile(file, requireMock) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', source)(requireMock, exports);
  return exports;
}
const data = compile('src/features/portal/ai-assistant-data.ts', () => { throw new Error('Unexpected import'); });
const fleet = [{ id: 3, code: 'AMB-3', plate_number: 'P3' }, { id: 30, code: 'AMB-30', plate_number: 'P30' }];
const example = () => ({ summary: 'Ambulance has a weak battery.', category: 'VEHICLE', urgency: 'MEDIUM', key_details: ['Weak battery'], recommended_actions: ['Review vehicle readiness.'], suggested_module: 'VEHICLE_ISSUES', draft: { vehicle_name: 'AMB-3', category: 'battery', severity: 'medium', description: 'Battery weak' }, missing_information: ['text','textarea','choice','date','time','boolean'].map((type,index)=>({field:'question_'+index,question:'Question '+index,type,options:type==='choice'?['Yes','No','Unknown']:[]})) });
function nodes(value) {
  if(Array.isArray(value))return value.flatMap(nodes);
  if(!value||typeof value!=='object')return [];
  return [value,...nodes(value.props?.children)];
}
function harness() {
  let current;
  const pushed=[];
  const jsx=(type,props)=>({type,props});
  const hooks={
    useState: initial => {
      const instance=current,index=instance.cursor++;
      if(!(index in instance.state))instance.state[index]=typeof initial==='function'?initial():initial;
      return [instance.state[index],value=>{instance.state[index]=typeof value==='function'?value(instance.state[index]):value;}];
    },
    useRef: initial => {const [value]=hooks.useState(()=>({current:initial}));return value;},
    useEffect: (fn,deps) => {
      const instance=current,index=instance.cursor++;
      if(!instance.deps[index]||deps.some((v,i)=>v!==instance.deps[index][i])){instance.effects.push(fn);instance.deps[index]=deps;}
    },
  };
  const assistantModule=compile('src/features/portal/AIAssistant.tsx',name=>{
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='next/navigation')return {useRouter:()=>({push:path=>pushed.push(path)})};
    if(name==='./ui')return {Field:'Field',Notice:'Notice'};
    if(name==='./ai-assistant-data')return data;
    if(name==='./copy')return compile('src/features/portal/copy.ts', () => { throw new Error('Unexpected import'); });
    throw new Error(name);
  });
  function mount(Component,props){
    const instance={state:[],deps:[],effects:[],cursor:0};
    return {
      render(){current=instance;instance.cursor=0;return Component(props);},
      async flush(){for(const effect of instance.effects.splice(0))effect();await new Promise(resolve=>setImmediate(resolve));},
    };
  }
  return {Root:assistantModule.default,mount,pushed};
}
const formEvent={preventDefault(){}};
const input=(tree,name)=>{
  const named=nodes(tree).find(n=>n.props?.name===name);
  if(named)return named;
  // The controlled review fields no longer use native form names.
  const form=nodes(tree).find(n=>n.type==='form');
  const fields=nodes(form);
  if(name==='vehicle')return fields.filter(n=>n.type==='select')[0];
  if(name==='severity')return fields.filter(n=>n.type==='select')[1];
  if(name==='category')return fields.find(n=>n.type==='input'&&n.props.type!=='checkbox');
  if(name==='description')return fields.find(n=>n.type==='textarea');
  if(name==='confirm')return fields.find(n=>n.type==='input'&&n.props.type==='checkbox');
};

test('vehicle matching is unique and exact, never partial, guessed, empty, or punctuation-stripped',()=>{
  assert.equal(data.matchVehicle(' amb-3 ',fleet),'3');
  assert.equal(data.matchVehicle('P30',fleet),'30');
  for(const name of ['AMB','Ambulance 3','3','AMB3','','AMB-300'])assert.equal(data.matchVehicle(name,fleet),'');
  assert.equal(data.matchVehicle('AMB-3',[...fleet,{id:4,code:'OTHER',plate_number:'AMB-3'}]),'');
  assert.equal(data.matchVehicle('anything',[{id:9,code:'',plate_number:''}]),'');
});

test('response decoder accepts backend question types and rejects stale or malformed envelopes',()=>{
  assert.deepEqual(data.parseAIResult(example()),example());
  for(const override of [{missing_information:['Old string question']},{draft:null},{key_details:null},{urgency:'urgent'},{missing_information:[{field:'x',question:'x',type:'html'}]}])assert.throws(()=>data.parseAIResult({...example(),...override}));
  assert.equal(data.draftSeverity({...example(),draft:{severity:'high'}}),'HIGH');
  assert.equal(data.draftSeverity({...example(),draft:{severity:{bad:true}}}),'MEDIUM');
  assert.equal(data.draftText({...example(),draft:{vehicle_name:3}},'vehicle_name'),'');
});

test('EN/AR analysis renders all question controls and only explicit reviewed creation saves',async()=>{
  for(const locale of ['en','ar']){
    const h=harness(),calls=[];
    const api=async(path,method,body)=>{calls.push({path,method,body});return path==='ai/analyze/'?example():path==='vehicles/'?fleet:{id:71};};
    const root=h.mount(h.Root,{api,locale,base:`/${locale}/portal`,canManageVehicles:true});
    let tree=root.render();input(tree,'note').props.onChange({target:{value:'Ambulance AMB-3 has a weak battery.'}});
    tree=root.render();await nodes(tree).find(n=>n.type==='form').props.onSubmit(formEvent);
    tree=root.render();const reviewNode=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='AnalysisReview');
    const review=h.mount(reviewNode.type,reviewNode.props);review.render();await review.flush();tree=review.render();
    assert.equal(input(tree,'vehicle').props.value,'3');
    assert.equal(input(tree,'severity').props.value,'MEDIUM');
    assert.equal(calls.filter(c=>c.path==='vehicle-issues/').length,0);
    const controls=nodes(tree).filter(n=>typeof n.type==='function'&&n.type.name==='QuestionInput').map(n=>n.type(n.props));
    assert.deepEqual(controls.map(n=>n.type==='input'?n.props.type:n.type),['text','textarea','select','date','time','select']);
    controls[0].props.onChange({target:{value:'Confirmed with the driver'}});
    input(tree,'category').props.onChange({target:{value:'Electrical'}});
    input(tree,'description').props.onChange({target:{value:'Staff-reviewed battery issue'}});
    tree=review.render();await nodes(tree).find(n=>n.type==='form').props.onSubmit(formEvent);
    assert.equal(calls.filter(c=>c.path==='vehicle-issues/').length,0,'confirmation must be explicit');
    input(tree,'confirm').props.onChange({target:{checked:true}});tree=review.render();
    await nodes(tree).find(n=>n.type==='form').props.onSubmit(formEvent);
    const saved=calls.find(c=>c.path==='vehicle-issues/');
    assert.equal(saved.method,'POST');assert.equal(saved.body.vehicle,3);assert.equal(saved.body.category,'Electrical');
    assert.match(saved.body.description,/Staff-reviewed battery issue/);assert.match(saved.body.description,/Question 0: Confirmed with the driver/);
    assert.deepEqual(Object.keys(saved.body).sort(),['category','description','severity','vehicle']);
    assert.deepEqual(h.pushed,[`/${locale}/portal/vehicle-issues/71`]);
    await nodes(review.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
    assert.equal(calls.filter(c=>c.path==='vehicle-issues/').length,1,'duplicate submission is blocked');
  }
});

test('each new analysis resets matching; unavailable or ambiguous vehicles cannot be saved',async()=>{
  const h=harness(),calls=[];
  const api=async(path)=>{calls.push(path);return path==='ai/analyze/'?{...example(),draft:{vehicle_name:'Ambulance 3',category:'battery',description:'Weak'}}:fleet;};
  const root=h.mount(h.Root,{api,locale:'en',base:'/en/portal',canManageVehicles:true});
  input(root.render(),'note').props.onChange({target:{value:'Ambulance 3 battery weak'}});
  await nodes(root.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
  const n=nodes(root.render()).find(n=>typeof n.type==='function'&&n.type.name==='AnalysisReview');
  const review=h.mount(n.type,n.props);review.render();await review.flush();let tree=review.render();
  assert.equal(input(tree,'vehicle').props.value,'');
  input(tree,'confirm').props.onChange({target:{checked:true}});
  await nodes(review.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
  assert.ok(!calls.includes('vehicle-issues/'));
  input(tree,'vehicle').props.onChange({target:{value:'30'}});tree=review.render();
  assert.equal(input(tree,'confirm').props.checked,false,'edits require fresh confirmation');
  input(root.render(),'note').props.onChange({target:{value:'A different operational note'}});
  assert.ok(!nodes(root.render()).some(n=>typeof n.type==='function'&&n.type.name==='AnalysisReview'));
});

test('AI-authorized staff without vehicle capability see draft but never load or save vehicles',async()=>{
  const h=harness(),calls=[];
  const api=async(path)=>{calls.push(path);return example();};
  const root=h.mount(h.Root,{api,locale:'ar',base:'/ar/portal',canManageVehicles:false});
  input(root.render(),'note').props.onChange({target:{value:'Ambulance battery is weak'}});
  await nodes(root.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
  const n=nodes(root.render()).find(n=>typeof n.type==='function'&&n.type.name==='AnalysisReview');
  const review=h.mount(n.type,n.props);review.render();await review.flush();
  assert.ok(!nodes(review.render()).some(n=>n.type==='form'));
  assert.deepEqual(calls,['ai/analyze/']);
});

test('portal AI gate mirrors backend view_team_activity and passes separate vehicle capability',()=>{
  for(const locale of ['en','ar'])for(const [role,capabilities] of [
    ['SUPER_ADMIN',['view_team_activity','manage_vehicles']], ['OPERATIONS_MANAGER',['view_team_activity']],
    ['VEHICLE_MANAGER',['manage_vehicles']], ['PARAMEDIC',['manage_missions']], ['LENDING_OFFICER',['manage_lending']],
  ]){
    const user={username:'tester',role,capabilities};const stub=()=>null;
    const portal=compile('src/features/portal/Portal.tsx',name=>{
      if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(name==='react')return {useState:initial=>[initial===undefined?user:initial,stub],useCallback:fn=>fn,useEffect:stub};
      if(name==='next/navigation')return {useRouter:()=>({}),usePathname:()=>`/${locale}/portal/ai-assistant`,useSearchParams:()=>new URLSearchParams()};
      if(name==='./copy')return {translator:()=>key=>key};
      if(name==='./AIAssistant')return {default:'AIAssistant'};
      if(name==='next/link')return {default:'Link'};
      return {default:stub,DashboardIcon:stub};
    });
    const tree=nodes(portal.default({locale,path:'ai-assistant'}));
    const allowed=capabilities.includes('view_team_activity');
    assert.equal(tree.some(n=>n.type==='AIAssistant'),allowed);
    assert.equal(tree.some(n=>n.type==='Link'&&n.props.href===`/${locale}/portal/ai-assistant`),allowed);
    if(allowed){const props=tree.find(n=>n.type==='AIAssistant').props;assert.equal(props.canManageVehicles,role==='SUPER_ADMIN');assert.equal(props.base,`/${locale}/portal`);assert.equal(props.locale,locale);}
  }
});

test('AI bridge accepts POST only and uses a plain API URL',async()=>{
  const calls=[];
  const source=ts.transpileModule(fs.readFileSync('src/features/auth/portal-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const request=name=>name==='next/headers'?{cookies:async()=>({get:()=>({value:'token'})})}:{currentUser:async()=>({user:{id:1}})};
  new Function('require','exports','fetch','process',source)(request,exports,async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(example()),{status:200});},{env:{}});
  for(const [path,method] of [['ai/analyze/','GET'],['ai/analyze/','PATCH'],['ai/other/','POST'],['ai/analyze/?x=1','POST']])assert.equal((await exports.portalRequest(path,method)).status,400);
  assert.equal(calls.length,0);
  assert.equal((await exports.portalRequest('ai/analyze/','POST',{note:'Battery weak',language:'ar'})).status,200);
  assert.equal(calls[0].url,'http://127.0.0.1:8000/api/ai/analyze/');
});

test('vehicle-list failure blocks creation and a rejected save preserves edited fields',async()=>{
  const h=harness();let fleetFails=true;const calls=[];
  const api=async(path)=>{calls.push(path);if(path==='ai/analyze/')return example();if(path==='vehicles/'){if(fleetFails)throw new Error('offline');return fleet;}throw new Error('denied');};
  const root=h.mount(h.Root,{api,locale:'en',base:'/en/portal',canManageVehicles:true});
  input(root.render(),'note').props.onChange({target:{value:'AMB-3 has a weak battery'}});
  await nodes(root.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
  const n=nodes(root.render()).find(n=>typeof n.type==='function'&&n.type.name==='AnalysisReview');
  const review=h.mount(n.type,n.props);review.render();await review.flush();let tree=review.render();
  assert.equal(nodes(tree).find(n=>n.type==='fieldset').props.disabled,true);
  fleetFails=false;
  nodes(tree).find(n=>n.type==='button'&&n.props.children==='Retry vehicle list').props.onClick();
  review.render();await review.flush();tree=review.render();
  input(tree,'description').props.onChange({target:{value:'Human correction retained'}});
  input(tree,'confirm').props.onChange({target:{checked:true}});
  await nodes(review.render()).find(n=>n.type==='form').props.onSubmit(formEvent);
  tree=review.render();
  assert.equal(input(tree,'description').props.value,'Human correction retained');
  assert.equal(input(tree,'vehicle').props.value,'3');
  assert.equal(nodes(tree).find(n=>n.type==='fieldset').props.disabled,false);
  assert.equal(h.pushed.length,0);
});
