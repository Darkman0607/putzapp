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

test('V1.4.0.1 rotate 0, 90, 180 and 360 degrees around room center',()=>{
 const rectangle=r('rect',10,20,210,120),base=rectangle.points;
 for(const d of [0,15,90,180,270,360]){
   const rotated=g.rotatePoints(base,d);
   assert(g.validPolygon(rotated),`polygon invalid after ${d} deg`);
   const center=g.polygonCenter(rotated),orig=g.polygonCenter(base);
   assert(g.length(center,orig)<.01,`center moved after ${d}`);
   const twice=g.rotatePoints(rotated,-d);
   assert(twice.every((p,i)=>g.length(p,base[i])<.01),`round-trip after ${d}`);
 }
 assert.equal(Math.round(g.edgeAngle(g.rotatePoints(base,90))),90);
 assert.equal(Math.round(g.edgeAngle(g.rotatePoints(base,360))),0);
});
test('V1.4.0.1 rotate an L-shape without changing vertex count or area',()=>{
 const l=[[0,0],[240,0],[240,80],[90,80],[90,200],[0,200]];
 const area=poly=>Math.abs(poly.reduce((v,p,i)=>v+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0)/2);
 for(const d of [32,90,179,360]){
  const pts=g.rotatePoints(l,d);
  assert.equal(pts.length,6);assert(g.validPolygon(pts));assert(Math.abs(area(pts)-area(l))<.5);
 }
});
test('V1.4.0.1 rotating only selected rectangle leaves neighbor unchanged and collides safely',()=>{
 const a=r('a',0,0,200,120),b=r('b',200,0,400,120),copy=b.points.map(p=>[...p]);
 a.points=g.rotatePoints(a.points,30);
 assert.deepEqual(b.points,copy);assert(g.collides([a,b]));
 a.points=g.rotatePoints(r('a',0,0,200,120).points,360);
 assert.equal(g.collides([a,b]),null);
});
