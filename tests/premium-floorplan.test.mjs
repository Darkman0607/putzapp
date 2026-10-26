import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('premium apartment is wired into root and docs, including offline cache',()=>{
 for(const path of ['floorplan-premium.css','floorplan-premium.js'])assert.equal(read(path),read('docs/'+path));
 const html=read('index.html'),sw=read('sw.js');
 for(const asset of ['floorplan-premium.css','floorplan-premium.js']){assert(html.includes('./'+asset));assert(sw.includes("APP_PATH+'"+asset+"'"));}
 assert(html.indexOf('editor.js')<html.indexOf('floorplan-premium.js'),'renderer must execute after room editor');
 assert(sw.includes('mein-putzmanager-v1.4.0.16'));
});
test('2D preview decorates real polygon groups rather than a static background',()=>{
 const js=read('floorplan-premium.js');
 for(const feature of ['PutzmanagerEditor','api.get()','home.activeFloor','floor.rooms.forEach','room.points','data-home-room','clipPath','pm-room-label','MutationObserver'])assert(js.includes(feature),feature);
 assert(js.includes("'pointer-events':'none'"));
 assert(!js.includes('background-image: url'),'no fixed screenshot replacing editable geometry');
});
test('all original room input and cleaning pathways survive',()=>{
 const ed=read('editor.js');
 for(const fn of ['renderHome()','attachRoomEvents(g,f.id,r.id)','GEO.walls(f.rooms)','showDetail','showQuick','openDetails:showDetail'])assert(ed.includes(fn),fn);
 const js=read('floorplan-premium.js');
 assert(!js.includes('localStorage.clear('));
 assert(!js.includes('removeEventListener('));
});
