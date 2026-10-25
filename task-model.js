/* U05 / V1.0.4: pure task recurrence and cleaning journal; local data only. */
(function(root){
'use strict';
const MAX_HISTORY=500;
const intervals=['none','daily','weekly','custom'];
const validStamp=s=>typeof s==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s) && Number.isFinite(Date.parse(s));
const dateKey=s=>validStamp(s)?new Date(s).toLocaleDateString('sv-SE'):null;
const normDays=n=>Number.isInteger(Number(n)) && Number(n)>=1 && Number(n)<=365 ? Number(n):1;
function normalized(task){
 const src=task&&typeof task==='object'?task:{};
 const interval=intervals.includes(src.interval)?src.interval:'none';
 return {id:typeof src.id==='string'?src.id.slice(0,120):'',text:String(src.text||'').trim().slice(0,90),done:src.done===true,
   interval,customDays:interval==='custom'?normDays(src.customDays):1,
   lastDoneAt:validStamp(src.lastDoneAt)?new Date(src.lastDoneAt).toISOString():null,
   nextDue: /^\d{4}-\d\d-\d\d$/.test(src.nextDue||'')?src.nextDue:null};
}
function nextDue(at, interval, customDays=1){
 if(!validStamp(at)||interval==='none')return null;
 const n=interval==='weekly'?7:interval==='daily'?1:interval==='custom'?normDays(customDays):0;
 if(!n)return null;
 const date=dateKey(at); if(!date)return null;
 const utc=new Date(date+'T12:00:00Z');utc.setUTCDate(utc.getUTCDate()+n);
 return utc.toISOString().slice(0,10);
}
function complete(task,at){const t=normalized(task);if(!validStamp(at))return null;
 t.done=true;t.lastDoneAt=new Date(at).toISOString();t.nextDue=nextDue(t.lastDoneAt,t.interval,t.customDays);return t;
}
function status(task, now=new Date()){
 const t=normalized(task),today=dateKey(now.toISOString());
 if(t.interval==='none')return t.done?'Erledigt':'Offen';
 if(!t.lastDoneAt)return 'Fällig';
 if(t.nextDue && t.nextDue<today)return 'Überfällig';
 if(t.nextDue===today)return 'Heute fällig';
 return t.nextDue?'Nächste Fälligkeit: '+t.nextDue:'Fällig';
}
function allTasks(room){
 const c=room?.cleanliness||{};
 return [ ...(c.tasks||[]).map(t=>({...normalized(t),target:'base',areaName:'Allgemein'})),
 ...(c.areas||[]).flatMap(a=>(a.tasks||[]).map(t=>({...normalized(t),target:a.id,areaName:a.name}))) ];
}
function taskGroups(clean){return [{id:'base',name:'Allgemein / Restflächen',tasks:clean.tasks||[]},...(clean.areas||[]).map(a=>({id:a.id,name:a.name,tasks:a.tasks||[]}))];}
function findGroup(clean,target){return target==='base'?clean:clean.areas.find(a=>a.id===target);}
function upsert(clean,target,raw){const group=findGroup(clean,target);if(!group)return false;
 const item=normalized(raw);if(!item.id||!item.text)return false;
 group.tasks=Array.isArray(group.tasks)?group.tasks:[];
 const index=group.tasks.findIndex(t=>t.id===item.id);
 if(index<0 && group.tasks.length>=30)return false;
 if(index<0)group.tasks.push(item);else group.tasks[index]=item;
 return true;
}
function remove(clean,target,id){const group=findGroup(clean,target);if(!group)return false;const size=group.tasks.length;group.tasks=group.tasks.filter(t=>t.id!==id);return size!==group.tasks.length;}
function sanitizeJournal(raw){return (Array.isArray(raw)?raw:[]).slice(-MAX_HISTORY).filter(e=>e&&typeof e==='object'&&validStamp(e.at)&&typeof e.id==='string'&&typeof e.roomId==='string').map(e=>({
 id:e.id.slice(0,120),at:new Date(e.at).toISOString(),floorId:String(e.floorId||'').slice(0,120),roomId:e.roomId.slice(0,120),roomName:String(e.roomName||'').slice(0,55),mode:e.mode==='detail'?'detail':'quick',
 scope:(Array.isArray(e.scope)?e.scope:[]).slice(0,55).map(a=>({id:String(a.id||'').slice(0,120),name:String(a.name||'').slice(0,55)})),
 tasks:(Array.isArray(e.tasks)?e.tasks:[]).slice(0,100).map(t=>({id:String(t.id||'').slice(0,120),text:String(t.text||'').slice(0,90),target:String(t.target||'').slice(0,120)})),
 notes:String(e.notes||'').slice(0,400),durationSeconds:Number.isFinite(e.durationSeconds)?Math.max(0,Math.floor(e.durationSeconds)):null,scoreBefore:Number.isFinite(e.scoreBefore)?e.scoreBefore:null,scoreAfter:Number.isFinite(e.scoreAfter)?e.scoreAfter:null
 }));}
function record(home, input, cleanApi){
 if(!home||!input||!['quick','detail'].includes(input.mode)||!validStamp(input.at))return null;
 const floor=home.floors?.find(f=>f.id===input.floorId),room=floor?.rooms.find(r=>r.id===input.roomId);if(!room)return null;
 const clean=cleanApi.sanitize(room.cleanliness),prior=cleanApi.roomScore(clean);
 const affected=[],doneTasks=[];
 if(input.mode==='quick'){
  const selection=new Set(Array.isArray(input.targets)?input.targets:[]);
  for(const g of taskGroups(clean))if(selection.has(g.id)){
   if(g.id==='base')clean.base=100;else clean.areas.find(a=>a.id===g.id).score=100;
   affected.push({id:g.id,name:g.name});
  }
 } else {
  const selected=new Set(Array.isArray(input.taskIds)?input.taskIds:[]);
  for(const g of taskGroups(clean)){
   const matches=g.tasks.filter(t=>selected.has(t.id));if(!matches.length)continue;
   for(const t of matches){Object.assign(t,complete(t,input.at));doneTasks.push({id:t.id,text:t.text,target:g.id});}
   if(g.id==='base')clean.base=100;else clean.areas.find(a=>a.id===g.id).score=100;
   affected.push({id:g.id,name:g.name});
  }
 }
 if(!affected.length)return null;
 clean.override=null;
 room.cleanliness=cleanApi.sanitize(clean);
 const entry={id:String(input.id||'').slice(0,120),at:new Date(input.at).toISOString(),floorId:floor.id,roomId:room.id,roomName:room.name,mode:input.mode,scope:affected,tasks:doneTasks,notes:String(input.notes||'').slice(0,400),durationSeconds:Number.isFinite(input.durationSeconds)?Math.max(0,Math.floor(input.durationSeconds)):null,scoreBefore:prior,scoreAfter:cleanApi.roomScore(room.cleanliness)};
 if(!entry.id)return null;
 home.history=sanitizeJournal([...(home.history||[]),entry]);return entry;
}
const api=Object.freeze({normalized,nextDue,complete,status,allTasks,taskGroups,upsert,remove,sanitizeJournal,record,dateKey});
root.PutzmanagerTasks=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
