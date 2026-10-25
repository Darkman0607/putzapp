/* U02 | V1.0.1 — Wohnungsanlage / Touch-Grundriss-Editor. Keine fremden Daten. */
(() => {
  'use strict';
  const API = window.PutzmanagerBeta;
  const svgNS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const el = (name, attrs = {}, text) => {
    const n = document.createElement(name);
    Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v));
    if(text !== undefined) n.textContent=text;
    return n;
  };
  const svgEl = (name, attrs = {}) => {
    const n = document.createElementNS(svgNS,name);
    Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,String(v)));
    return n;
  };
  const uid = () => crypto?.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clone = x => structuredClone(x);
  const fresh = () => ({kind:'wohnung', floors:[{id:uid(),name:'Ebene 1',outline:[],rooms:[]}],activeFloor:null});
  const within = (v,min,max) => Math.min(max,Math.max(min,v));
  const validPoint = p => Array.isArray(p) && p.length===2 && p.every(v=>Number.isFinite(v) && Math.abs(v)<20000);
  function sanitize(input) {
    if (!input || !Array.isArray(input.floors)) return fresh();
    const floors=input.floors.slice(0,12).map(f => ({
      id:typeof f.id==='string'?f.id:uid(), name:String(f.name??'Ebene').slice(0,50),
      outline:Array.isArray(f.outline)?f.outline.filter(validPoint).slice(0,80):[],
      rooms:(Array.isArray(f.rooms)?f.rooms:[]).slice(0,80).map(r=>({
        id:typeof r.id==='string'?r.id:uid(), name:String(r.name??'Raum').slice(0,55),
        points:(Array.isArray(r.points)?r.points:[]).filter(validPoint).slice(0,80)
      })).filter(r=>r.points.length>=3)
    }));
    if(!floors.length) floors.push(fresh().floors[0]);
    return {kind:input.kind==='haus'?'haus':'wohnung',floors,activeFloor:floors.some(f=>f.id===input.activeFloor)?input.activeFloor:floors[0].id};
  }
  let home=sanitize(API.getHome());
  let selected=null, method='room', drawing=null, view={x:0,y:0,w:1000,h:720};
  let past=[],future=[],gesture=null, pointers=new Map(), beforeGesture=null;
  const currentFloor=()=>home.floors.find(f=>f.id===home.activeFloor)??home.floors[0];
  const findRoom=()=>currentFloor().rooms.find(r=>r.id===selected);
  const snap = v => Math.round(v/10)*10; // Sichtbares Raster, noch keine gemeinsame Wandgeometrie (U03)
  function commit(previous) {
    if(JSON.stringify(previous)===JSON.stringify(home))return;
    past.push(previous);if(past.length>70)past.shift();future=[];
    API.saveHome(clone(home));refresh();
  }
  function mutate(fn){const before=clone(home);fn();commit(before);}
  function undo(){if(!past.length)return;future.push(clone(home));home=past.pop();selected=null;drawing=null;API.saveHome(clone(home));refresh();}
  function redo(){if(!future.length)return;past.push(clone(home));home=future.pop();selected=null;drawing=null;API.saveHome(clone(home));refresh();}
  function fit(){view={x:0,y:0,w:1000,h:720};draw();}
  function zoom(factor){const cx=view.x+view.w/2,cy=view.y+view.h/2;view.w=within(view.w*factor,150,2400);view.h=view.w*.72;view.x=cx-view.w/2;view.y=cy-view.h/2;draw();}
  function world(event){const svg=$('#drawing-canvas'),point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());return [local.x,local.y];}
  function grid(svg){
    const g=svgEl('g',{'pointer-events':'none'}),minor=40;
    for(let x=Math.floor(view.x/minor)*minor;x<view.x+view.w;x+=minor)g.append(svgEl('line',{x1:x,x2:x,y1:view.y,y2:view.y+view.h,stroke:'#304e56','stroke-width':1,opacity:.45}));
    for(let y=Math.floor(view.y/minor)*minor;y<view.y+view.h;y+=minor)g.append(svgEl('line',{y1:y,y2:y,x1:view.x,x2:view.x+view.w,stroke:'#304e56','stroke-width':1,opacity:.45}));
    svg.append(g);
  }
  const path = pts=>pts.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')+' Z';
  function roomLabel(room){const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]);return [(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];}
  function draw() {
    const canvas=$('#drawing-canvas'); if(!canvas)return;
    canvas.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);canvas.replaceChildren();grid(canvas);
    const floor=currentFloor();
    if(floor.outline.length>=3) canvas.append(svgEl('path',{d:path(floor.outline),fill:'#1c3139',stroke:'#beddd8','stroke-width':8,'stroke-linejoin':'round','data-target':'outline'}));
    for(const room of floor.rooms){
      const sel=room.id===selected;
      canvas.append(svgEl('path',{d:path(room.points),fill:sel?'#147d72':'#24534e','fill-opacity':sel?.82:.62,stroke:sel?'#75ffe1':'#28beab','stroke-width':sel?8:5,'stroke-linejoin':'round','data-room':room.id}));
      const [x,y]=roomLabel(room);
      const label=svgEl('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle',fill:'#f4fffd','font-size':29,'font-weight':700,'pointer-events':'none'});
      label.textContent=room.name;canvas.append(label);
      if(sel){room.points.forEach((p,i)=>{
        // Touch hit area deliberately larger than the visible handle.
        canvas.append(svgEl('circle',{cx:p[0],cy:p[1],r:21,fill:'#e2fff7',stroke:'#068e77','stroke-width':5,'data-handle':i,'data-room':room.id}));
      });}
    }
    if(drawing){
      const pts=drawing.points;if(pts.length){
        canvas.append(svgEl('polyline',{points:pts.map(p=>p.join(',')).join(' '),stroke:'#f9d376','stroke-width':7,fill:'none','stroke-dasharray':'14 10','pointer-events':'none'}));
        pts.forEach(p=>canvas.append(svgEl('circle',{cx:p[0],cy:p[1],r:10,fill:'#f9d376','pointer-events':'none'})));
      }
    }
    $('#editor-undo').disabled=!past.length;$('#editor-redo').disabled=!future.length;
    $('#editor-complete').hidden=!drawing;
    $('#editor-drawing-hint').textContent=drawing?'Setze mindestens 3 Eckpunkte durch Tippen. Danach „Form schließen“. Zwei Finger bewegen/zoomen.':'Raum antippen zum Auswählen; ziehen zum Verschieben; helle Eckpunkte ziehen zum Anpassen. Freie Fläche mit einem Finger verschieben, mit zwei Fingern zoomen.';
    const r=findRoom();$('#editor-selection').classList.toggle('editor-selection-empty',!r);
    if(r){$('#editor-selected-name').value=r.name;$('#editor-selected-caption').textContent=`${r.points.length} Eckpunkte · Position und Form bearbeitbar`;} 
    $('#editor-level-picker').hidden=home.floors.length===1;
    $('#editor-level-name').textContent=currentFloor().name;
    $('#editor-kind').value=home.kind;
    $('#editor-method').value=method;
    $('#editor-floor-count').textContent=`${home.floors.length} ${home.floors.length===1?'Ebene':'Ebenen'}`;
    $('#editor-rooms-count').textContent=`${floor.rooms.length} ${floor.rooms.length===1?'Raum':'Räume'}`;
  }
  function refresh(){draw();renderHome();}
  function startDrawing(type){drawing={type,points:[]};selected=null;draw();}
  function finishDrawing(){
    if(!drawing)return;
    const points=drawing.points;
    if(points.length<3){alert('Mindestens drei Eckpunkte notwendig.');return;}
    // Reject zero-area outlines and self-intersecting paths; geometry editing is deliberately simple in U02.
    const area=Math.abs(points.reduce((sum,p,i)=>sum+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0)/2);
    if(area<1500){alert('Die Form ist zu klein oder liegt auf einer Linie.');return;}
    const type=drawing.type;drawing=null;
    mutate(()=>{if(type==='outline') currentFloor().outline=clone(points);else {
      const name=$('#editor-new-room').value.trim().slice(0,55)||`Raum ${currentFloor().rooms.length+1}`;
      const room={id:uid(),name,points:clone(points)};currentFloor().rooms.push(room);selected=room.id;
    }});
  }
  function center(){return [view.x+view.w/2,view.y+view.h/2];}
  function addPreset(){
    const type=$('#editor-room-shape').value;
    if(type==='frei'){startDrawing('room');return;}
    const [cx,cy]=center();let points;
    if(type==='l')points=[[cx-125,cy-90],[cx+125,cy-90],[cx+125,cy-15],[cx+20,cy-15],[cx+20,cy+90],[cx-125,cy+90]];
    else points=[[cx-125,cy-85],[cx+125,cy-85],[cx+125,cy+85],[cx-125,cy+85]];
    const name=$('#editor-new-room').value.trim().slice(0,55)||`Raum ${currentFloor().rooms.length+1}`;
    mutate(()=>{const r={id:uid(),name,points};currentFloor().rooms.push(r);selected=r.id;});
  }
  function renderHome(){
    const preview=$('#home-floorplan-preview'),empty=$('#floorplan-empty'),art=$('#floorplan-art');
    const hasData=home.floors.some(f=>f.rooms.length || f.outline.length>=3);
    empty.hidden=hasData;art.hidden=hasData;preview.hidden=!hasData;
    if(!hasData)return;
    const f=currentFloor();
    preview.replaceChildren();
    const tag=el('div',{class:'home-map-caption'},`${home.kind==='haus'?'Haus':'Wohnung'} · ${f.name} · ${f.rooms.length} Räume`);preview.append(tag);
    const svg=svgEl('svg',{viewBox:'-70 -55 1140 830',role:'img','aria-label':`Grundriss ${f.name}; Raumzustände folgen in V1.0.3`});
    if(f.outline.length>=3)svg.append(svgEl('path',{d:path(f.outline),fill:'#193138',stroke:'#c1e7de','stroke-width':9}));
    for(const r of f.rooms){svg.append(svgEl('path',{d:path(r.points),fill:'#17645b','fill-opacity':.7,stroke:'#31d3b7','stroke-width':5}));const [x,y]=roomLabel(r);const txt=svgEl('text',{x,y,fill:'#fff','font-size':28,'font-weight':700,'text-anchor':'middle','dominant-baseline':'middle'});txt.textContent=r.name;svg.append(txt);}
    preview.append(svg);
    const editButton=el('button',{id:'home-edit-plan',type:'button',class:'outline-button'},'✏️ Grundriss bearbeiten');editButton.addEventListener('click',open);preview.append(editButton);
    preview.append(el('p',{class:'home-map-foot'},'Grundriss gespeichert · Sauberkeitsanzeige folgt in V1.0.3'));
  }
  function open(){
    home=sanitize(API.getHome());selected=null;drawing=null;past=[];future=[];fit();
    $('#editor-overlay').hidden=false;document.body.classList.add('editing-plan');draw();
    $('#editor-close').focus();
  }
  function close(){if(gesture)gesture=null; pointers.clear();drawing=null;$('#editor-overlay').hidden=true;document.body.classList.remove('editing-plan');renderHome();$('#setup-home').focus();}
  const canvas=$('#drawing-canvas');
  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){gesture={type:'pinch',initial:[...pointers.values()],start:clone(view)};return;}
    if(pointers.size!==1)return;
    const room=e.target.closest('[data-room]')?.getAttribute('data-room');
    const handle=e.target.closest('[data-handle]')?.getAttribute('data-handle');
    const [x,y]=world(e);
    if(drawing){gesture={type:'tap',screen:[e.clientX,e.clientY],at:[x,y]};return;}
    beforeGesture=clone(home);
    if(room){selected=room;gesture={type:handle!=null?'handle':'room',room,handle:Number(handle),origin:[x,y],start:clone(findRoom()?.points)};draw();}
    else{selected=null;gesture={type:'pan',screen:[e.clientX,e.clientY],start:clone(view)};draw();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(!gesture)return;
    const bounds=canvas.getBoundingClientRect();
    if(gesture.type==='pinch'&&pointers.size>=2){
      const [a,b]=[...pointers.values()],old=gesture.initial;
      const dist=(v,w)=>Math.hypot(v.x-w.x,v.y-w.y);
      const factor=dist(old[0],old[1])/Math.max(15,dist(a,b));
      const oldCenter=[(old[0].x+old[1].x)/2,(old[0].y+old[1].y)/2],nowCenter=[(a.x+b.x)/2,(a.y+b.y)/2];
      const s=gesture.start,w=within(s.w*factor,150,2400),h=w*.72;
      view={w,h,x:s.x+(oldCenter[0]-bounds.left)/bounds.width*s.w-(nowCenter[0]-bounds.left)/bounds.width*w,y:s.y+(oldCenter[1]-bounds.top)/bounds.height*s.h-(nowCenter[1]-bounds.top)/bounds.height*h};draw();return;
    }
    if(gesture.type==='pan'){
      view={...gesture.start,x:gesture.start.x-(e.clientX-gesture.screen[0])*gesture.start.w/bounds.width,y:gesture.start.y-(e.clientY-gesture.screen[1])*gesture.start.h/bounds.height};draw();return;
    }
    if(gesture.type==='room'||gesture.type==='handle'){
      const room=currentFloor().rooms.find(r=>r.id===gesture.room);if(!room||!gesture.start)return;
      const [x,y]=world(e),dx=x-gesture.origin[0],dy=y-gesture.origin[1];
      room.points=gesture.start.map((p,i)=>gesture.type==='room'?[snap(p[0]+dx),snap(p[1]+dy)]:i===gesture.handle?[snap(p[0]+dx),snap(p[1]+dy)]:p);
      draw();return;
    }
  });
  function end(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(gesture?.type==='tap'&&pointers.size===0){const dx=Math.abs(e.clientX-gesture.screen[0]),dy=Math.abs(e.clientY-gesture.screen[1]);if(dx+dy<18)drawing.points.push(gesture.at.map(snap));}
    if((gesture?.type==='room'||gesture?.type==='handle')&&pointers.size===0){commit(beforeGesture);}
    if(pointers.size===0)gesture=null;
    else if(gesture?.type==='pinch'){ const remaining=[...pointers.values()][0];gesture={type:'pan',screen:[remaining.x,remaining.y],start:clone(view)}; }
    draw();
  }
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  $('#editor-close').addEventListener('click',close);
  $('#editor-undo').addEventListener('click',undo);$('#editor-redo').addEventListener('click',redo);
  $('#editor-zoom-in').addEventListener('click',()=>zoom(.8));$('#editor-zoom-out').addEventListener('click',()=>zoom(1.25));
  $('#editor-fit').addEventListener('click',fit);
  $('#editor-new-outline').addEventListener('click',()=>startDrawing('outline'));
  $('#editor-complete').addEventListener('click',finishDrawing);
  $('#editor-cancel-draw').addEventListener('click',()=>{drawing=null;draw();});
  $('#editor-add-room').addEventListener('click',addPreset);
  $('#editor-selected-name').addEventListener('change',e=>{if(!findRoom())return;const name=e.target.value.trim();if(!name){e.target.value=findRoom().name;return;}mutate(()=>{findRoom().name=name.slice(0,55);});});
  $('#editor-delete-room').addEventListener('click',()=>{const r=findRoom();if(!r)return;if(!confirm(`Raum „${r.name}“ wirklich löschen?`))return;mutate(()=>{currentFloor().rooms=currentFloor().rooms.filter(a=>a.id!==r.id);selected=null;});});
  $('#editor-kind').addEventListener('change',e=>mutate(()=>{home.kind=e.target.value==='haus'?'haus':'wohnung';}));
  $('#editor-add-floor').addEventListener('click',()=>{const name=prompt('Name der neuen Ebene',`Ebene ${home.floors.length+1}`);if(name===null)return;if(home.floors.length>=12){alert('Maximal 12 Ebenen.');return;}mutate(()=>{const f={id:uid(),name:name.trim().slice(0,50)||`Ebene ${home.floors.length+1}`,outline:[],rooms:[]};home.floors.push(f);home.activeFloor=f.id;selected=null;fit();});});
  $('#editor-rename-floor').addEventListener('click',()=>{const f=currentFloor(),name=prompt('Ebene umbenennen',f.name);if(name===null||!name.trim())return;mutate(()=>{f.name=name.trim().slice(0,50);});});
  $('#editor-remove-floor').addEventListener('click',()=>{if(home.floors.length<=1){alert('Mindestens eine Ebene ist erforderlich.');return;}if(!confirm(`Ebene „${currentFloor().name}“ mit allen Räumen löschen?`))return;mutate(()=>{home.floors=home.floors.filter(f=>f.id!==home.activeFloor);home.activeFloor=home.floors[0].id;selected=null;});});
  $('#editor-floor-prev').addEventListener('click',()=>cycleFloor(-1));$('#editor-floor-next').addEventListener('click',()=>cycleFloor(1));
  function cycleFloor(step){const i=home.floors.findIndex(f=>f.id===home.activeFloor);home.activeFloor=home.floors[(i+step+home.floors.length)%home.floors.length].id;selected=null;drawing=null;API.saveHome(clone(home));draw();renderHome();}
  $('#editor-method').addEventListener('change',e=>{method=e.target.value; if(method==='outline')startDrawing('outline');else {drawing=null;draw();}});
  window.addEventListener('keydown',e=>{
    if($('#editor-overlay').hidden)return;
    if(e.key==='Escape'){if(drawing){drawing=null;draw();}else close();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
  });
  window.PutzmanagerEditor={open,renderHome,get:()=>clone(home)};
  renderHome();
})();
