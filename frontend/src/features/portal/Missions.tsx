'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { StaffUser } from '@/features/auth/actions';
import type { Api, Mission, Vehicle, Crew } from './types';
import { incidentTypes, type T } from './copy';
import { Field, Notice } from './ui';

export function MissionList({api,t,base}: {api:Api;t:T;base:string}) {
  const router = useRouter();
  const search = useSearchParams();
  const [data,setData] = useState<{count:number;results:Mission[]}>();
  const [vehicles,setVehicles] = useState<Vehicle[]>([]);
  const [crew,setCrew] = useState<{id:number;name:string}[]>([]);
  useEffect(()=>{
    let live=true;
    async function load(){
      const list=await api<{count:number;results:Mission[]}>(`missions/?${search}`);
      if(live)setData(list);
      const v=await api<Vehicle[]>('vehicles/'); if(live)setVehicles(v);
      const c=await api<{id:number;name:string}[]>('missions/crew_options/'); if(live)setCrew(c);
    }
    load().catch(()=>{}); return ()=>{live=false;};
  },[api,search]);
  function filter(e:FormEvent<HTMLFormElement>){e.preventDefault(); const q=new URLSearchParams();new FormData(e.currentTarget).forEach((v,k)=>{if(v)q.set(k,String(v));});router.push(`${base}/missions?${q}`);}
  const page=Number(search.get('page')||1);
  function paginate(next:number){const q=new URLSearchParams(search);q.set('page',String(next));router.push(`${base}/missions?${q}`);}
  return <><div className="portal-heading"><div><h1>{t('missions')}</h1><p>{data ? `${t('total')}: ${data.count}` : t('loading')}</p></div><Link href={`${base}/missions/new`} className="button button-primary">＋ {t('newMission')}</Link></div>
    <form className="portal-card portal-filters" onSubmit={filter}>
      <Field label={t('search')}><input name="search" defaultValue={search.get('search')||''}/></Field>
      <Field label={t('status')}><select name="status" defaultValue={search.get('status')||''}><option value="">{t('all')}</option>{['PENDING','ACTIVE','COMPLETED','CANCELLED'].map(v=><option key={v} value={v}>{t(v)}</option>)}</select></Field>
      <Field label={t('incident_type')}><input name="incident_type" defaultValue={search.get('incident_type')||''}/></Field>
      <Field label={t('vehicle')}><select name="vehicle" defaultValue={search.get('vehicle')||''}><option value="">{t('all')}</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.code}</option>)}</select></Field>
      <Field label={t('crew')}><select name="crew" defaultValue={search.get('crew')||''}><option value="">{t('all')}</option>{crew.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label={t('date_from')}><input type="date" name="date_from" defaultValue={search.get('date_from')||''}/></Field><Field label={t('date_to')}><input type="date" name="date_to" defaultValue={search.get('date_to')||''}/></Field>
      <div className="portal-buttons"><button className="button button-primary">{t('search')}</button><Link className="button button-secondary" href={`${base}/missions`}>{t('clear')}</Link></div>
    </form>
    <div className="portal-card portal-table-wrap">{!data ? <p role="status">{t('loading')}</p> : !data.results.length ? <div className="portal-empty"><h2>{t('empty')}</h2><p>{t('emptyHint')}</p></div> : <table className="portal-table"><thead><tr>{['mission_number','date','location','incident_type','vehicle','status'].map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{data.results.map(m=><tr key={m.id}><td><Link href={`${base}/missions/${m.id}`}>{m.mission_number}</Link></td><td>{m.date||'—'}</td><td>{m.location||m.title||'—'}</td><td>{m.incident_type ? t(m.incident_type) : '—'}</td><td>{m.vehicle_code||'—'}</td><td><span className={`portal-badge ${m.status}`}>{t(m.status)}</span></td></tr>)}</tbody></table>}</div>
    {data && data.count>20 && <div className="portal-buttons"><button className="button button-secondary" disabled={page<=1} onClick={()=>paginate(page-1)}>{t('previous')}</button><span>{t('page')} {page}</span><button className="button button-secondary" disabled={page*20>=data.count} onClick={()=>paginate(page+1)}>{t('next')}</button></div>}
  </>;
}

export function MissionScreen({api,t,base,user,id}: {api:Api;t:T;base:string;user:StaffUser;id:string}) {
  const [mission,setMission]=useState<Mission>();
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [options,setOptions]=useState<{id:number;name:string}[]>([]);
  const [ready,setReady]=useState(false);
  const [version,setVersion]=useState(0);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let live=true;async function load(){
    if(id!=='new'){const m=await api<Mission>(`missions/${id}/`);if(live)setMission(m);}
    const v=await api<Vehicle[]>('vehicles/');if(live)setVehicles(v);
    const c=await api<{id:number;name:string}[]>('missions/crew_options/');if(live){setOptions(c);setReady(true);}
  }load().catch(()=>{if(live)setFailed(true);});return ()=>{live=false;};},[api,id,version]);
  if(failed)return <Link href={`${base}/missions`} className="button button-secondary">{t('back')}</Link>;
  if(!ready)return <p role="status">{t('loading')}</p>;
  return <><Link href={`${base}/missions`} className="portal-back">← {t('back')}</Link><MissionForm key={`${id}-${version}`} api={api} t={t} base={base} user={user} mission={mission} vehicles={vehicles} options={options} onSaved={()=>{setReady(false);setVersion(v=>v+1);}}/></>;
}

function localTime(value:string|null|undefined){if(!value)return '';const d=new Date(value);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
const crewRoles = [
  { value: 'مسعف', label: 'crewParamedic' },
  { value: 'مساعد مسعف', label: 'crewAssistant' },
  { value: 'مسؤول مهمة', label: 'crewLeader' },
  { value: 'سائق', label: 'crewDriver' },
];

function CrewEditor({ label, entries, onChange, options, t }: {
  label: string;
  entries: Crew[];
  onChange: (v: Crew[]) => void;
  options: { id: number; name: string }[];
  t: T;
}) {
  return (
    <fieldset className="portal-crew">
      <legend>{label}</legend>
      {entries.map((c, i) => (
        <div key={i} className="portal-crew-row">
          <Field label={t('crew')}>
            <select
              aria-label={`${label} ${i + 1}`}
              value={c.user_id || ''}
              required
              onChange={e => onChange(entries.map((x, n) =>
                n === i ? { ...x, user_id: Number(e.target.value) } : x
              ))}
            >
              <option value="">{t('select')}</option>
              {!options.some(o => o.id === c.user_id) && c.user_id > 0 && (
                <option value={c.user_id}>{c.name || `#${c.user_id}`}</option>
              )}
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>

          <Field label={t('crew_role')}>
            <select
              value={c.crew_role}
              onChange={e => onChange(entries.map((x, n) =>
                n === i ? { ...x, crew_role: e.target.value } : x
              ))}
            >
              <option value="">{t('select')}</option>
              {c.crew_role && !crewRoles.some(role => role.value === c.crew_role) && (
                <option value={c.crew_role}>{c.crew_role}</option>
              )}
              {crewRoles.map(role => (
                <option key={role.value} value={role.value}>{t(role.label)}</option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => onChange(entries.filter((_, n) => n !== i))}
          >
            {t('remove')}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onChange([...entries, { user_id: 0, crew_role: '' }])}
      >
        ＋ {t('addCrew')}
      </button>
    </fieldset>
  );
}

function MissionForm({api,t,base,user,mission,vehicles,options,onSaved}: {api:Api;t:T;base:string;user:StaffUser;mission?:Mission;vehicles:Vehicle[];options:{id:number;name:string}[];onSaved:()=>void}) {
  const router=useRouter();
  const closed=!!mission&&['COMPLETED','CANCELLED'].includes(mission.status);
  const management=['SUPER_ADMIN','OPERATIONS_MANAGER'].includes(user.role);
  const [correcting,setCorrecting]=useState(false);
  const [command,setCommand]=useState('save');
  const [planned,setPlanned]=useState<Crew[]>(mission?.crew.filter(c=>!c.actual)||[]);
  const [actual,setActual]=useState<Crew[]>(mission?.crew.filter(c=>c.actual).length ? mission.crew.filter(c=>c.actual) : mission?.crew.filter(c=>!c.actual)||[]);
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState(false);
  const readonly=closed&&!correcting;
  const historical=!mission&&command==='complete';
  const actualMode=command==='complete'||command==='start'||mission?.status==='ACTIVE'||(closed&&correcting);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setSuccess(false);
    const f=new FormData(e.currentTarget);
    const body:Record<string,unknown>={};
    ['title','date','location','incident_type','destination','notes'].forEach(k=>{if(f.has(k))body[k]=String(f.get(k));});
    if(!body.date)delete body.date;
    if(f.has('vehicle_id'))body.vehicle_id=f.get('vehicle_id')?Number(f.get('vehicle_id')):null;
    if(actualMode){for(const k of ['actual_start','actual_end'])if(f.has(k))body[k]=f.get(k)?new Date(String(f.get(k))).toISOString():null;body.actual_crew=actual.map(({user_id,crew_role})=>({user_id,crew_role}));}
    if(management&&(!mission||mission.status==='PENDING')&&command==='save')body.planned_crew=planned.map(({user_id,crew_role})=>({user_id,crew_role}));
    if(command==='cancel'||mission?.status==='CANCELLED')body.cancellation_reason=String(f.get('cancellation_reason')||'');
    if(correcting)body.correction_reason=String(f.get('correction_reason')||'');
    let endpoint=mission?`missions/${mission.id}/`:'missions/';
    if(correcting)endpoint+='correct/';else if(!mission&&historical)endpoint+='historical/';else if(command!=='save')endpoint+=`${command}/`;
    try {const result=await api<Mission>(endpoint,mission&&command==='save'&&!correcting?'PATCH':'POST',body);setSuccess(true);if(!mission)router.push(`${base}/missions/${result.id}`);else onSaved();}catch{}finally{setBusy(false);}
  }
  return <><div className="portal-heading"><div><p className="portal-eyebrow">{t('missions')}</p><h1>{mission?.mission_number||t('newMission')}</h1>{mission&&<span className={`portal-badge ${mission.status}`}>{t(mission.status)}</span>}</div>{mission?.status==='PENDING'&&command!=='complete'&&<button type="button" className="button button-primary" onClick={()=>setCommand('complete')}>{t('finishMission')}</button>}{closed&&user.role==='SUPER_ADMIN'&&!correcting&&<button className="button button-primary" onClick={()=>setCorrecting(true)}>{t('correct')}</button>}</div>
    {mission?.mission_number.includes('LEGACY')&&<Notice text={t('legacy')}/>}{closed&&<Notice text={t('locked')}/>}{success&&<p role="status">{t('saved')}</p>}
    <form method="post" className="portal-card" onSubmit={submit}>
      {!readonly&&<Field label={t('action')}><select value={correcting?'correct':command} onChange={e=>setCommand(e.target.value)} disabled={correcting}>{correcting?<option value="correct">{t('correct')}</option>:<><option value="save">{mission?t('save'):t('pendingEntry')}</option>{mission?.status==='PENDING'&&<option value="start">{t('start')}</option>}<option value="complete">{mission?t('complete'):t('historical')}</option>{mission&&<option value="cancel">{t('cancel')}</option>}</>}</select></Field>}
      {historical&&<Notice text={t('historicalHint')}/>}
      <fieldset disabled={readonly||busy} className="portal-form-grid">
        <Field label={`${t('date')} *`}><input name="date" type="date" defaultValue={mission?.date||''} required={command!=='cancel'}/></Field>
        <Field label={`${t('location')} *`}><input name="location" maxLength={250} defaultValue={mission?.location} required={command!=='cancel'}/></Field>
        <Field label={`${t('incident_type')} *`}><select name="incident_type" defaultValue={mission?.incident_type||''} required={command!=='cancel'}><option value="">{t('select')}</option>{mission?.incident_type&&!incidentTypes.includes(mission.incident_type)&&<option value={mission.incident_type}>{mission.incident_type}</option>}{incidentTypes.map(value=><option key={value} value={value}>{t(value)}</option>)}</select></Field>
        <Field label={t('destination')}><input name="destination" maxLength={250} defaultValue={mission?.destination}/></Field>
        <Field label={t('vehicle')}><select name="vehicle_id" defaultValue={mission?.vehicle_id||''} disabled={mission?.status==='ACTIVE'} required={command==='complete'||command==='start'}><option value="">{t('select')}</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.code} · {v.model} · {t(v.status)}</option>)}</select></Field>
        <Field label={t('title')}><input name="title" maxLength={200} defaultValue={mission?.title}/></Field>
        {(actualMode||readonly)&&<><Field label={t('actual_start')}><input type="datetime-local" name="actual_start" defaultValue={localTime(mission?.actual_start)} required={command==='complete'||command==='start'}/></Field><Field label={t('actualEndOptional')}><input type="datetime-local" name="actual_end" defaultValue={localTime(mission?.actual_end)} disabled={command==='start'}/></Field></>}
        <div className="portal-full"><Field label={t('notes')}><textarea name="notes" rows={4} maxLength={20000} defaultValue={mission?.notes}/></Field></div>
      </fieldset>
      {actualMode&&<Notice text={t('timesHint')}/>}
      {!readonly&&management&&command==='save'&&(!mission||mission.status==='PENDING')?<CrewEditor label={t('planned')} entries={planned} onChange={setPlanned} options={options} t={t}/>:mission&&<section className="portal-crew"><h2>{t('planned')}</h2><p>{mission.crew.filter(c=>!c.actual).map(c=>`${c.name} ${c.crew_role?`(${c.crew_role})`:''}`).join('، ')||'—'}</p><small>{t('assignedHint')}</small></section>}
      {!readonly&&actualMode?<CrewEditor label={t('actual')} entries={actual} onChange={setActual} options={options} t={t}/>:mission&&<section className="portal-crew"><h2>{t('actual')}</h2><p>{mission.crew.filter(c=>c.actual).map(c=>`${c.name} ${c.crew_role?`(${c.crew_role})`:''}`).join('، ')||'—'}</p></section>}
      {(command==='cancel'||mission?.status==='CANCELLED')&&<Field label={t('cancellation_reason')}><textarea name="cancellation_reason" defaultValue={mission?.cancellation_reason} required disabled={readonly} maxLength={4000}/></Field>}
      {correcting&&<Field label={t('correction_reason')}><textarea name="correction_reason" required maxLength={4000}/></Field>}
      {!readonly&&<div className="portal-buttons"><button disabled={busy} className={`button ${command==='cancel'?'button-danger':'button-primary'}`}>{busy?t('loading'):correcting?t('correct'):command==='save'?(mission?t('save'):t('create')):t(command)}</button>{correcting&&<button type="button" className="button button-secondary" onClick={()=>setCorrecting(false)}>{t('close')}</button>}</div>}
    </form>
    {mission&&<div className="portal-card"><div className="portal-meta"><p>{t('creator')}: <b>{mission.creator_name}</b></p><p>{t('created_at')}: <time>{new Date(mission.created_at).toLocaleString()}</time></p></div><h2>{t('audit')}</h2>{!mission.audit?.length?<p>{t('noAudit')}</p>:mission.audit.map(a=><details key={a.id} className="portal-audit"><summary><b>{a.actor_name}</b> · {t(a.action)} · {new Date(a.created_at).toLocaleString()}{a.reason&&` — ${a.reason}`}</summary><table className="portal-table"><thead><tr><th>{t('details')}</th><th>{t('before')}</th><th>{t('after')}</th></tr></thead><tbody>{Object.keys(a.after).filter(k=>JSON.stringify(a.before[k])!==JSON.stringify(a.after[k])).map(k=><tr key={k}><td>{t(k==='vehicle_id'?'vehicle':k)}</td><td><pre>{JSON.stringify(a.before[k]??'—',null,2)}</pre></td><td><pre>{JSON.stringify(a.after[k],null,2)}</pre></td></tr>)}</tbody></table></details>)}</div>}
  </>;
}

