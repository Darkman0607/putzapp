import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const sandbox={};vm.runInNewContext(fs.readFileSync(new URL('../geometry.js',import.meta.url),'utf8'),sandbox);const g=sandbox.PutzmanagerGeometry;
const r=(id,a,b,c,d)=>({id,name:id,points:[[a,b],[c,b],[c,d],[a,d]]});
test('U03-F01 a shared wall is one physical segment and adjusts both polygons',()=>{
 const rooms=[r('a',0,0,100,100),r('b',100,0,200,100)],walls=g.walls(rooms);const shared=walls.filter(w=>w.owners.length===2);assert.equal(shared.length,1);assert.equal(walls.length,7);
 assert(g.moveWall(rooms,shared[0],25));assert(!g.overlaps(rooms[0].points,rooms[1].points));assert(rooms[0].points.some(p=>p[0]===125));assert(rooms[1].points.some(p=>p[0]===125));assert.equal(g.walls(rooms).filter(w=>w.owners.length===2).length,1);
});
test('U03-F01 partial wall support splits long edges on shared wall movement',()=>{
 const rooms=[r('a',0,0,200,200),r('b',200,50,300,150)],shared=g.walls(rooms).find(w=>w.owners.length===2);assert(shared);assert(g.moveWall(rooms,shared,15));assert.equal(g.walls(rooms).filter(w=>w.owners.length===2).length,1);assert(!g.collides(rooms));
});
test('U03-F02 edge snap and no overlapping placement',()=>{
 const first=r('a',100,100,300,300);const second=r('b',311,100,511,300);const snap=g.snapRoom(second.points,[first],20);assert(snap.snapped);assert.equal(Math.min(...snap.points.map(p=>p[0])),300);assert(!g.overlaps(first.points,snap.points));
 const placed=g.newRoomPosition(r('new',100,100,300,300).points,[first]);assert(placed);assert.equal(g.collides([first,{id:'new',name:'neu',points:placed}]),null);
 assert(g.overlaps(first.points,r('bad',200,150,350,270).points));
});
test('U03-F03 rectangular dimension edit changes common boundary',()=>{
 const rooms=[r('a',0,0,100,100),r('b',100,0,200,100)];assert(g.resizeRoom(rooms,'a',120,100));assert.equal(Math.max(...rooms[0].points.map(p=>p[0])),120);assert.equal(Math.min(...rooms[1].points.map(p=>p[0])),120);assert(!g.collides(rooms));
});
test('U03-F04/F05 openings calculate actual wall interruptions and stay within boundaries',()=>{
 const wall=g.walls([r('a',0,0,300,200)]).find(w=>w.length===300);assert(wall);const opening={kind:'door',width:85,t:0.6};const span=g.openingSpan(opening,wall);assert(Math.abs(g.length(span.a,span.b)-85)<1e-6);assert(g.length(wall.a,span.a)>0);assert(g.length(span.b,wall.b)>0);
 const window={kind:'window',width:70,t:.1,height:100};const ws=g.openingSpan(window,wall);assert(g.length(wall.a,ws.a)>=-1e-9);
});
