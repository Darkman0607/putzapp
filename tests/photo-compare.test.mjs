import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('photo comparison script, CSS and mobile controls available and cached offline',()=>{
 const html=read('index.html'),sw=read('sw.js'),js=read('photo-compare.js'),css=read('photo-compare.css');
 for(const name of ['photo-compare.js','photo-compare.css']){
  assert(html.includes(`./${name}`));assert(sw.includes(`APP_PATH+'${name}'`));
  assert.equal(read(name),read('docs/'+name));
 }
 for(const part of ['showModal','Schieberegler','Nebeneinander','pointermove','photo-compare-range','aria-pressed','zoom','record.before','record.after'])assert(js.includes(part));
 for(const part of ['max-height:min(94dvh','overflow:auto','touch-action:none','@media(max-width:390px)'])assert(css.includes(part));
});
test('comparison only on records with both images, with no deletion or AI decision',()=>{
 const photos=read('photos.js'),viewer=read('photo-compare.js');
 assert(photos.includes('if(record.before&&record.after)'));
 assert(photos.includes('PutzmanagerPhotoCompare?.open({...record,'));
 assert(viewer.includes('!record.before||!record.after'));
 assert(!viewer.includes('PutzmanagerPhotos.remove'));
 assert(!viewer.includes('fetch('));
 assert(!viewer.includes('localStorage.'));
 assert(!viewer.includes('indexedDB.'));
});
test('version and backups do not change photo schema or local data keys',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest'));
 assert(html.includes('1.4.0.18'));assert(manifest.description.includes('1.4.0.18'));
 assert(read('photos.js').includes("DB='mein-putzmanager-photos-v2'"));
 assert(read('app.js').includes("KEY = 'mein-putzmanager-beta-v1'"));
 assert(read('backup-model.js').includes('schema:')); // existing backup tests validate supported schemas
});
