import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import M from '../backup-model.js';
const mock=(init={})=>({values:{...init},getItem(k){return Object.hasOwn(this.values,k)?this.values[k]:null;},setItem(k,v){this.values[k]=String(v);},removeItem(k){delete this.values[k];}});
const d=()=>({home:{floors:[{rooms:[{name:'Küche'}]}],history:[{id:'a'}]},sessions:[{id:'b'}]});
test('backup captures all present app keys incl local inline photos and never OAuth credentials',async()=>{
 const storage=mock({'mein-putzmanager-beta-v1':JSON.stringify(d()),'mein-putzmanager-inventory-v1':JSON.stringify({items:[{name:'Handschuh',photos:['data:image/jpeg;base64,TEST']}]}),'mein-putzmanager-material-mode':'after','mein-putzmanager-room-timers-v1':'{}','mr_hausservice_google_client_v194':'MRCLIENT','mein-putzmanager-drive-client-id':'CLIENT','unrelated':'PRIVATE'});
 const backup=await M.make(storage);
 assert.equal(Object.keys(backup.data).length,4);assert.equal(M.counts(backup.data).photos,1);
 assert(!JSON.stringify(backup).includes('MRCLIENT'));assert(!JSON.stringify(backup).includes('CLIENT'));assert(!JSON.stringify(backup).includes('PRIVATE'));
 assert.equal(backup.sha256.length,64);await M.validate(backup);
});
test('restore replaces all owned keys but leaves unrelated values unchanged',async()=>{
 const storage=mock({'mein-putzmanager-beta-v1':JSON.stringify(d()),'mein-putzmanager-room-timers-v1':'{}'});
 const file=await M.make(storage);const dest=mock({'mein-putzmanager-beta-v1':'{}','mein-putzmanager-inventory-v1':'{}','unrelated':'ok','mein-putzmanager-drive-client-id':'CLIENT'});
 M.restore(dest,await M.validate(file));assert.equal(dest.getItem('mein-putzmanager-inventory-v1'),null);assert.equal(dest.getItem('mein-putzmanager-beta-v1'),storage.getItem('mein-putzmanager-beta-v1'));assert.equal(dest.getItem('unrelated'),'ok');assert.equal(dest.getItem('mein-putzmanager-drive-client-id'),'CLIENT');
});
test('invalid files, unknown data keys and tampered photos are rejected',async()=>{
 const file=await M.make(mock({'mein-putzmanager-beta-v1':JSON.stringify(d())}));
 await assert.rejects(()=>M.validate({...file,data:{...file.data,'foreign-credentials':'password'}}),/Nicht erlaubter/);
 const changed=structuredClone(file);changed.data['mein-putzmanager-beta-v1']='{}';await assert.rejects(()=>M.validate(changed),/Integrität/);
 await assert.rejects(()=>M.validate({...file,format:'mr-hausservice'}),/keine kompatible/);
 await assert.rejects(()=>M.validate({...file,data:{}}),/Hauptdaten/);
});
test('transactional storage failure triggers rollback',async()=>{
 const old=JSON.stringify(d());const storage=mock({'mein-putzmanager-beta-v1':old,'mein-putzmanager-inventory-v1':'{}'});
 const file=await M.make(mock({'mein-putzmanager-beta-v1':'{"new":true}'}));let fail=true;
 const rawSet=storage.setItem.bind(storage);storage.setItem=function(k,v){if(fail&&k==='mein-putzmanager-beta-v1'){fail=false;throw Error('quota reached');}return rawSet(k,v);};
 assert.throws(()=>M.restore(storage,file),/zurückgesetzt/);assert.equal(storage.getItem('mein-putzmanager-beta-v1'),old);assert.equal(storage.getItem('mein-putzmanager-inventory-v1'),'{}');
});
test('no data is ever erased from other apps; rejects corrupted JSON',async()=>{
 const storage=mock({'mein-putzmanager-beta-v1':JSON.stringify(d()),'MY-BANK':'confidential'});const b=await M.make(storage);
 assert(!Object.keys(b.data).some(x=>x==='MY-BANK'));const broken=structuredClone(b);broken.data['mein-putzmanager-beta-v1']='{';
 const {sha256,...body}=broken;broken.sha256=await M.digest(JSON.stringify(body));await assert.rejects(()=>M.validate(broken),/Beschädigte JSON/);
});
test('offline shell, selectors and GitHub docs mirror',()=>{
 const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const html=read('index.html'),sw=read('sw.js');
 for(const id of ['backup-panel','backup-client-id','backup-connect','backup-disconnect','backup-drive-upload','backup-drive-list','backup-drive-files','backup-local-export','backup-local-import','backup-recovery'])assert(html.includes('id="'+id+'"'));
 for(const path of ['backup-model.js','backup-drive.js','backup-drive.css']){assert(sw.includes(path));assert.equal(read(path),read('docs/'+path));}
 assert(html.indexOf('backup-model.js')<html.indexOf('backup-drive.js'));assert(sw.includes("mein-putzmanager-v1.4.0.15"));
 assert(read('backup-drive.js').includes('https://www.googleapis.com/auth/drive.file'));
});
