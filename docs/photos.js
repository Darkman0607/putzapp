/* V1.4.0.9: IndexedDB photo gallery. No fixed number of cleaning records.
   Existing V1.4.0.8 localStorage photos migrate without deleting before commit. */
(function(root){'use strict';
const LEGACY='mein-putzmanager-clean-photos-v1', DB='mein-putzmanager-photos-v2', STORE='records';
const MAX_DATA_LENGTH=180000; // size guard PER compressed image, NOT photo-count restriction
let dbPromise=null,migrating=null,renderRequest=0;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Foto-Datenbank nicht lesbar.'));});}
function database(){if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!root.indexedDB){reject(Error('Dein Browser unterstützt keine lokale Foto-Datenbank (IndexedDB).'));return;}
  const r=root.indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('at','at');}};
  r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};
  r.onerror=()=>reject(r.error||Error('Foto-Datenbank konnte nicht geöffnet werden.'));
 });return dbPromise.catch(err=>{dbPromise=null;throw err;});
}
function transaction(mode,action){return database().then(db=>new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;
 try{result=action(store);}catch(err){tx.abort();reject(err);return;}
 tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('Änderung an der Fotogalerie fehlgeschlagen.'));
 tx.onerror=()=>{};
 }));}
function normalized(entry){if(!entry||typeof entry.id!=='string'||!entry.id||typeof entry.at!=='string'||!Number.isFinite(Date.parse(entry.at)))throw Error('Ungültiger Foto-Eintrag.');
 const out={id:entry.id,at:entry.at,roomName:String(entry.roomName||'Raum').slice(0,80),before:entry.before||null,after:entry.after||null};
 for(const k of ['before','after'])if(out[k]!==null&&(typeof out[k]!=='string'||out[k].length>MAX_DATA_LENGTH||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]*={0,2}$/.test(out[k])))throw Error('Ein Foto ist beschädigt oder zu groß.');
 return out;
}
async function migrate(){if(migrating)return migrating;
 migrating=(async()=>{
  const raw=root.localStorage.getItem(LEGACY);if(raw===null)return;
  let records;try{records=JSON.parse(raw);if(!Array.isArray(records))throw Error('Keine Liste');records=records.map(normalized);}catch(err){throw Error('Alte Reinigungsfotos konnten nicht übernommen werden: '+err.message);}
  // Preserve newly saved photos if migration was interrupted before removing old key.
  const existing=await transaction('readonly',s=>request(s.getAll()));
  // Transaction actions must happen synchronously, no async await inside IDB transaction.
  await transaction('readwrite',s=>{for(const record of records)if(!existing.some(x=>x.id===record.id))s.put(record);});
  // Never remove legacy data until IndexedDB transaction succeeded.
  root.localStorage.removeItem(LEGACY);
 })();try{await migrating;}finally{migrating=null;}
}
async function all(){await migrate();const records=await transaction('readonly',s=>request(s.getAll()));return (await records).sort((a,b)=>String(a.at).localeCompare(String(b.at)));}
async function put(entry){await migrate();const record=normalized(entry);if(!record.before&&!record.after)return true;
 await transaction('readwrite',s=>s.put(record));await render();return true;
}
async function remove(id){await migrate();await transaction('readwrite',s=>s.delete(id));await render();}
async function replace(entries){if(!Array.isArray(entries))throw Error('Ungültige Fotoliste.');const safe=entries.map(normalized);
 // Single transaction: either ALL photos replace or NONE; no partial loss on quota failure.
 await transaction('readwrite',s=>{s.clear();for(const e of safe)s.put(e);});
 root.localStorage.removeItem(LEGACY);await render();return true;
}
async function snapshot(){return all();}
const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
async function render(){const box=root.document?.querySelector('#photo-gallery');if(!box)return;
 const requestId=++renderRequest;try{
  const records=(await all()).reverse();if(requestId!==renderRequest)return;
  box.replaceChildren();const c=root.document.querySelector('#photo-gallery-count');if(c)c.textContent=`${records.length} Reinigungen mit Fotos`;
  if(!records.length){box.append(mk('p','room-note','Noch keine Vorher-/Nachher-Fotos gespeichert.'));return;}
  let shown=0;const size=24;
  function appendPage(){const end=Math.min(shown+size,records.length);
   for(;shown<end;shown++){const record=records[shown],card=mk('article','photo-entry');card.append(mk('strong','',record.roomName),mk('small','',new Date(record.at).toLocaleString('de-AT')));
    const grid=mk('div','photo-grid');for(const kind of ['before','after'])if(record[kind]){const figure=mk('figure',''),img=mk('img','');img.src=record[kind];img.alt=(kind==='before'?'Vorher':'Nachher')+' · '+record.roomName;img.loading='lazy';figure.append(img,mk('figcaption','',kind==='before'?'Vorher':'Nachher'));grid.append(figure);}card.append(grid);
    const del=mk('button','room-btn','Fotos dieser Reinigung löschen');del.type='button';del.addEventListener('click',()=>{if(root.confirm('Fotos dieser Reinigung wirklich endgültig löschen?'))remove(record.id).catch(err=>root.alert(err.message));});card.append(del);box.append(card);
   }
   if(shown<records.length){const button=mk('button','outline-button',`Ältere Fotos laden (${records.length-shown} weitere)`);button.type='button';button.addEventListener('click',()=>{button.remove();appendPage();});box.append(button);}
  }
  appendPage();
 }catch(err){if(requestId!==renderRequest)return;box.replaceChildren(mk('p','room-note','⚠ Fotogalerie nicht verfügbar: '+err.message));}
}
function encode(file){return new Promise((resolve,reject)=>{if(!file){resolve(null);return;}
 if(!String(file.type).startsWith('image/')){reject(Error('Bitte eine Bilddatei auswählen.'));return;}
 if(file.size>15*1024*1024){reject(Error('Foto zu groß (maximal 15 MB Originalbild).'));return;}
 const reader=new FileReader();reader.onerror=()=>reject(Error('Foto konnte nicht eingelesen werden.'));
 reader.onload=()=>{const picture=new Image();picture.onerror=()=>reject(Error('Bilddatei konnte nicht verarbeitet werden.'));
 picture.onload=()=>{try{const ratio=Math.min(1,720/Math.max(picture.width,picture.height)),canvas=root.document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.width*ratio));canvas.height=Math.max(1,Math.round(picture.height*ratio));canvas.getContext('2d').drawImage(picture,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.55);if(data.length>MAX_DATA_LENGTH)throw Error('Komprimiertes Foto ist noch zu groß.');resolve(data);}catch(e){reject(e);}};
 picture.src=reader.result;};reader.readAsDataURL(file);
 });}
root.PutzmanagerPhotos={all,snapshot,replace,put,remove,encode,render,migrate};
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>render());else render();}
})(typeof window!=='undefined'?window:globalThis);
