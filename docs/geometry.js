/* V1.0.2 / U03 – shared physical wall segments and measurement model.
 * No framework, network calls, or migrations of cleaning-session data. */
(function(root){
'use strict';
const EPS=1e-5,round=n=>Math.round(n*1000)/1000;
const same=(a,b)=>Math.abs(a[0]-b[0])<EPS&&Math.abs(a[1]-b[1])<EPS;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const between=(v,a,b)=>v>=Math.min(a,b)-EPS&&v<=Math.max(a,b)+EPS;
const on=(p,a,b)=>Math.abs(cross(a,b,p))<EPS && between(p[0],a[0],b[0]) && between(p[1],a[1],b[1]);
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const projection=(p,a,b)=>((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/Math.max(EPS,length(a,b)**2);
const keyPoint=p=>`${round(p[0])},${round(p[1])}`;
const wallKey=(a,b)=>[keyPoint(a),keyPoint(b)].sort().join('~');
const segments=(room)=>room.points.map((a,i)=>({a,b:room.points[(i+1)%room.points.length],roomId:room.id,edgeIndex:i}));
function walls(rooms){
  const edges=rooms.flatMap(segments), map=new Map();
  for(const e of edges){
    if(length(e.a,e.b)<EPS)continue;
    const divisions=[0,1];
    for(const other of edges){for(const p of [other.a,other.b])if(on(p,e.a,e.b)){const t=projection(p,e.a,e.b);if(t>EPS&&t<1-EPS)divisions.push(t);}}
    const uniq=[...new Set(divisions.map(round))].sort((a,b)=>a-b);
    for(let i=0;i<uniq.length-1;i++){
      const interpolate=t=>[round(e.a[0]+(e.b[0]-e.a[0])*t),round(e.a[1]+(e.b[1]-e.a[1])*t)];
      const a=interpolate(uniq[i]),b=interpolate(uniq[i+1]);if(length(a,b)<EPS)continue;
      const id=wallKey(a,b);if(!map.has(id))map.set(id,{id,a,b,owners:[],length:length(a,b),axis:Math.abs(a[0]-b[0])<EPS?'v':Math.abs(a[1]-b[1])<EPS?'h':'free'});
      const wall=map.get(id);if(!wall.owners.some(o=>o.roomId===e.roomId&&o.edgeIndex===e.edgeIndex))wall.owners.push({roomId:e.roomId,edgeIndex:e.edgeIndex});
    }
  }
  return [...map.values()];
}
function pointIn(poly,p){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if(on(p,a,b))return 0;
  if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?1:-1;
}
function strictlyCross(a,b,c,d){
 const v=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];return v[0]*v[1]<-EPS && v[2]*v[3]<-EPS;
}
function overlaps(polyA,polyB){
 if(polyA.length<3||polyB.length<3)return false;
 const aX=polyA.map(p=>p[0]),bX=polyB.map(p=>p[0]),aY=polyA.map(p=>p[1]),bY=polyB.map(p=>p[1]);
 if(Math.min(...aX)>=Math.max(...bX)-EPS||Math.min(...bX)>=Math.max(...aX)-EPS||Math.min(...aY)>=Math.max(...bY)-EPS||Math.min(...bY)>=Math.max(...aY)-EPS)return false;
 for(let i=0;i<polyA.length;i++)for(let j=0;j<polyB.length;j++)if(strictlyCross(polyA[i],polyA[(i+1)%polyA.length],polyB[j],polyB[(j+1)%polyB.length]))return true;
 // Cell sampling catches containment and orthogonal L-shapes without mistaking a shared wall for overlap.
 const xs=[...new Set([...aX,...bX])].sort((a,b)=>a-b),ys=[...new Set([...aY,...bY])].sort((a,b)=>a-b);
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
  const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;
  if(pointIn(polyA,[x,y])===1 && pointIn(polyB,[x,y])===1)return true;
 }return false;
}
function validPolygon(points){
 if(!Array.isArray(points)||points.length<3)return false;
 let area=0;for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(length(a,b)<.1)return false;
  area+=a[0]*b[1]-b[0]*a[1];
  for(let j=i+1;j<points.length;j++){
   if(j===i+1||(i===0&&j===points.length-1))continue;
   if(strictlyCross(a,b,points[j],points[(j+1)%points.length]))return false;
  }
 }return Math.abs(area)>500;
}
function collides(rooms,againstId=null){
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
  if(againstId&&rooms[i].id!==againstId&&rooms[j].id!==againstId)continue;
  if(overlaps(rooms[i].points,rooms[j].points))return [rooms[i].name,rooms[j].name];
 }return null;
}
const bbox=p=>({left:Math.min(...p.map(a=>a[0])),top:Math.min(...p.map(a=>a[1])),right:Math.max(...p.map(a=>a[0])),bottom:Math.max(...p.map(a=>a[1]))});
function snapRoom(points,otherRooms,threshold=23){
 const me=bbox(points);let best=null;
 for(const r of otherRooms){const b=bbox(r.points);
  if(Math.min(me.bottom,b.bottom)-Math.max(me.top,b.top)>18){for(const [d,dir] of [[b.right-me.left,'x'],[b.left-me.right,'x']])if(Math.abs(d)<=threshold&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,dir,target:r.id};}
  if(Math.min(me.right,b.right)-Math.max(me.left,b.left)>18){for(const [d,dir] of [[b.bottom-me.top,'y'],[b.top-me.bottom,'y']])if(Math.abs(d)<=threshold&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,dir,target:r.id};}
 }
 if(!best)return {points,snapped:false};
 return {points:points.map(p=>[round(p[0]+(best.dir==='x'?best.d:0)),round(p[1]+(best.dir==='y'?best.d:0))]),snapped:true,guide:best};
}
function newRoomPosition(points,otherRooms){
 if(!otherRooms.some(r=>overlaps(points,r.points)))return points;
 const initial=bbox(points);const options=[];
 for(const r of otherRooms){const b=bbox(r.points);options.push([b.right-initial.left,0],[b.left-initial.right,0],[0,b.bottom-initial.top],[0,b.top-initial.bottom]);}
 for(const [dx,dy] of options){const moved=points.map(p=>[p[0]+dx,p[1]+dy]);if(!otherRooms.some(r=>overlaps(moved,r.points)))return moved;}
 // Search a finite outward ring; never silently create an overlapping room.
 for(let radius=40;radius<=2400;radius+=40)for(const [x,y] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){
  const moved=points.map(p=>[p[0]+x,p[1]+y]);if(!otherRooms.some(r=>overlaps(moved,r.points)))return moved;
 }return null;
}
function moveWall(rooms,wall,delta){
 if(!wall||wall.axis==='free'||!Number.isFinite(delta))return false;
 // Insert vertices at wall endpoints on each owning polygon to support partial shared boundaries.
 for(const owner of wall.owners){const room=rooms.find(r=>r.id===owner.roomId);if(!room)return false;
  for(const anchor of [wall.a,wall.b]){
   if(room.points.some(p=>same(p,anchor)))continue;
   const at=room.points.findIndex((p,i)=>on(anchor,p,room.points[(i+1)%room.points.length]));
   if(at===-1)return false;room.points.splice(at+1,0,[...anchor]);
  }
 }
 const moved=new Set();
 for(const owner of wall.owners){const room=rooms.find(r=>r.id===owner.roomId);
  for(let i=0;i<room.points.length;i++){
   const p=room.points[i];if(!same(p,wall.a)&&!same(p,wall.b))continue;
   const index=owner.roomId+':'+i;if(moved.has(index))continue;moved.add(index);
   if(wall.axis==='v')p[0]=round(p[0]+delta);else p[1]=round(p[1]+delta);
  }
 }return true;
}
function resizeRoom(rooms,id,newWidth,newHeight){
 const r=rooms.find(v=>v.id===id);if(!r)return false;
 const b=bbox(r.points),dw=newWidth==null?0:newWidth-(b.right-b.left),dh=newHeight==null?0:newHeight-(b.bottom-b.top);
 if(Math.abs(dw)<EPS&&Math.abs(dh)<EPS)return true;
 // Move shared boundary edges as one wall, from the lower/right room side. Refuse non-rectangular resizing.
 if(r.points.length!==4||r.points.some((p,i)=>{const next=r.points[(i+1)%4];return Math.abs(p[0]-next[0])>EPS&&Math.abs(p[1]-next[1])>EPS;}))return false;
 for(const [axis,val,delta] of [['v',b.right,dw],['h',b.bottom,dh]]){
  if(Math.abs(delta)<EPS)continue;
  const candidates=walls(rooms).filter(w=>w.axis===axis&&Math.abs((axis==='v'?w.a[0]:w.a[1])-val)<EPS&&w.owners.some(o=>o.roomId===id));
  if(!candidates.length)return false;
  for(const wall of candidates)if(!moveWall(rooms,wall,delta))return false;
 }return true;
}
function wallAfter(oldWall,newWalls){
 if(!oldWall)return null;
 const owners=new Set(oldWall.owners.map(o=>o.roomId));
 const candidates=newWalls.filter(w=>w.axis===oldWall.axis&&w.owners.some(o=>owners.has(o.roomId)));
 const mid=w=>[(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2];
 const oldMid=mid(oldWall);
 return candidates.sort((a,b)=>{
  const score=w=>{const m=mid(w),matching=w.owners.filter(o=>owners.has(o.roomId)).length;return length(m,oldMid)-matching*80;};
  return score(a)-score(b);
 })[0]??null;
}
const openingWidth=(opening,wall)=>Math.min(Math.max(8,Number(opening.width)||60),Math.max(8,wall.length-8));
function openingSpan(opening,wall){
 const w=openingWidth(opening,wall),t=Math.min(1-w/(2*wall.length),Math.max(w/(2*wall.length),Number(opening.t)||.5));
 const p=u=>[wall.a[0]+(wall.b[0]-wall.a[0])*u,wall.a[1]+(wall.b[1]-wall.a[1])*u];
 return {a:p(t-w/(2*wall.length)),b:p(t+w/(2*wall.length)),center:p(t),width:w};
}
root.PutzmanagerGeometry={walls,overlaps,collides,validPolygon,bbox,snapRoom,newRoomPosition,moveWall,resizeRoom,wallAfter,openingSpan,wallKey,on,same,length};
})(typeof window!=='undefined'?window:globalThis);
