import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const f=path=>fs.readFileSync(new URL('../'+path,import.meta.url));
test('reference floorplan: materials exist offline and root/docs match',()=>{
 for(const kind of ['wood','tile','stone','slate']){
  const file=`assets/floor-${kind}.png`;
  assert(f(file).equals(f('docs/'+file)),file);
  assert(f('sw.js').toString().includes(`APP_PATH+'${file}'`),file+' offline');
 }
});
test('reference design: photos are not falsely asserted; editor polygon data stays interactive',()=>{
 const renderer=f('floorplan-premium.js').toString();
 for(const s of ['floor.rooms.forEach','room.points','data-home-room','clipPath','MutationObserver','pm-room-label','pm-shadow','openingSpan'])assert(renderer.includes(s),s);
 assert(renderer.includes("'pointer-events':'none'"));
 assert(!renderer.includes('localStorage.clear'));
});
test('reference design: version and home CSS installed into both publishing directories',()=>{
 for(const file of ['home-reference.css','index.html','manifest.webmanifest','sw.js'])assert(f(file).equals(f('docs/'+file)),file);
 const html=f('index.html').toString(),sw=f('sw.js').toString();
 assert(html.includes('home-reference.css')&&sw.includes("APP_PATH+'home-reference.css'"));
 assert(sw.includes('mein-putzmanager-v1.4.0.16'));
});
