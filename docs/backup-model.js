/* Mein Putzmanager V1.4.0.6: complete application localStorage snapshot. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PutzmanagerBackupModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FORMAT='mein-putzmanager-full-backup';const SCHEMA=1;
const KNOWN=['mein-putzmanager-beta-v1','mein-putzmanager-inventory-v1','mein-putzmanager-material-mode','mein-putzmanager-room-timers-v1'];
const MAX_BYTES=30*1024*1024;
const allowed=k=>typeof k==='string'&&KNOWN.includes(k);
function snapshot(storage){const data={};for(const key of KNOWN){const value=storage.getItem(key);if(value!==null)data[key]=value;}return data;}
function assertData(data,requireMain=true){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ungültige Sicherungsdaten.');
 for(const [key,value] of Object.entries(data)){
  if(!allowed(key)||typeof value!=='string')throw Error('Nicht erlaubter Backup-Eintrag: '+key);
 }
 if(requireMain&&!Object.hasOwn(data,KNOWN[0]))throw Error('Die App-Hauptdaten fehlen in der Sicherung.');
 for(const key of [KNOWN[0],KNOWN[1],KNOWN[3]])if(Object.hasOwn(data,key)){
  let obj;try{obj=JSON.parse(data[key]);}catch{throw Error('Beschädigte JSON-Daten: '+key);}
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Ungültiger Dateninhalt: '+key);
 }
 if(data[KNOWN[2]]&&!['during','after'].includes(data[KNOWN[2]]))throw Error('Ungültige Materialeinstellung.');
 return data;
}
function byteSize(s){return new TextEncoder().encode(s).length;}
async function digest(content){const bytes=new TextEncoder().encode(content);let result;
 if(typeof crypto!=='undefined'&&crypto.subtle)result=await crypto.subtle.digest('SHA-256',bytes);
 else if(typeof require==='function')return require('node:crypto').createHash('sha256').update(bytes).digest('hex');
 else throw Error('Integritätsprüfung erfordert HTTPS und WebCrypto.');
 return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function make(storage,version='1.4.0.6',date=new Date().toISOString()){
 const data=assertData(snapshot(storage));const body={format:FORMAT,schema:SCHEMA,exportedAt:date,appVersion:version,data};
 const raw=JSON.stringify(body);if(byteSize(raw)>MAX_BYTES)throw Error('Sicherungsdatei zu groß (mehr als 30 MB).');
 return {...body,sha256:await digest(raw)};
}
async function validate(obj){
 if(!obj||obj.format!==FORMAT||obj.schema!==SCHEMA)throw Error('Diese Datei ist keine kompatible Putzmanager-Sicherung.');
 if(typeof obj.exportedAt!=='string'||!Number.isFinite(Date.parse(obj.exportedAt)))throw Error('Sicherungszeitpunkt fehlt.');
 if(typeof obj.appVersion!=='string'||!/^\d+\.\d+\.\d+/.test(obj.appVersion))throw Error('Ungültige App-Version.');
 const body={format:obj.format,schema:obj.schema,exportedAt:obj.exportedAt,appVersion:obj.appVersion,data:obj.data};
 if(byteSize(JSON.stringify(obj))>MAX_BYTES)throw Error('Sicherungsdatei zu groß.');
 assertData(body.data);
 if(typeof obj.sha256!=='string'||!(/^[0-9a-f]{64}$/.test(obj.sha256))||await digest(JSON.stringify(body))!==obj.sha256)throw Error('Die Sicherung hat die Integritätsprüfung nicht bestanden.');
 return obj;
}
function restore(storage,valid){assertData(valid.data);const previous=snapshot(storage);try{
  for(const key of KNOWN)storage.removeItem(key);
  for(const [key,value] of Object.entries(valid.data))storage.setItem(key,value);
 }catch(error){
  try{for(const key of KNOWN)storage.removeItem(key);for(const [key,value] of Object.entries(previous))storage.setItem(key,value);}catch(rollback){throw Error('Wiederherstellung und Rücksetzung fehlgeschlagen: '+rollback.message);}
  throw Error('Wiederherstellung abgebrochen; ursprüngliche Daten wurden zurückgesetzt: '+error.message);
 }
 return previous;
}
function counts(data){let home={},inventory={};try{home=JSON.parse(data[KNOWN[0]]||'{}');}catch{}try{inventory=JSON.parse(data[KNOWN[1]]||'{}');}catch{}
 const floors=Array.isArray(home.home?.floors)?home.home.floors:[];const rooms=floors.reduce((n,f)=>n+(Array.isArray(f.rooms)?f.rooms.length:0),0);
 const items=Array.isArray(inventory.items)?inventory.items.length:0;
 const photos=Array.isArray(inventory.items)?inventory.items.reduce((n,i)=>n+(Array.isArray(i.photos)?i.photos.length:0),0):0;
 return {floors:floors.length,rooms,inventory:items,photos,sessions:Array.isArray(home.sessions)?home.sessions.length:0,roomHistory:Array.isArray(home.home?.history)?home.home.history.length:0,bytes:byteSize(JSON.stringify(data))};
}
return {FORMAT,SCHEMA,KNOWN,MAX_BYTES,allowed,snapshot,assertData,make,validate,restore,counts,byteSize,digest};
});
