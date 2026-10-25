/* V1.4.0.4 — U07/U08: 3D room cleaning from the unchanged 2D data model. */
(()=>{'use strict';
 const M=window.Putzmanager3DModel,G=window.PutzmanagerGeometry,C=window.PutzmanagerClean,T=window.PutzmanagerTasks,E=window.PutzmanagerEditor;
 if(!M||!G||!C||!E)return;
 const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
 const node=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n;};
 const svg=(tag,attr)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attr||{}))n.setAttribute(k,String(v));return n;};
 const b=(id,label,fn,klass)=>{const n=node('button',klass,label);n.id=id;n.type='button';n.addEventListener('click',fn);return n;};
 const choice=$('#floorplan-view-choice'),two=$('#floorplan-view-2d'),three=$('#floorplan-view-3d'),root=$('#home-3d-preview'),old=$('#home-floorplan-preview');
 if(!root||!choice)return;
 let showing3d=false,selected=null,cam=M.defaults(),activeFloor=null,gesture=new Map(),dragged=false,longTimer=null,longTriggered=false,down=null,renderPending=false;
 const home=()=>E.get();const getFloor=()=>{const h=home();return h.floors.find(f=>f.id===activeFloor)||h.floors.find(f=>f.id===h.activeFloor)||h.floors[0];};
 const selectedRoom=()=>{const f=getFloor();return f?.rooms.find(r=>r.id===selected)||null;};
 const score=r=>C.roomScore(r.cleanliness);
 function show3d(value){showing3d=Boolean(value);if(!showing3d)activeFloor=null;sync();if(showing3d)render();}
 function sync(){const h=home(),hasRooms=h.floors.some(f=>f.rooms.length>0);choice.hidden=!hasRooms;two.setAttribute('aria-pressed',String(!showing3d));three.setAttribute('aria-pressed',String(showing3d));root.hidden=!showing3d||!hasRooms;old.hidden=showing3d||!h.floors.some(f=>f.rooms.length||f.outline.length>=3);}
 function changeFloor(id){const h=home(),f=h.floors.find(f=>f.id===id);if(!f)return;activeFloor=id;selected=null;E.setActiveFloor?.(id);reset();}
 function reset(){cam=M.defaults();render();}
 function schedule(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;if(showing3d)render();});}
 function render(){sync();if(!showing3d||root.hidden)return;
  const h=home(),f=getFloor();if(!f)return;
  if(selected&&!f.rooms.some(r=>r.id===selected))selected=null;
  root.replaceChildren();const top=node('div','view3d-top'),title=node('strong','',`🏠 3D-Reinigung · ${f.name}`);top.append(title);
  if(h.floors.length>1){const levels=node('select');levels.id='view3d-floor';levels.setAttribute('aria-label','3D-Etage');for(const fl of h.floors){const opt=node('option','',fl.name);opt.value=fl.id;opt.selected=fl.id===f.id;levels.append(opt);}levels.addEventListener('change',()=>changeFloor(levels.value));top.append(levels);}root.append(top);
  if(!f.rooms.length){root.append(node('div','view3d-fallback','Diese Ebene hat noch keine Räume. Wechsle die Etage oder zeichne sie im 2D-Editor.'));return;}
  const shell=node('div','view3d-scene-wrap'),canvas=svg('svg',{id:'view3d-scene',class:'view3d-scene',viewBox:'0 0 760 560',role:'group',tabindex:'0','aria-label':'Dreidimensionale Wohnungsansicht. Mit Finger drehen oder Raum antippen, um Details zu öffnen.'});
  canvas.append(svg('ellipse',{cx:380,cy:460,rx:320,ry:70,fill:'#050e15',opacity:'.32'}));
  const proj=M.cameraFor(f,cam),project=proj.project;
  const big=f.rooms.length>35||f.rooms.reduce((n,r)=>n+r.points.length,0)>320;
  // Painter's order: floors from a single ground plane, walls from unique shared physical edges.
  const layers=[];
  for(const r of f.rooms){const pts=M.projectedRoom(r.points,project),depth=pts.reduce((n,p)=>n+p[2],0)/pts.length,n=score(r);
   layers.push({depth,kind:'floor',room:r,pts,score:n});}
  layers.sort((a,b)=>a.depth-b.depth);
  for(const entry of layers){const r=entry.room,g=svg('g',{'data-3d-room':r.id,tabindex:0,role:'button','aria-selected':String(selected===r.id),'aria-label':`${r.name}, geschätzte Sauberkeit ${entry.score} Prozent. Antippen: Raumdetails.`});
   const floor=svg('polygon',{points:M.polygonPoints(entry.pts),fill:C.stateColor(entry.score),'fill-opacity':'.90',stroke:'#c8eae4','stroke-width':2.2,'stroke-linejoin':'round'});g.append(floor);canvas.append(g);}
  const walls=G.walls(f.rooms),wallShapes=[];
  if(!big){for(const w of walls){const pieces=M.solidWallPieces(w,f.openings||[],G.openingSpan);
   for(const piece of pieces){const pts=M.projectedWallFace(w,piece,project);const depth=pts.reduce((n,p)=>n+p[2],0)/pts.length;wallShapes.push({pts,depth,kind:piece.kind,shared:w.owners.length>1});}
  }}
  // Wall segments are purely visual; don't steal hit tests from room floors.
  wallShapes.sort((a,b)=>a.depth-b.depth);
  for(const v of wallShapes)canvas.append(svg('polygon',{points:M.polygonPoints(v.pts),fill:v.kind==='door-lintel'?'#c5d0c9':v.kind==='window-sill'?'#759ea7':v.kind==='window-lintel'?'#8fd1dc':v.shared?'#819c96':'#b8d2c6',stroke:'#233f45','stroke-width':1,opacity:'.87','pointer-events':'none'}));
  if(big){for(const w of walls){const a=project(w.a[0],w.a[1]),z=project(w.b[0],w.b[1]);canvas.append(svg('line',{x1:a[0],y1:a[1],x2:z[0],y2:z[1],stroke:'#e1f5eb','stroke-width':2.4,'pointer-events':'none'}));}}
  // Text never intercepts room taps. Large scenes omit long labels for responsiveness.
  for(const entry of layers){if(big&&layers.length>45&&selected!==entry.room.id)continue;
   const r=entry.room,avg=r.points.reduce((v,p)=>[v[0]+p[0],v[1]+p[1]],[0,0]).map(v=>v/r.points.length),p=project(avg[0],avg[1],3);
   if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
   const name=svg('text',{x:p[0],y:p[1]-8,'font-size':big?15:18,'text-anchor':'middle',fill:'#fff','font-weight':750,'paint-order':'stroke',stroke:'#0b2430','stroke-width':4,'pointer-events':'none'});name.textContent=r.name.slice(0,big?11:17);canvas.append(name);
   const val=svg('text',{x:p[0],y:p[1]+18,'font-size':big?17:21,'text-anchor':'middle',fill:'#fff','font-weight':820,'paint-order':'stroke',stroke:'#0b2430','stroke-width':4,'pointer-events':'none'});val.textContent=entry.score+' %';canvas.append(val);
  }
  root.onpointerdown=onDown;root.onpointermove=onMove;root.onpointerup=onUp;root.onpointercancel=onCancel;
  canvas.addEventListener('wheel',e=>{e.preventDefault();cam.zoom=Math.max(.5,Math.min(3,cam.zoom*(e.deltaY>0?.9:1.1)));schedule();},{passive:false});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();const id=e.target.closest('[data-3d-room]')?.getAttribute('data-3d-room');if(id){selected=id;window.PutzmanagerEditor?.openQuick?.(f.id,id);}});
  canvas.addEventListener('keydown',e=>{const id=e.target.closest('[data-3d-room]')?.getAttribute('data-3d-room');if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(id,true);}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cam.yaw+=(e.key==='ArrowLeft'?-15:15);schedule();}});
  shell.append(canvas);root.append(shell);
  const tools=node('div','view3d-tools');tools.setAttribute('aria-label','3D-Kamera steuern');tools.append(b('view3d-left','↶ Drehen',()=>{cam.yaw-=20;render();}),b('view3d-right','↷ Drehen',()=>{cam.yaw+=20;render();}),b('view3d-zoom-in','＋',()=>{cam.zoom=Math.min(cam.zoom*1.2,3);render();}),b('view3d-zoom-out','－',()=>{cam.zoom=Math.max(cam.zoom/1.2,.5);render();}),b('view3d-reset','⛶ Reset',reset));root.append(tools);
  const status=node('div','view3d-status');status.id='view3d-status';const r=selectedRoom();if(r){const head=node('div','view3d-status-head');head.append(node('strong','',r.name));const span=node('span','view3d-score',score(r)+' %');span.style.background=C.stateColor(score(r));head.append(span);status.append(head);
   status.append(node('p','view3d-hint',`${T.allTasks(r).length} Aufgaben · Ansicht ist schreibgeschützt; nur die Schaltflächen ändern Daten.`));
   const actions=node('div','view3d-actions');actions.append(b('view3d-quick','⚡ Schnellreinigung',()=>window.PutzmanagerCleaning?.open?.('quick',f.id,r.id)),b('view3d-detail','☑ Detailreinigung',()=>window.PutzmanagerCleaning?.open?.('detail',f.id,r.id)),b('view3d-room-details','Raumdetails',()=>E.openDetails?.(f.id,r.id)),b('view3d-manage','Aufgaben verwalten',()=>window.PutzmanagerCleaning?.open?.('tasks',f.id,r.id)));status.append(actions);
   const quick=node('div','view3d-mini');quick.append(node('span','view3d-hint','Sauberkeit manuell korrigieren:'));for(const value of [25,50,75,100])quick.append(b('view3d-score-'+value,value+' %',()=>{E.updateClean(f.id,r.id,clean=>{clean.override=value;});schedule();}));status.append(quick);
  }else{status.append(node('p','view3d-hint','Tippe einen Raum an, um seine Details und Reinigungsaktionen zu öffnen. Die Farben zeigen die geschätzte Sauberkeit.'));}
  root.append(status);
  const legend=node('div','view3d-legend');for(const [n,label] of [[20,'0–34 %'],[50,'35–64 %'],[75,'65–84 %'],[95,'85–100 %']]){const s=node('span');const d=node('i');d.style.background=C.stateColor(n);s.append(d,document.createTextNode(label));legend.append(s);}root.append(legend);
  root.append(node('p','view3d-help','Ein Finger: 360° drehen · Zwei Finger: zoomen/verschieben · Tippen: Raumdetails · Keine Änderungen am Grundriss. '+(big?'Großer Grundriss: vereinfachte Wände für flüssige Bedienung.':'Tür- und Fensteröffnungen aus dem 2D-Grundriss übernommen.')));
  root.append(b('view3d-edit','✏️ Grundriss im 2D-Editor bearbeiten',()=>E.open?.(),'outline-button view3d-edit'));
  function choose(id,details=false){if(!f.rooms.some(r=>r.id===id))return;selected=id;render();if(details)E.openDetails?.(f.id,id);}
  function clearLong(){if(longTimer!==null){clearTimeout(longTimer);longTimer=null;}}
  function onDown(e){if(!e.target.closest?.('#view3d-scene')||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();root.setPointerCapture(e.pointerId);gesture.set(e.pointerId,{x:e.clientX,y:e.clientY});down={id:e.target.closest('[data-3d-room]')?.getAttribute('data-3d-room'),startX:e.clientX,startY:e.clientY};dragged=false;longTriggered=false;clearLong();if(gesture.size===1&&down.id){longTimer=setTimeout(()=>{if(!dragged&&gesture.size===1){longTriggered=true;selected=down.id;E.openQuick?.(f.id,down.id);}},600);}}
  function onMove(e){if(!gesture.has(e.pointerId))return;e.preventDefault();const old=gesture.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;gesture.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.size===1){if(Math.hypot(e.clientX-down.startX,e.clientY-down.startY)>9){dragged=true;clearLong();}if(dragged){cam.yaw+=dx*.38;cam.tilt=Math.max(20,Math.min(78,cam.tilt+dy*.18));schedule();}}else if(gesture.size===2){dragged=true;clearLong();const points=[...gesture.values()];const dist=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
   const orig=gesture.get(e.pointerId);const before=points.map(p=>p===orig?old:p);const dBefore=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y);if(dBefore>5)cam.zoom=Math.max(.5,Math.min(3,cam.zoom*dist/dBefore));cam.panX=Math.max(-280,Math.min(280,cam.panX+dx*.7));cam.panY=Math.max(-250,Math.min(250,cam.panY+dy*.7));schedule();}}
  function onUp(e){if(!gesture.has(e.pointerId))return;clearLong();const id=down?.id,wasDrag=dragged;gesture.delete(e.pointerId);if(!gesture.size&&id&&!wasDrag&&!longTriggered)choose(id,true);if(!gesture.size){down=null;dragged=false;}}
  function onCancel(e){clearLong();gesture.delete(e.pointerId);dragged=true;}
 }
 two.addEventListener('click',()=>show3d(false));three.addEventListener('click',()=>show3d(true));
 document.addEventListener('putzmanager:homechange',()=>{sync();if(showing3d)schedule();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&showing3d)schedule();});
 sync();window.Putzmanager3D={show:()=>show3d(true),hide:()=>show3d(false),refresh:render,isVisible:()=>showing3d};
})();
