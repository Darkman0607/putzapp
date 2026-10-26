import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ed=readFileSync(new URL('../editor.js', import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
test('Tap waits for click event, not pointerup, to avoid immediate backdrop dismissal',()=>{
 assert.match(ed, /const release=e=>\{if\(!press\|\|press\.pointerId!==e\.pointerId\)return;clearTimeout\(press\.timer\);press=null;\};/);
 assert.match(ed, /node\.addEventListener\('click',e=>\{if\(Date\.now\(\)<blockClickUntil\)return;showDetail\(floorId,roomId\);\}\)/);
 assert.match(ed, /dialogOpenedAt=Date\.now\(\)/);
 assert.match(ed, /Date\.now\(\)-dialogOpenedAt>=650/);
});
test('Keyboard accessibility and long-press quick menu remain available',()=>{
 assert.match(ed,/node\.addEventListener\('keydown'/);
 assert.match(ed,/showQuick\(floorId,roomId\)/);
 assert.match(ed,/attachRoomEvents\(g,f\.id,r\.id\)/);
 assert(html.includes('1.4.0.16'));
 assert.equal(readFileSync(new URL('../docs/editor.js',import.meta.url),'utf8'),ed);
});
