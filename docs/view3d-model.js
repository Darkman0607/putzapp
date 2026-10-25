/* U07/U08 – deterministic offline 3D projection of the existing 2D room geometry. */
(function(root,factory){'use strict';const api=factory();root.Putzmanager3DModel=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 const RAD=Math.PI/180;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const defaults=()=>({yaw:-37,tilt:53,zoom:1,panX:0,panY:0});
 const safeCamera=(v={})=>({yaw:Number.isFinite(v.yaw)?((v.yaw%360)+360)%360:323,tilt:clamp(Number(v.tilt)||53,20,78),zoom:clamp(Number(v.zoom)||1,.5,3),panX:clamp(Number(v.panX)||0,-280,280),panY:clamp(Number(v.panY)||0,-250,250)});
 function baseProjection(p,yaw,tilt){
  const a=yaw*RAD,t=tilt*RAD;
  const x=p[0]*Math.cos(a)-p[1]*Math.sin(a);
  const depth=p[0]*Math.sin(a)+p[1]*Math.cos(a);
  return [x,depth*Math.sin(t)-p[2]*Math.cos(t),depth*Math.cos(t)+p[2]*Math.sin(t)];
 }
 function cameraFor(floor,camera,width=760,height=560){
  const cam=safeCamera(camera),points=[...(floor.rooms||[]).flatMap(r=>r.points||[]),...(floor.outline||[])].filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
  const points3=points.length?points.flatMap(p=>[[p[0],p[1],0],[p[0],p[1],145]]):[[0,0,0],[200,150,145]];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const mx=xs.length?(Math.min(...xs)+Math.max(...xs))/2:0,my=ys.length?(Math.min(...ys)+Math.max(...ys))/2:0;
  const mapped=points3.map(p=>baseProjection([p[0]-mx,p[1]-my,p[2]],cam.yaw,cam.tilt));
  const minX=Math.min(...mapped.map(p=>p[0])),maxX=Math.max(...mapped.map(p=>p[0]));
  const minY=Math.min(...mapped.map(p=>p[1])),maxY=Math.max(...mapped.map(p=>p[1]));
  const scale=Math.min((width-92)/Math.max(maxX-minX,50),(height-105)/Math.max(maxY-minY,50))*cam.zoom;
  const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
  return {camera:cam,center:[mx,my],scale,width,height,project(x,y,z=0){const q=baseProjection([x-mx,y-my,z],cam.yaw,cam.tilt);return [width/2+(q[0]-centerX)*scale+cam.panX,height/2+(q[1]-centerY)*scale+cam.panY,q[2]];}};
 }
 function solidWallPieces(w,openings,openingSpan){
  const ids=(openings||[]).filter(o=>o.wallId===w.id).map(o=>{
   const s=openingSpan(o,w),start=clamp(((s.a[0]-w.a[0])*(w.b[0]-w.a[0])+(s.a[1]-w.a[1])*(w.b[1]-w.a[1]))/(w.length*w.length),0,1);
   const end=clamp(((s.b[0]-w.a[0])*(w.b[0]-w.a[0])+(s.b[1]-w.a[1])*(w.b[1]-w.a[1]))/(w.length*w.length),0,1);
   return {from:Math.min(start,end),to:Math.max(start,end),kind:o.kind};
  }).sort((a,b)=>a.from-b.from);
  const pieces=[];let at=0;
  const add=(from,to,fromZ,toZ,kind)=>{if(to-from>0.002&&toZ-fromZ>1)pieces.push({wallId:w.id,from,to,fromZ,toZ,kind});};
  for(const o of ids){if(o.from<at)continue;add(at,o.from,0,145,'wall');
   if(o.kind==='window'){add(o.from,o.to,0,48,'window-sill');add(o.from,o.to,111,145,'window-lintel');}
   else add(o.from,o.to,115,145,'door-lintel');
   at=o.to;
  }
  add(at,1,0,145,'wall');return pieces;
 }
 function pointOnWall(w,t){return [w.a[0]+(w.b[0]-w.a[0])*t,w.a[1]+(w.b[1]-w.a[1])*t];}
 function projectedWallFace(w,piece,project){const a=pointOnWall(w,piece.from),b=pointOnWall(w,piece.to);return [project(a[0],a[1],piece.fromZ),project(b[0],b[1],piece.fromZ),project(b[0],b[1],piece.toZ),project(a[0],a[1],piece.toZ)];}
 function projectedRoom(points,project){return points.map(p=>project(p[0],p[1],0));}
 const polygonPoints=pts=>pts.map(p=>`${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
 return Object.freeze({defaults,safeCamera,baseProjection,cameraFor,solidWallPieces,pointOnWall,projectedWallFace,projectedRoom,polygonPoints});
});
