'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { Api, Staff, Vehicle } from './types';
import { roles, type T } from './copy';
import { Field, Notice } from './ui';

export function StaffScreen({api,t}: {api:Api;t:T}) {
  const [rows,setRows]=useState<Staff[]>();
  const [editing,setEditing]=useState<Staff|null>();
  const [busy,setBusy]=useState(false);
  const [resetting,setResetting]=useState<Staff>();
  const [resetSuccess,setResetSuccess]=useState(false);
  useEffect(()=>{api<Staff[]>('staff/').then(setRows).catch(()=>{});},[api]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const body:Record<string,unknown>=Object.fromEntries(f);body.is_active=f.has('is_active');if(!body.password)delete body.password;try{await api(`staff/${editing?`${editing.id}/`:''}`,editing?'PATCH':'POST',body);setRows(await api<Staff[]>('staff/'));setEditing(undefined);}catch{}finally{setBusy(false);}}
  return <><div className="portal-heading"><div><h1>{t('staff')}</h1></div><button className="button button-primary" onClick={()=>setEditing(null)}>＋ {t('newStaff')}</button></div>
    {resetSuccess&&<p role="status">{t('password_reset_success')}</p>}
    {resetting&&<PasswordResetForm key={resetting.id} staff={resetting} api={api} t={t} onClose={()=>setResetting(undefined)} onSuccess={()=>{setResetting(undefined);setResetSuccess(true);}}/>}
    {editing!==undefined&&<form method="post" key={editing?.id||'new'} className="portal-card" onSubmit={submit}><h2>{editing?t('edit'):t('newStaff')}</h2><div className="portal-form-grid">
      {['username','first_name','last_name','phone','email'].map(k=><Field key={k} label={t(k)}><input name={k} type={k==='email'?'email':'text'} autoComplete="off" required={k==='username'} defaultValue={editing?.[k as keyof Staff] as string||''}/></Field>)}
      <Field label={t('role')}><select name="role" defaultValue={editing?.role||'PARAMEDIC'}>{roles.map(r=><option key={r} value={r}>{t(r)}</option>)}</select></Field>
      {!editing&&<Field label={t('password')}><input name="password" type="password" autoComplete="new-password" minLength={8} required/></Field>}
      <label className="portal-checkbox"><input name="is_active" type="checkbox" defaultChecked={editing?.is_active??true}/>{t('is_active')}</label></div>{!editing&&<Notice text={t('passwordRules')}/>}<div className="portal-buttons"><button disabled={busy} className="button button-primary">{busy?t('loading'):t('save')}</button><button type="button" className="button button-secondary" onClick={()=>setEditing(undefined)}>{t('close')}</button></div></form>}
    <div className="portal-card portal-table-wrap">{!rows?t('loading'):!rows.length?t('empty'):<table className="portal-table"><thead><tr>{['username','role','status','action'].map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.username}</b><small>{r.first_name} {r.last_name}</small></td><td>{t(r.role)}</td><td>{t(r.is_active?'enabled':'disabled')}</td><td><div className="portal-buttons"><button className="button button-secondary" onClick={()=>setEditing(r)}>{t('edit')}</button><button className="button button-secondary" onClick={()=>{setResetting(r);setResetSuccess(false);setEditing(undefined);}}>{t('resetPassword')}</button></div></td></tr>)}</tbody></table>}</div>
  </>;
}


function PasswordResetForm({staff,api,t,onClose,onSuccess}: {staff:Staff;api:Api;t:T;onClose:()=>void;onSuccess:()=>void}) {
  const [visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');
    const form=e.currentTarget;
    const f=new FormData(form);
    const newPassword=String(f.get('new_password')||'');
    const confirmation=String(f.get('confirm_password')||'');
    if(newPassword!==confirmation){setError(t('password_mismatch'));return;}
    setBusy(true);
    try{await api('staff/'+staff.id+'/reset_password/','POST',{new_password:newPassword,confirm_password:confirmation});form.reset();onSuccess();}catch{}finally{setBusy(false);}
  }
  return <form method="post" className="portal-card" onSubmit={submit}><h2>{t('resetPassword')}: {staff.username}</h2>
    {error&&<p role="alert">{error}</p>}
    <fieldset disabled={busy} className="portal-form-grid">{['new_password','confirm_password'].map(name=><Field key={name} label={t(name)}><input name={name} type={visible?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={1024}/></Field>)}</fieldset>
    <button type="button" className="button button-secondary" aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{t(visible?'hidePassword':'showPassword')}</button>
    <Notice text={t('passwordRules')}/><div className="portal-buttons"><button disabled={busy} className="button button-primary">{busy?t('loading'):t('resetPassword')}</button><button type="button" disabled={busy} className="button button-secondary" onClick={onClose}>{t('close')}</button></div>
  </form>;
}

export function VehiclesScreen({api,t}: {api:Api;t:T}) {
  const [rows,setRows]=useState<Vehicle[]>();
  const [editing,setEditing]=useState<Vehicle|null>();
  const [busy,setBusy]=useState(false);
  useEffect(()=>{api<Vehicle[]>('vehicles/').then(setRows).catch(()=>{});},[api]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const body:Record<string,unknown>=Object.fromEntries(f);body.mileage=Number(body.mileage||0);body.year=body.year?Number(body.year):null;try{await api(`vehicles/${editing?`${editing.id}/`:''}`,editing?'PATCH':'POST',body);setRows(await api<Vehicle[]>('vehicles/'));setEditing(undefined);}catch{}finally{setBusy(false);}}
  return <><div className="portal-heading"><div><h1>{t('vehicles')}</h1></div><button className="button button-primary" onClick={()=>setEditing(null)}>＋ {t('newVehicle')}</button></div>
    {editing!==undefined&&<form method="post" key={editing?.id||'new'} onSubmit={submit} className="portal-card"><h2>{editing?t('edit'):t('newVehicle')}</h2><div className="portal-form-grid">
      {['code','plate_number','type','model'].map(k=><Field key={k} label={t(k)}><input name={k} required={k!=='model'} defaultValue={String(editing?.[k as keyof Vehicle]||'')}/></Field>)}
      <Field label={t('year')}><input name="year" type="number" min={1900} max={2100} defaultValue={editing?.year||''}/></Field><Field label={t('mileage')}><input name="mileage" type="number" min={0} defaultValue={editing?.mileage||0}/></Field>
      <Field label={t('status')}><select name="status" defaultValue={editing?.status||'AVAILABLE'}>{(editing?.status==='ON_MISSION'?['AVAILABLE','ON_MISSION','MAINTENANCE']:['AVAILABLE','MAINTENANCE']).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></Field></div><div className="portal-buttons"><button className="button button-primary" disabled={busy}>{busy?t('loading'):t('save')}</button><button type="button" className="button button-secondary" onClick={()=>setEditing(undefined)}>{t('close')}</button></div></form>}
    <div className="portal-card portal-table-wrap">{!rows?t('loading'):!rows.length?t('empty'):<table className="portal-table"><thead><tr>{['code','plate_number','model','status','action'].map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.code}</b></td><td>{r.plate_number}</td><td>{r.model||'—'}</td><td><span className={`portal-badge ${r.status}`}>{t(r.status)}</span></td><td><button className="button button-secondary" onClick={()=>setEditing(r)}>{t('edit')}</button></td></tr>)}</tbody></table>}</div>
  </>;
}

