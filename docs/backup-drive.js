/* Mein Putzmanager V1.4.0.6: opt-in, manual Google Drive full backup. No account tokens are persisted. */
(()=>{'use strict';
const M=window.PutzmanagerBackupModel, $=q=>document.querySelector(q);
if(!M||!$('#backup-panel'))return;
const FOLDER='Mein Putzmanager Backups', SCOPE='https://www.googleapis.com/auth/drive.file';
const CLIENT_KEY='mein-putzmanager-drive-client-id';
const MR_KEY='mr_hausservice_google_client_v194';
const VALID_ID=/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;
const MAX=M.MAX_BYTES;
let token='',expire=0,busy=false,folderId='',googleClient=null;
const status=msg=>{$('#backup-status').textContent=msg;};
function setBusy(value){busy=value;for(const id of ['backup-client-save','backup-connect','backup-disconnect','backup-drive-upload','backup-drive-list','backup-local-export','backup-local-import']){const n=$('#'+id);if(n)n.disabled=busy;} }
function localClient(){try{return localStorage.getItem(CLIENT_KEY)||localStorage.getItem(MR_KEY)||'';}catch{return '';}}
$('#backup-client-id').value=localClient();
const clientId=()=>$('#backup-client-id').value.trim();
const isLive=()=>Boolean(token&&Date.now()<expire-60000);
function saveClient(){const id=clientId();if(!VALID_ID.test(id))throw Error('Ungültige Google-OAuth-Client-ID für Webanwendungen.');localStorage.setItem(CLIENT_KEY,id);googleClient=null;token='';expire=0;folderId='';$('#backup-account').textContent='Nicht verbunden';status('Client-ID gespeichert. Jetzt mit Google verbinden.');}
function showError(error){status('⚠ '+(error?.message||String(error)));}
function loadGis(){if(window.google?.accounts?.oauth2)return Promise.resolve();return new Promise((resolve,reject)=>{
 let s=document.querySelector('script[data-putzmanager-google]');if(s?.dataset.state==='failed'){s.remove();s=null;}if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',()=>reject(Error('Google-Anmeldung nicht erreichbar.')),{once:true});return;}
 s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.dataset.putzmanagerGoogle='1';s.onload=resolve;s.onerror=()=>{s.dataset.state='failed';s.remove();reject(Error('Google-Anmeldung konnte nicht geladen werden. Internet und Browser prüfen.'));};document.head.append(s);
 });}
function requestToken(){return new Promise((resolve,reject)=>{
 try{
  googleClient=google.accounts.oauth2.initTokenClient({client_id:clientId(),scope:SCOPE,callback:r=>{
   if(r.error)return reject(Error(r.error_description||r.error));token=r.access_token;expire=Date.now()+Math.max(60,Number(r.expires_in)||3600)*1000;
   $('#backup-account').textContent='✓ Mit Google Drive verbunden (diese Sitzung)';resolve(token);
  },error_callback:e=>reject(Error(e?.message||e?.type||'Google-Anmeldung abgebrochen'))});
  googleClient.requestAccessToken({prompt:'consent'});
 }catch(e){reject(e);}
 });}
async function connect(){if(busy)return;setBusy(true);try{
 if(!VALID_ID.test(clientId()))throw Error('Bitte zuerst die Google-OAuth-Client-ID eintragen.');
 if(location.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(location.hostname))throw Error('Google-Anmeldung benötigt HTTPS. Öffne die GitHub-Pages-App.');
 if(localStorage.getItem(CLIENT_KEY)!==clientId())saveClient();
 await loadGis();await requestToken();status('Google verbunden. Du kannst jetzt Sicherungen hochladen oder auswählen.');
 }catch(e){showError(e);}finally{setBusy(false);}}
function disconnect(){if(token&&window.google?.accounts?.oauth2)try{google.accounts.oauth2.revoke(token,()=>{});}catch{}
 token='';expire=0;folderId='';googleClient=null;$('#backup-account').textContent='Nicht verbunden';$('#backup-drive-files').replaceChildren();status('Google-Verbindung getrennt. Keine Anmeldedaten gespeichert.');}
async function driveFetch(url,opts={}){
 if(!isLive())throw Error('Google-Sitzung abgelaufen. Bitte erneut verbinden.');
 const headers=new Headers(opts.headers||{});headers.set('Authorization','Bearer '+token);
 const response=await fetch(url,{...opts,headers});if(!response.ok){let detail='';try{const body=await response.json();detail=body?.error?.message||'';}catch{}
 if([401,403].includes(response.status)){token='';expire=0;$('#backup-account').textContent='Nicht verbunden';}
 throw Error('Google Drive '+response.status+(detail?': '+detail:''));}
 return response;
}
async function driveJson(url,opts){return (await driveFetch(url,opts)).json();}
const queryString=values=>'https://www.googleapis.com/drive/v3/files?'+new URLSearchParams(values);
function escapeDriveQuery(s){return String(s).replaceAll('\\','\\\\').replaceAll("'","\\'");}
async function findFolder(create=false){
 if(folderId)return folderId;
 const q=`name = '${escapeDriveQuery(FOLDER)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
 const result=await driveJson(queryString({q,fields:'nextPageToken,files(id,name,createdTime)',pageSize:'100',spaces:'drive'}));
 if(result.files?.length){folderId=result.files[0].id;return folderId;}
 if(!create)return '';
 const made=await driveJson('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FOLDER,mimeType:'application/vnd.google-apps.folder'})});
 if(!made.id)throw Error('Drive-Ordner konnte nicht erstellt werden.');folderId=made.id;return folderId;
}
function filename(){const iso=new Date().toISOString().replace(/[:.]/g,'-');return 'Mein_Putzmanager_'+iso+'.json';}
async function makePayload(){
 const photos=await window.PutzmanagerPhotos.snapshot();
 return M.make(localStorage,window.PutzmanagerBeta?.version||'1.4.0.9',new Date().toISOString(),photos);
}
async function makeFile(){const payload=await makePayload();const file=new File([JSON.stringify(payload)],filename(),{type:'application/json'});if(file.size>MAX)throw Error('Sicherung überschreitet 256 MB.');return file;}
function downloadFile(file){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
async function localExport(){if(busy)return;setBusy(true);try{const file=await makeFile();downloadFile(file);status('Lokale Sicherung erstellt: '+file.name+'. Bitte die Datei sicher aufbewahren.');}catch(e){showError(e);}finally{setBusy(false);}}
async function uploadResumable(file,meta){
 const response=await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime',{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json','X-Upload-Content-Length':String(file.size)},body:JSON.stringify(meta)});
 const locationUrl=response.headers.get('Location');if(!locationUrl||!locationUrl.startsWith('https://www.googleapis.com/'))throw Error('Google Drive hat keine gültige Upload-Adresse zurückgegeben.');
 return (await driveFetch(locationUrl,{method:'PUT',headers:{'Content-Type':'application/json'},body:file})).json();
}
async function upload(){if(busy)return;setBusy(true);try{
 if(!isLive())throw Error('Bitte zuerst mit Google verbinden.');
 status('Erstelle Sicherung inklusive Raumdaten, Lager, Fotos und Zeitverlauf …');const file=await makeFile();const folder=await findFolder(true);
 status('Lade '+(file.size/1024/1024).toFixed(2)+' MB auf Google Drive …');
 const result=await uploadResumable(file,{name:file.name,mimeType:'application/json',parents:[folder],description:'Mein Putzmanager vollständige manuelle App-Sicherung'});
 if(!result.id)throw Error('Keine Google-Bestätigung für den Upload erhalten.');
 status('✓ Google Drive hat die vollständige Sicherung inklusive Reinigungsfotos bestätigt: '+result.name+'. Bitte abends das Datum in der Drive-Liste prüfen.');await refreshFiles(true);
 }catch(e){showError(e);}finally{setBusy(false);}}
async function listFiles(){const parent=await findFolder(false);if(!parent)return [];
 let next='',files=[];do{const q=`'${escapeDriveQuery(parent)}' in parents and trashed = false`;
 const params={q,fields:'nextPageToken,files(id,name,mimeType,size,createdTime)',pageSize:'100',spaces:'drive'};if(next)params.pageToken=next;
 const page=await driveJson(queryString(params));files.push(...(page.files||[]));next=page.nextPageToken||'';
 }while(next&&files.length<1000);
 return files.filter(f=>f.mimeType==='application/json'&&/^Mein_Putzmanager_.*\.json$/.test(f.name)).sort((a,b)=>String(b.createdTime).localeCompare(String(a.createdTime)));
}
async function refreshFiles(internal=false){if(!internal&&busy)return;if(!internal)setBusy(true);
 try{
  if(!isLive())throw Error('Bitte zuerst mit Google verbinden.');
  const files=await listFiles(),wrap=$('#backup-drive-files');wrap.replaceChildren();
  if(!files.length){const p=document.createElement('p');p.textContent='Noch keine Cloud-Sicherungen vorhanden.';wrap.append(p);}
  for(const file of files){const card=document.createElement('div');card.className='backup-file';
   const label=document.createElement('strong');label.textContent=file.name;const sub=document.createElement('small');sub.textContent=(file.createdTime?new Date(file.createdTime).toLocaleString('de-AT'):'Datum unbekannt')+' · '+(Number(file.size||0)/1024).toFixed(0)+' KB';
   const load=document.createElement('button');load.type='button';load.className='outline-button';load.textContent='Diese Sicherung laden';load.addEventListener('click',()=>restoreFromDrive(file));
   card.append(label,sub,load);wrap.append(card);
  }
  if(!internal)status(files.length+' Drive-Sicherung(en) gefunden.');
 }catch(e){showError(e);}finally{if(!internal)setBusy(false);}}
async function storeRecovery(payload){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window))return reject(Error('Sicherheitskopie nicht möglich: IndexedDB ist nicht verfügbar.'));
 let req;try{req=indexedDB.open('mein-putzmanager-recovery-v1',1);}catch(e){reject(e);return;}
 req.onupgradeneeded=()=>req.result.createObjectStore('checkpoints',{keyPath:'id'});
 req.onerror=()=>reject(Error('Sicherheitskopie konnte nicht geöffnet werden.'));
 req.onsuccess=()=>{const db=req.result;let tx;try{tx=db.transaction('checkpoints','readwrite');tx.objectStore('checkpoints').put({id:'before-restore',at:new Date().toISOString(),payload});}catch(e){db.close();reject(e);return;}
 tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(Error('Sicherheitskopie konnte nicht gespeichert werden.'));};tx.onabort=()=>{db.close();reject(Error('Sicherheitskopie abgebrochen.'));};};
 });}
async function readRecovery(){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window))return reject(Error('IndexedDB nicht verfügbar.'));
 const req=indexedDB.open('mein-putzmanager-recovery-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('checkpoints',{keyPath:'id'});
 req.onerror=()=>reject(Error('Wiederherstellungspunkt nicht verfügbar.'));
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('checkpoints','readonly'),get=tx.objectStore('checkpoints').get('before-restore');get.onsuccess=()=>{db.close();resolve(get.result?.payload||null);};get.onerror=()=>{db.close();reject(Error('Wiederherstellungspunkt nicht lesbar.'));};};
 });}
function summary(pack){const x=M.counts(pack.data,pack.photos);return `Sicherung vom ${new Date(pack.exportedAt).toLocaleString('de-AT')}\nVersion: ${pack.appVersion}\n${x.floors} Etagen, ${x.rooms} Räume, ${x.inventory} Lagerartikel, ${x.photos} Artikelfotos, ${x.cleaningPhotos} Reinigungen mit Fotos, ${x.sessions} Sitzungen, ${x.roomHistory} Raum-Reinigungseinträge.`;}
async function confirmRestore(pack){await M.validate(pack);
 const current=M.snapshot(localStorage);const summaryCurrent=M.counts(current);
 if(!window.confirm(summary(pack)+'\n\nAuf diesem Gerät: '+summaryCurrent.rooms+' Räume und '+summaryCurrent.inventory+' Lagerartikel.\n\nALLE aktuellen Putzmanager-Daten werden ersetzt. Zuerst wird eine lokale Sicherheitskopie erzeugt.\n\nWirklich wiederherstellen?')){status('Wiederherstellung abgebrochen.');return false;}
 const prior=await makePayload();
 await storeRecovery(prior);
 try{
  // Legacy schema 1 keeps photos in the old localStorage key; migration on reload.
  await window.PutzmanagerPhotos.replace(pack.schema===2?pack.photos:[]);
  M.restore(localStorage,pack);
 }catch(err){
  try{M.restore(localStorage,prior);await window.PutzmanagerPhotos.replace(prior.photos);}catch(rollback){throw Error('Wiederherstellung fehlgeschlagen; automatische Rücksetzung unvollständig: '+rollback.message);}
  throw Error('Wiederherstellung abgebrochen; vorherige Daten wiederhergestellt: '+err.message);
 }
 status('✓ Sicherung wiederhergestellt. App wird neu geladen.');location.reload();return true;
}
async function restoreFromDrive(file){if(busy)return;setBusy(true);try{
 if(!isLive())throw Error('Google-Anmeldung abgelaufen.');if(Number(file.size)>MAX)throw Error('Sicherung ist zu groß.');
 status('Lade Sicherung aus Google Drive und überprüfe Integrität …');
 const r=await driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media');
 const text=await r.text();if(M.byteSize(text)>MAX)throw Error('Sicherungsdatei ist zu groß.');
 await confirmRestore(JSON.parse(text));
 }catch(e){showError(e);}finally{setBusy(false);}}
async function localImport(event){const file=event.target.files?.[0];event.target.value='';if(!file||busy)return;setBusy(true);
 try{if(file.size>MAX)throw Error('Datei ist zu groß.');const text=await file.text();await confirmRestore(JSON.parse(text));}catch(e){showError(e);}finally{setBusy(false);}}
async function recover(){if(busy)return;setBusy(true);try{const pack=await readRecovery();if(!pack)throw Error('Es gibt noch keine Sicherheitskopie vor einer Wiederherstellung.');
 await M.validate(pack);if(!confirm('Vorherige lokale Daten wiederherstellen? Der aktuelle Datenstand wird zuvor wiederum gesichert.'))return;
 const current=await makePayload();await storeRecovery(current);
 try{await window.PutzmanagerPhotos.replace(pack.schema===2?pack.photos:[]);M.restore(localStorage,pack);}
 catch(err){try{M.restore(localStorage,current);await window.PutzmanagerPhotos.replace(current.photos);}catch(rollback){throw Error('Rücksetzung fehlgeschlagen: '+rollback.message);}throw err;}
 status('✓ Frühere Daten geladen. App wird neu gestartet.');location.reload();
 }catch(e){showError(e);}finally{setBusy(false);}}
$('#backup-client-save').addEventListener('click',()=>{try{saveClient();}catch(e){showError(e);}});
$('#backup-connect').addEventListener('click',connect);
$('#backup-disconnect').addEventListener('click',disconnect);
$('#backup-drive-upload').addEventListener('click',upload);
$('#backup-drive-list').addEventListener('click',()=>refreshFiles(false));
$('#backup-local-export').addEventListener('click',localExport);
$('#backup-local-import').addEventListener('click',()=>$('#backup-import-input').click());
$('#backup-import-input').addEventListener('change',localImport);
$('#backup-recovery').addEventListener('click',recover);
$('#backup-account').textContent='Nicht verbunden · Google-Anmeldung optional';
if(location.protocol==='https:')loadGis().catch(()=>{});
window.PutzmanagerDriveBackup={snapshot:()=>M.snapshot(localStorage),isLive,disconnect};
})();
