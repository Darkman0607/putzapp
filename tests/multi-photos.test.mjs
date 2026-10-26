import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import B from '../backup-model.js';
const image=n=>'data:image/jpeg;base64,'+Buffer.from('bild-'+n).toString('base64');
const sample={id:'r1',at:'2026-10-26T12:40:00Z',roomName:'Küche',beforePhotos:[image(1),image(2),image(3)],afterPhotos:[image(4),image(5)],before:image(1),after:image(4)};
const stored=new Map([['mein-putzmanager-beta-v1',JSON.stringify({home:{floors:[]}})]]);
const storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
test('multiple before and after photos survive full backup and validation',async()=>{
 const packed=await B.make(storage,'1.4.0.17','2026-10-26T13:00:00Z',[sample]);
 const checked=await B.validate(JSON.parse(JSON.stringify(packed)));
 assert.deepEqual(checked.photos[0].beforePhotos,sample.beforePhotos);
 assert.deepEqual(checked.photos[0].afterPhotos,sample.afterPhotos);
 assert.equal(checked.photos[0].before,sample.before);
});
test('legacy one-photo records remain accepted',async()=>{
 const packed=await B.make(storage,'1.4.0.17',undefined,[{id:'old',at:sample.at,roomName:'Küche',before:sample.before,after:null}]);
 assert.equal((await B.validate(packed)).photos[0].before,sample.before);
});
test('backup refuses one corrupt image even if other photos are valid',async()=>{
 await assert.rejects(B.make(storage,'1.4.0.17',undefined,[{...sample,afterPhotos:[image(4),'javascript:evil']}]),/Mehrfachfotos/);
 const packed=await B.make(storage,'1.4.0.17',undefined,[sample]);packed.photos[0].beforePhotos[2]=image(999);
 await assert.rejects(B.validate(packed),/Integrität/);
});
test('real model stores multiple photos, preserves legacy first-frame reader and independent per-image deletion',()=>{
 const model=fs.readFileSync(new URL('../photos.js',import.meta.url),'utf8');
 assert(model.includes("out[key]=photos;out[kind]=photos[0]||null"));
 assert(model.includes('photos.splice(index,1)'));
 assert(model.includes("const req=store.get(id)"));
 assert(model.includes("store.put(updated)"));
 assert(model.includes('beforePhotos'));
 assert(model.includes('afterPhotos'));
 assert(model.includes('PutzmanagerPhotoCompare?.open({...record,'));
});
test('both cleaning modes share multiple-picker and block premature commits',()=>{
 const ui=fs.readFileSync(new URL('../cleaning-ui.js',import.meta.url),'utf8');
 assert(ui.includes('input.multiple=true'));
 assert.equal((ui.match(/addPhotos\(content\)/g)||[]).length,3);
 assert(ui.includes('if(stagedPhotos.processing)'));
 assert(ui.includes('beforePhotos:[...stagedPhotos.before]'));
 assert(ui.includes('afterPhotos:[...stagedPhotos.after]'));
});
