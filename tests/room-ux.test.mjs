import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('room bottom sheet is one-handed and retains existing action IDs',()=>{
 const html=read('index.html');const css=read('clean.css');
 for(const id of ['room-detail-title','room-detail-score-num','room-detail-state','room-detail-quick','room-detail-detailed','room-detail-tasks','room-areas-panel','room-score-panel','room-area-add','room-score-save','room-base-save','room-detail-close'])assert(html.includes(`id="${id}"`));
 assert(html.indexOf('id="room-detail-quick"')<html.indexOf('id="room-areas-panel"'));
 assert(html.includes('<details id="room-areas-panel"')&&html.includes('<details id="room-score-panel"'));
 assert(css.includes('room-action-main')&&css.includes('min-height:55px')&&css.includes('env(safe-area-inset-bottom)'));
});
test('same room-detail editing & quick/long-press handlers work for all rooms',()=>{
 const ed=read('editor.js');for(const s of ['attachRoomEvents','showDetail(floorId,roomId)','renderDetail','persistClean','room-detail-score-num','room-area-count','room-score-save','room-base-save','room-detail-quick','room-detail-detailed','room-detail-tasks'])assert(ed.includes(s));
 assert(ed.includes("$('#room-areas-panel').open=false"));
 assert(ed.includes("document.body.classList.remove('room-dialog-open')"));
});
test('updated version metadata, cache and published docs are consistent',()=>{
 for(const p of ['index.html','editor.js','clean.css','app.js','sw.js','manifest.webmanifest'])assert.equal(read(p),read('docs/'+p));
 const html=read('index.html'),sw=read('sw.js');assert(html.includes('BETA 1.4.0.15'));assert(sw.includes('mein-putzmanager-v1.4.0.15'));
 assert(read('app.js').includes("const KEY = 'mein-putzmanager-beta-v1'"));
});
