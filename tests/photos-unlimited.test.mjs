import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import B from '../backup-model.js';
const photo=id=>({id:'rec-'+id,at:new Date(Date.UTC(2026,9,25,8,0,id)).toISOString(),roomName:'Bad',before:'data:image/jpeg;base64,YWJj',after:null});
test('V1.4.0.9 version is consistent in all user-visible metadata and offline cache',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const m=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert(!html.includes('1.4.0.7'));assert(html.includes('BETA 1.4.0.9'));assert(html.includes('Version 1.4.0.9'));
 assert.equal(m.description.includes('V1.4.0.9'),true);assert(app.includes("VERSION = '1.4.0.9'"));assert(sw.includes('mein-putzmanager-v1.4.0.9'));
});
test('photo gallery has no record-count cap in code, legacy validator or new schema',async()=>{
 const code=fs.readFileSync(new URL('../photos.js',import.meta.url),'utf8');
 assert(!code.includes('MAX_ENTRIES'));assert(code.includes('indexedDB'));assert(code.includes('createObjectStore'));assert(code.includes('await migrate()'));
 const images=Array.from({length:125},(_,i)=>photo(i));B.assertPhotos(images);
 const values=new Map([['mein-putzmanager-beta-v1',JSON.stringify({home:{floors:[]}})]]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const pack=await B.make(storage,'1.4.0.9',new Date('2026-10-25T00:00:00Z').toISOString(),images);
 const restored=await B.validate(JSON.parse(JSON.stringify(pack)));
 assert.equal(restored.schema,2);assert.equal(restored.photos.length,125);assert.equal(B.counts(pack.data,pack.photos).cleaningPhotos,125);
});
test('schema 1 Drive backups remain restorable and tampering schema 2 photos invalidates digest',async()=>{
 const legacyPhotos=Array.from({length:30},(_,i)=>photo(i));const values=new Map([['mein-putzmanager-beta-v1','{}'],['mein-putzmanager-clean-photos-v1',JSON.stringify(legacyPhotos)]]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const p=await B.make(storage,'1.4.0.9');
 const legacy={format:p.format,schema:1,exportedAt:p.exportedAt,appVersion:p.appVersion,data:p.data};legacy.sha256=await B.digest(JSON.stringify(legacy));
 assert.equal((await B.validate(legacy)).schema,1);
 const next=await B.make(storage,'1.4.0.9',undefined,legacyPhotos);const tampered=JSON.parse(JSON.stringify(next));tampered.photos[0].roomName='Betrug';
 await assert.rejects(B.validate(tampered),/Integrität/);
});
