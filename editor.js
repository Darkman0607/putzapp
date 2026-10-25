/* U04 | V1.0.3 — interaktive, farbige Wohnungsübersicht mit Raumzuständen. */
(() => {
  'use strict';
  const API = window.PutzmanagerBeta;
  const GEO = window.PutzmanagerGeometry;
  const CLEAN = window.PutzmanagerClean;
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
  const fresh = () => {const id=uid();return {kind:'wohnung', floors:[{id,name:'Ebene 1',outline:[],rooms:[],openings:[],metersPerUnit:null}],activeFloor:id};};
  const within = (v,min,max) => Math.min(max,Math.max(min,v));
  const validPoint = p => Array.isArray(p) && p.length===2 && p.every(v=>Number.isFinite(v) && Math.abs(v)<20000);
  function sanitize(input) {
    if (!input || !Array.isArray(input.floors)) return fresh();
    const floors=input.floors.slice(0,12).map(f => ({
      id:typeof f.id==='string'?f.id:uid(), name:String(f.name??'Ebene').slice(0,50),
      outline:Array.isArray(f.outline)?f.outline.filter(validPoint).slice(0,80):[],
      metersPerUnit:Number.isFinite(f.metersPerUnit)&&f.metersPerUnit>0&&f.metersPerUnit<100?f.metersPerUnit:null,
      openings:(Array.isArray(f.openings)?f.openings:[]).slice(0,160).filter(o=>o&&typeof o.wallId==='string'&&['door','window'].includes(o.kind)).map(o=>({id:typeof o.id==='string'?o.id:uid(),wallId:String(o.wallId).slice(0,100),kind:o.kind,type:String(o.type??'single').slice(0,30),width:within(Number(o.width)||80,8,10000),height:Number.isFinite(o.height)?within(o.height,0,10000):null,t:within(Number(o.t)||.5,0,1),swing:o.swing==='right'?'right':'left'})),
      rooms:(Array.isArray(f.rooms)?f.rooms:[]).slice(0,80).map(r=>({
        id:typeof r.id==='string'?r.id:uid(), name:String(r.name??'Raum').slice(0,55),
        points:(Array.isArray(r.points)?r.points:[]).filter(validPoint).slice(0,80),
        cleanliness:CLEAN.sanitize(r.cleanliness)
      })).filter(r=>r.points.length>=3)
    }));
    if(!floors.length) floors.push(fresh().floors[0]);
    return {kind:input.kind==='haus'?'haus':'wohnung',floors,activeFloor:floors.some(f=>f.id===input.activeFloor)?input.activeFloor:floors[0].id};
  }
  let home=sanitize(API.getHome());
  let selected=null, selectedWall=null, selectedOpening=null, snapGuide=null, warning='', method='room', drawing=null, view={x:0,y:0,w:1000,h:720};
  let past=[],future=[],gesture=null, pointers=new Map(), beforeGesture=null;
  const currentFloor=()=>home.floors.find(f=>f.id===home.activeFloor)??home.floors[0];
  const findRoom=()=>currentFloor().rooms.find(r=>r.id===selected);
  const snap = v => Math.round(v/10)*10;
  const walls=()=>GEO.walls(currentFloor().rooms);
  const wall=()=>walls().find(w=>w.id===selectedWall);
  const opening=()=>currentFloor().openings.find(o=>o.id===selectedOpening);
  function notice(msg){warning=msg;const n=$('#editor-geometry-status');if(n){n.textContent=msg;n.classList.toggle('warn',Boolean(msg));}}
  function connected(roomId,roomList){const adjacency=new Map(roomList.map(r=>[r.id,new Set()]));for(const w of GEO.walls(roomList))if(w.owners.length>1)for(const a of w.owners)for(const b of w.owners)if(a.roomId!==b.roomId)adjacency.get(a.roomId)?.add(b.roomId);const seen=new Set([roomId]),queue=[roomId];for(let i=0;i<queue.length;i++)for(const id of adjacency.get(queue[i])??[])if(!seen.has(id)){seen.add(id);queue.push(id);}return seen;}
  function reconcileOpenings(beforeWalls){const after=walls(),ids=new Set(after.map(w=>w.id));for(const o of currentFloor().openings){if(ids.has(o.wallId))continue;const previous=beforeWalls.find(w=>w.id===o.wallId),next=GEO.wallAfter(previous,after);if(next){o.wallId=next.id;o.width=Math.min(o.width,next.length-8);}else o.invalid=true;}
    currentFloor().openings=currentFloor().openings.filter(o=>!o.invalid);
  }
  function safeChange(fn){const before=clone(home),oldWalls=walls();try{if(fn()===false)throw Error('Diese Änderung ist für diese Raumform nicht möglich.');if(currentFloor().rooms.some(r=>!GEO.validPolygon(r.points)))throw Error('Ungültige Raumform: Wandlänge und Schnittpunkte prüfen.');const conflict=GEO.collides(currentFloor().rooms);if(conflict)throw Error(`Überlappung: ${conflict.join(' und ')}. Bitte Abstand lassen.`);reconcileOpenings(oldWalls);commit(before);notice('');return true;}catch(error){home=before;draw();notice(error.message);return false;}}
  function commit(previous) {
    if(JSON.stringify(previous)===JSON.stringify(home))return;
    past.push(previous);if(past.length>70)past.shift();future=[];
    API.saveHome(clone(home));refresh();
  }
  function mutate(fn){const before=clone(home);fn();commit(before);}
  function undo(){if(!past.length)return;future.push(clone(home));home=past.pop();selected=null;selectedWall=null;selectedOpening=null;drawing=null;API.saveHome(clone(home));refresh();}
  function redo(){if(!future.length)return;past.push(clone(home));home=future.pop();selected=null;selectedWall=null;selectedOpening=null;drawing=null;API.saveHome(clone(home));refresh();}
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
  function renderWallLine(svg,w){
    const taken=currentFloor().openings.filter(o=>o.wallId===w.id).sort((a,b)=>a.t-b.t);
    const dir=[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length];
    const pt=n=>[w.a[0]+dir[0]*n,w.a[1]+dir[1]*n];let cursor=0;
    const solid=(a,b)=>{if(b-a<.5)return;const x=pt(a),y=pt(b);svg.append(svgEl('line',{x1:x[0],y1:x[1],x2:y[0],y2:y[1],stroke:w.id===selectedWall?'#ffe49a':'#8edbcf','stroke-width':w.owners.length>1?7:9,'stroke-linecap':'round','pointer-events':'none'}));};
    for(const o of taken){const span=GEO.openingSpan(o,w);const a=GEO.length(w.a,span.a),b=GEO.length(w.a,span.b);solid(cursor,a);cursor=b;
      const [mx,my]=span.center,p=span.a,q=span.b;
      if(o.kind==='window'){
        for(const shift of [-3,3])svg.append(svgEl('line',{x1:p[0]-dir[1]*shift,y1:p[1]+dir[0]*shift,x2:q[0]-dir[1]*shift,y2:q[1]+dir[0]*shift,stroke:'#7bddff','stroke-width':3,'pointer-events':'none'}));
      }else if(o.type!=='open'){
        const hinged=o.swing==='right'?q:p;
        if(o.type==='sliding'){
          for(const d of [3,8])svg.append(svgEl('line',{x1:p[0]-dir[1]*d,y1:p[1]+dir[0]*d,x2:q[0]-dir[1]*d,y2:q[1]+dir[0]*d,stroke:'#ffc785','stroke-width':2.5,'stroke-dasharray':'18 5','pointer-events':'none'}));
        }else{
          for(const hinge of o.type==='double'?[p,q]:[hinged]){
            svg.append(svgEl('line',{x1:hinge[0],y1:hinge[1],x2:hinge[0]-dir[1]*span.width*(o.type==='double'?.44:.78),y2:hinge[1]+dir[0]*span.width*(o.type==='double'?.44:.78),stroke:'#ffc785','stroke-width':3,'pointer-events':'none'}));
            svg.append(svgEl('circle',{cx:hinge[0],cy:hinge[1],r:4,fill:'#ffc785','pointer-events':'none'}));
          }
        }
      }
      svg.append(svgEl('circle',{cx:mx,cy:my,r:9,fill:o.id===selectedOpening?'#ffe49a':'#ffb475',stroke:'#17232a','stroke-width':2,'data-opening':o.id,'data-wall':w.id}));
    }
    solid(cursor,w.length);
    svg.append(svgEl('line',{x1:w.a[0],y1:w.a[1],x2:w.b[0],y2:w.b[1],stroke:'transparent','stroke-width':24,'data-wall':w.id,'data-target':'wall'}));
  }
  function draw() {
    const canvas=$('#drawing-canvas');if(!canvas)return;
    canvas.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);canvas.replaceChildren();grid(canvas);
    const floor=currentFloor();
    if(floor.outline.length>=3) canvas.append(svgEl('path',{d:path(floor.outline),fill:'#1c3139',stroke:'#beddd8','stroke-width':7,'stroke-linejoin':'round','data-target':'outline'}));
    for(const room of floor.rooms){
      const sel=room.id===selected;
      canvas.append(svgEl('path',{d:path(room.points),fill:sel?'#147d72':'#24534e','fill-opacity':sel?.82:.62,stroke:'none','data-room':room.id}));
      const [x,y]=roomLabel(room),label=svgEl('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle',fill:'#f4fffd','font-size':27,'font-weight':700,'pointer-events':'none'});label.textContent=room.name;canvas.append(label);
    }
    // Walls are atomic and drawn only once even between rooms.
    for(const w of walls())renderWallLine(canvas,w);
    if(selected){const room=findRoom();room?.points.forEach((p,i)=>canvas.append(svgEl('circle',{cx:p[0],cy:p[1],r:16,fill:'#e2fff7',stroke:'#068e77','stroke-width':5,'data-handle':i,'data-room':room.id})));}
    if(selectedWall){const w=wall();if(w){const mid=[(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2];canvas.append(svgEl('circle',{cx:mid[0],cy:mid[1],r:14,fill:'#ffe49a',stroke:'#85640b','stroke-width':4,'data-wall':w.id,'data-target':'wall'}));}}
    if(snapGuide){const w=walls().filter(v=>v.owners.some(o=>o.roomId===snapGuide.target));for(const line of w)canvas.append(svgEl('line',{x1:line.a[0],y1:line.a[1],x2:line.b[0],y2:line.b[1],stroke:'#ffd471','stroke-width':2,'stroke-dasharray':'9 8','pointer-events':'none'}));}
    if(drawing){const pts=drawing.points;if(pts.length){canvas.append(svgEl('polyline',{points:pts.map(p=>p.join(',')).join(' '),stroke:'#f9d376','stroke-width':7,fill:'none','stroke-dasharray':'14 10','pointer-events':'none'}));pts.forEach(p=>canvas.append(svgEl('circle',{cx:p[0],cy:p[1],r:10,fill:'#f9d376','pointer-events':'none'})));}}
    $('#editor-undo').disabled=!past.length;$('#editor-redo').disabled=!future.length;$('#editor-complete').hidden=!drawing;
    $('#editor-drawing-hint').textContent=drawing?'Mindestens drei Eckpunkte setzen, danach Form schließen.':'Wand antippen für Maße, Tür oder Fenster; gelben Wandgriff ziehen. Raum antippen zum Verschieben; Eckpunkte ziehen zum Anpassen.';
    const r=findRoom(),w=wall();$('#editor-selection').classList.toggle('editor-selection-empty',!r);
    if(r){$('#editor-selected-name').value=r.name;$('#editor-selected-caption').textContent=`${r.points.length} Eckpunkte · Zusammenhängende Räume bewegen sich als Gruppe`;}
    $('#editor-level-picker').hidden=home.floors.length===1;$('#editor-level-name').textContent=floor.name;$('#editor-kind').value=home.kind;$('#editor-method').value=method;
    $('#editor-floor-count').textContent=`${home.floors.length} ${home.floors.length===1?'Ebene':'Ebenen'}`;$('#editor-rooms-count').textContent=`${floor.rooms.length} ${floor.rooms.length===1?'Raum':'Räume'}`;
    $('#editor-wall-tools').hidden=!w;
    $('#editor-wall-summary').textContent=w?`${w.owners.length>1?'Gemeinsame Innenwand':'Wand'} · ${w.axis==='free'?'schräg':w.axis==='h'?'waagerecht':'senkrecht'} · ${w.length.toFixed(0)} Plan-Einheiten${floor.metersPerUnit?' / '+(w.length*floor.metersPerUnit).toFixed(2)+' m':''}`:'Wand auswählen';
    $('#editor-scale-status').textContent=floor.metersPerUnit?`Maßstab kalibriert · 100 Einheiten = ${(floor.metersPerUnit*100).toFixed(2)} m`:'Noch kein Realmaß: Geometrie ist maßstabsfrei';
    $('#editor-room-dimensions').hidden=!r;
    if(r){const b=GEO.bbox(r.points);$('#editor-room-size-label').textContent=`Zeichnung: ${(b.right-b.left).toFixed(0)} × ${(b.bottom-b.top).toFixed(0)} Einheiten${floor.metersPerUnit?' · '+((b.right-b.left)*floor.metersPerUnit).toFixed(2)+' × '+((b.bottom-b.top)*floor.metersPerUnit).toFixed(2)+' m':''}`;}
    $('#editor-opening-panel').hidden=!w;
    const selection=opening();$('#editor-opening-list').replaceChildren();
    if(w){for(const o of floor.openings.filter(o=>o.wallId===w.id)){
      const btn=el('button',{type:'button',class:'editor-btn'+(o.id===selectedOpening?' highlight':''), 'data-existing-opening':o.id},`${o.kind==='door'?'🚪 Tür':'🪟 Fenster'} · ${Math.round(o.t*100)} %`);btn.addEventListener('click',()=>{selectedOpening=o.id;fillOpeningForm(o);draw();});$('#editor-opening-list').append(btn);
    }}
    $('#editor-remove-opening').disabled=!selection;
    $('#editor-update-opening').disabled=!selection;
    notice(warning);
  }
  function fillOpeningForm(o){$('#editor-opening-kind').value=o.kind;$('#editor-opening-type').value=o.type;$('#editor-opening-width').value=(o.width*(currentFloor().metersPerUnit||1)).toFixed(2);$('#editor-opening-height').value=o.height==null?'':(o.height*(currentFloor().metersPerUnit||1)).toFixed(2);$('#editor-opening-position').value=Math.round(o.t*100);$('#editor-opening-swing').value=o.swing;}
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
    safeChange(()=>{if(type==='outline') currentFloor().outline=clone(points);else {
      const name=$('#editor-new-room').value.trim().slice(0,55)||`Raum ${currentFloor().rooms.length+1}`;
      const placed=GEO.newRoomPosition(clone(points),currentFloor().rooms);if(!placed)return false;const room={id:uid(),name,points:placed,cleanliness:CLEAN.sanitize()};currentFloor().rooms.push(room);selected=room.id;selectedWall=null;
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
    safeChange(()=>{const placed=GEO.newRoomPosition(points,currentFloor().rooms);if(!placed)return false;const r={id:uid(),name,points:placed,cleanliness:CLEAN.sanitize()};currentFloor().rooms.push(r);selected=r.id;selectedWall=null;});
  }
  // U04 view is deliberately separate from the editor: no wall/vertex handlers in the dashboard.
  let detailId=null, detailFloor=null, quickId=null, press=null, blockClickUntil=0;
  const roomById=(floorId,id)=>home.floors.find(f=>f.id===floorId)?.rooms.find(r=>r.id===id);
  const cleanOf=room=>CLEAN.sanitize(room.cleanliness);
  const scoreOf=room=>CLEAN.roomScore(cleanOf(room));
  function persistClean(floorId,roomId,fn){
    const room=roomById(floorId,roomId);if(!room)return false;
    const before=clone(home),clean=cleanOf(room);
    if(fn(clean,room)===false)return false;
    room.cleanliness=CLEAN.sanitize(clean);commit(before);return true;
  }
  function stateLabel(n){return n<35?'Stark verschmutzt':n<65?'Reinigung sinnvoll':n<85?'Ordentlich':'Sehr sauber';}
  function closeClean(){detailId=null;detailFloor=null;$('#room-detail-overlay').hidden=true;$('#room-quick-overlay').hidden=true;quickId=null;}
  function renderDetail(){
    if(!detailId)return;
    const room=roomById(detailFloor,detailId);if(!room){closeClean();return;}
    const c=cleanOf(room),n=CLEAN.roomScore(c);
    $('#room-detail-title').textContent=room.name;
    $('#room-detail-state').textContent=`${n} % · ${stateLabel(n)} (Schätzwert)`;
    $('#room-detail-state').style.color=CLEAN.stateColor(n);
    $('#room-score-input').value=n;
    $('#room-score-display').textContent=`${n} %`;
    $('#room-score-note').textContent=c.override===null?'Berechnet aus nicht erfassten Flächen und Unterbereichen.':'Manuelle Raumkorrektur aktiv; die nächste Änderung eines Unterbereichs berechnet den Raum neu.';
    $('#room-base-input').value=c.base;
    $('#room-base-display').textContent=`${c.base} %`;
    const list=$('#room-areas');list.replaceChildren();
    if(!c.areas.length)list.append(el('p',{class:'room-areas-empty'},'Noch keine Unterbereiche. Du kannst z. B. Boden, WC oder Dusche anlegen.'));
    for(const a of c.areas){
      const line=el('div',{class:'area-line'}),row=el('div',{class:'area-line-head'});
      const name=el('strong',{},a.name),num=el('output',{},`${a.score} %`);
      row.append(name,num);
      const slide=el('input',{type:'range',min:'0',max:'100',step:'1',value:a.score,'aria-label':`${a.name} Sauberkeitszustand`});
      slide.addEventListener('input',()=>{num.textContent=slide.value+' %';});
      slide.addEventListener('change',()=>{persistClean(detailFloor,detailId,(clean)=>{const target=clean.areas.find(x=>x.id===a.id);if(!target)return false;target.score=Number(slide.value);clean.override=null;});renderDetail();});
      const actions=el('div',{class:'area-buttons'}),rename=el('button',{type:'button',class:'room-btn'},'✏️ Umbenennen'),del=el('button',{type:'button',class:'room-btn room-danger'},'Löschen');
      rename.addEventListener('click',()=>{const value=prompt('Name des Unterbereichs',a.name);if(value===null)return;const trimmed=value.trim().slice(0,55);if(!trimmed){alert('Bitte einen Namen angeben.');return;}persistClean(detailFloor,detailId,clean=>{const target=clean.areas.find(x=>x.id===a.id);if(!target)return false;target.name=trimmed;clean.override=null;});renderDetail();});
      del.addEventListener('click',()=>{if(!confirm(`Unterbereich „${a.name}“ entfernen?`))return;persistClean(detailFloor,detailId,clean=>{clean.areas=clean.areas.filter(x=>x.id!==a.id);clean.override=null;});renderDetail();});
      actions.append(rename,del);line.append(row,slide,actions);
      const tasks=el('div',{class:'area-tasks'}),taskLabel=el('small',{},'Eigene Putzaufgaben für diesen Bereich');tasks.append(taskLabel);
      for(const task of a.tasks){
        const taskRow=el('div',{class:'area-task-row'}),label=el('label',{}),check=el('input',{type:'checkbox','aria-label':`Aufgabe ${task.text} erledigt`}),name=el('span',{},task.text),remove=el('button',{class:'room-btn room-danger',type:'button','aria-label':`Aufgabe ${task.text} löschen`},'✕');
        check.checked=task.done;label.append(check,name);if(task.done)name.classList.add('done');
        check.addEventListener('change',()=>{persistClean(detailFloor,detailId,clean=>{const target=clean.areas.find(x=>x.id===a.id)?.tasks.find(t=>t.id===task.id);if(!target)return false;target.done=check.checked;});renderDetail();});
        remove.addEventListener('click',()=>{if(!confirm(`Aufgabe „${task.text}“ entfernen?`))return;persistClean(detailFloor,detailId,clean=>{const target=clean.areas.find(x=>x.id===a.id);if(!target)return false;target.tasks=target.tasks.filter(t=>t.id!==task.id);});renderDetail();});
        taskRow.append(label,remove);tasks.append(taskRow);
      }
      const addTask=el('div',{class:'room-add-line'}),taskInput=el('input',{type:'text',maxlength:'90',placeholder:'Aufgabe eingeben, z. B. WC reinigen','aria-label':`Aufgabe für ${a.name} eingeben`}),addTaskButton=el('button',{type:'button',class:'room-btn'},'＋ Aufgabe');
      const saveTask=()=>{const text=taskInput.value.trim().slice(0,90);if(!text){taskInput.focus();return;}persistClean(detailFloor,detailId,clean=>{const target=clean.areas.find(x=>x.id===a.id);if(!target||target.tasks.length>=30){alert('Maximal 30 Aufgaben pro Unterbereich.');return false;}target.tasks.push({id:uid(),text,done:false});});renderDetail();};
      addTaskButton.addEventListener('click',saveTask);taskInput.addEventListener('keydown',e=>{if(e.key==='Enter')saveTask();});addTask.append(taskInput,addTaskButton);tasks.append(addTask);line.append(tasks);list.append(line);
    }
  }
  function showDetail(floorId,id){
    const room=roomById(floorId,id);if(!room)return;
    detailFloor=floorId;detailId=id;$('#room-quick-overlay').hidden=true;quickId=null;
    $('#room-detail-overlay').hidden=false;renderDetail();$('#room-detail-close').focus();
  }
  function showQuick(floorId,id){
    const room=roomById(floorId,id);if(!room)return;
    quickId={floorId,id};$('#room-quick-title').textContent=room.name;
    $('#room-quick-overlay').hidden=false;$('#room-quick-detail').focus();
  }
  function attachRoomEvents(node, floorId,roomId){
    node.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse' && event.button!==0)return;
      clearTimeout(press?.timer);
      const data={floorId,roomId,startX:event.clientX,startY:event.clientY,long:false,timer:null,pointerId:event.pointerId};
      data.timer=setTimeout(()=>{if(press===data){data.long=true;blockClickUntil=Date.now()+700;showQuick(floorId,roomId);}},550);
      press=data;
    });
    node.addEventListener('pointermove',e=>{if(press && press.pointerId===e.pointerId && Math.hypot(e.clientX-press.startX,e.clientY-press.startY)>12){clearTimeout(press.timer);press=null;}});
    const release=e=>{if(!press||press.pointerId!==e.pointerId)return;clearTimeout(press.timer);const long=press.long;press=null;if(!long && e.type==='pointerup'){blockClickUntil=Date.now()+500;showDetail(floorId,roomId);}};
    node.addEventListener('pointerup',release);node.addEventListener('pointercancel',release);
    node.addEventListener('contextmenu',e=>{e.preventDefault();clearTimeout(press?.timer);press=null;blockClickUntil=Date.now()+700;showQuick(floorId,roomId);});
    node.addEventListener('click',e=>{if(Date.now()<blockClickUntil)return;if(e.detail===0)showDetail(floorId,roomId);});
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showDetail(floorId,roomId);}else if(e.key==='F10'&&e.shiftKey){e.preventDefault();showQuick(floorId,roomId);}});
  }
  function renderHome(){
    const preview=$('#home-floorplan-preview'),empty=$('#floorplan-empty'),art=$('#floorplan-art');
    const hasData=home.floors.some(f=>f.rooms.length || f.outline.length>=3);
    empty.hidden=hasData;art.hidden=hasData;preview.hidden=!hasData;
    const all=home.floors.flatMap(f=>f.rooms);
    const overall=$('#home-overall-value'),subtitle=$('#home-overall-caption');
    if(all.length){overall.textContent=Math.round(all.reduce((total,r)=>total+scoreOf(r),0)/all.length)+' %';subtitle.textContent=`Geschätzt aus ${all.length} Räumen`;}else{overall.textContent='– %';subtitle.textContent='Noch keine Raumdaten';}
    if(!hasData){preview.replaceChildren();return;}
    const f=currentFloor();preview.replaceChildren();
    const top=el('div',{class:'home-floor-switch'});
    const tag=el('div',{class:'home-map-caption'},`${home.kind==='haus'?'Haus':'Wohnung'} · ${f.name}`);top.append(tag);
    if(home.floors.length>1){
      const level=el('select',{id:'home-floor-select',class:'home-floor-select','aria-label':'Etage auswählen'});
      home.floors.forEach(floor=>{const opt=el('option',{value:floor.id},floor.name);if(floor.id===home.activeFloor)opt.selected=true;level.append(opt);});
      level.addEventListener('change',()=>{home.activeFloor=level.value;API.saveHome(clone(home));renderHome();});top.append(level);
    }
    preview.append(top);
    const allPts=[...f.rooms.flatMap(r=>r.points),...f.outline],xs=allPts.map(p=>p[0]),ys=allPts.map(p=>p[1]);
    const minX=xs.length?Math.min(...xs):0,minY=ys.length?Math.min(...ys):0,maxX=xs.length?Math.max(...xs):1000,maxY=ys.length?Math.max(...ys):720;
    const pad=68,w=Math.max(180,maxX-minX+pad*2),h=Math.max(160,maxY-minY+pad*2);
    const svg=svgEl('svg',{viewBox:`${minX-pad} ${minY-pad} ${w} ${h}`,role:'group','aria-label':`Interaktiver Grundriss ${f.name}: Räume antippen; länger drücken für Schnellaktionen`});
    if(f.outline.length>=3)svg.append(svgEl('path',{d:path(f.outline),fill:'#162b35',stroke:'#c1e7de','stroke-width':9,'pointer-events':'none'}));
    for(const r of f.rooms){
      const n=scoreOf(r),g=svgEl('g',{'data-home-room':r.id,role:'button',tabindex:'0','aria-label':`${r.name}: geschätzte Sauberkeit ${n} Prozent. Details öffnen.`});
      const poly=svgEl('path',{d:path(r.points),fill:CLEAN.stateColor(n),stroke:'#f1fff7','stroke-width':1.7,'fill-opacity':.84});g.append(poly);
      const [x,y]=roomLabel(r),name=svgEl('text',{x,y:y-13,fill:'#ffffff','font-size':25,'font-weight':750,'text-anchor':'middle','dominant-baseline':'middle','pointer-events':'none','paint-order':'stroke',stroke:'#0a1a1e','stroke-width':3});name.textContent=r.name.length>17?r.name.slice(0,16)+'…':r.name;
      const num=svgEl('text',{x,y:y+22,fill:'#ffffff','font-size':32,'font-weight':850,'text-anchor':'middle','dominant-baseline':'middle','pointer-events':'none','paint-order':'stroke',stroke:'#0a1a1e','stroke-width':4});num.textContent=n+' %';g.append(name,num);
      attachRoomEvents(g,f.id,r.id);svg.append(g);
    }
    for(const wall of GEO.walls(f.rooms)){
      const op=(f.openings||[]).filter(o=>o.wallId===wall.id).sort((a,b)=>a.t-b.t),spans=op.map(o=>GEO.openingSpan(o,wall));const dir=[(wall.b[0]-wall.a[0])/wall.length,(wall.b[1]-wall.a[1])/wall.length],segments=[0,...spans.flatMap(span=>[GEO.length(wall.a,span.a),GEO.length(wall.a,span.b)]),wall.length];
      for(let i=0;i<segments.length-1;i+=2){const pa=segments[i],pb=segments[i+1];if(pb<=pa)continue;svg.append(svgEl('line',{x1:wall.a[0]+dir[0]*pa,y1:wall.a[1]+dir[1]*pa,x2:wall.a[0]+dir[0]*pb,y2:wall.a[1]+dir[1]*pb,stroke:'#d4e8e2','stroke-width':7,'pointer-events':'none'}));}
      for(const o of op){const span=GEO.openingSpan(o,wall);svg.append(svgEl('line',{x1:span.a[0],y1:span.a[1],x2:span.b[0],y2:span.b[1],stroke:o.kind==='window'?'#7bddff':'#ffc785','stroke-width':4,'pointer-events':'none'}));}
    }
    preview.append(svg);
    const bottom=el('p',{class:'home-map-foot'},'Tippen: Raumdetails · Lange drücken: Schnellaktionen · Werte sind Schätzungen');preview.append(bottom);
    const legend=el('div',{class:'home-map-legend'});
    for(const [value,text] of [[20,'0–34 %'],[50,'35–64 %'],[75,'65–84 %'],[95,'85–100 %']]){const chip=el('span',{},text),dot=el('i',{'aria-hidden':'true'});dot.style.background=CLEAN.stateColor(value);chip.prepend(dot);legend.append(chip);}preview.append(legend);
    const editButton=el('button',{id:'home-edit-plan',type:'button',class:'outline-button'},'✏️ Grundriss bearbeiten');editButton.addEventListener('click',open);preview.append(editButton);
  }
  $('#room-detail-close').addEventListener('click',closeClean);
  $('#room-quick-close').addEventListener('click',closeClean);
  $('#room-detail-overlay').addEventListener('click',e=>{if(e.target===$('#room-detail-overlay'))closeClean();});
  $('#room-quick-overlay').addEventListener('click',e=>{if(e.target===$('#room-quick-overlay'))closeClean();});
  $('#room-score-input').addEventListener('input',e=>{$('#room-score-display').textContent=e.target.value+' %';});
  $('#room-base-input').addEventListener('input',e=>{$('#room-base-display').textContent=e.target.value+' %';});
  $('#room-score-save').addEventListener('click',()=>{persistClean(detailFloor,detailId,clean=>{clean.override=Number($('#room-score-input').value);});renderDetail();});
  $('#room-base-save').addEventListener('click',()=>{persistClean(detailFloor,detailId,clean=>{clean.base=Number($('#room-base-input').value);clean.override=null;});renderDetail();});
  $('#room-area-add').addEventListener('click',()=>{
    const field=$('#room-area-name'),name=field.value.trim().slice(0,55);if(!name){field.focus();return;}
    persistClean(detailFloor,detailId,clean=>{if(clean.areas.length>=50){alert('Maximal 50 Unterbereiche je Raum.');return false;}clean.areas.push({id:uid(),name,score:clean.base,tasks:[]});clean.override=null;});
    field.value='';renderDetail();
  });
  $('#room-area-name').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#room-area-add').click();}});
  $('#room-quick-detail').addEventListener('click',()=>{if(quickId)showDetail(quickId.floorId,quickId.id);});
  document.querySelectorAll('[data-quick-score]').forEach(btn=>btn.addEventListener('click',()=>{if(!quickId)return;const {floorId,id}=quickId,n=Number(btn.dataset.quickScore);persistClean(floorId,id,clean=>{clean.override=n;});closeClean();}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && (!$('#room-detail-overlay').hidden||!$('#room-quick-overlay').hidden)){e.preventDefault();closeClean();}});
  function open(){
    home=sanitize(API.getHome());selected=null;selectedWall=null;selectedOpening=null;drawing=null;past=[];future=[];notice('');fit();
    $('#editor-overlay').hidden=false;document.body.classList.add('editing-plan');draw();
    $('#editor-close').focus();
  }
  function close(){if(gesture)gesture=null; pointers.clear();drawing=null;$('#editor-overlay').hidden=true;document.body.classList.remove('editing-plan');renderHome();$('#setup-home').focus();}
  const canvas=$('#drawing-canvas');
  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){gesture={type:'pinch',initial:[...pointers.values()],start:clone(view)};return;}
    if(pointers.size!==1)return;
    const hitWall=e.target.closest('[data-wall]')?.getAttribute('data-wall');
    const hitOpening=e.target.closest('[data-opening]')?.getAttribute('data-opening');
    const room=e.target.closest('[data-room]')?.getAttribute('data-room');
    const handle=e.target.closest('[data-handle]')?.getAttribute('data-handle');
    const [x,y]=world(e);
    if(drawing){gesture={type:'tap',screen:[e.clientX,e.clientY],at:[x,y]};return;}
    beforeGesture=clone(home);
    if(hitWall && handle==null){if(selectedWall!==hitWall)$('#editor-wall-measure').value='';selectedWall=hitWall;selectedOpening=hitOpening??null;const beforeWalls=GEO.walls(beforeGesture.floors.find(f=>f.id===beforeGesture.activeFloor).rooms);gesture={type:'wall',origin:[x,y],wall:beforeWalls.find(w=>w.id===hitWall),beforeWalls};draw();}
    else if(room){selected=room;selectedWall=null;selectedOpening=null;const group=connected(room,currentFloor().rooms);gesture={type:handle!=null?'handle':'room',room,handle:Number(handle),origin:[x,y],start:clone(findRoom()?.points),group:[...group]};draw();}
    else{selected=null;selectedWall=null;selectedOpening=null;gesture={type:'pan',screen:[e.clientX,e.clientY],start:clone(view)};draw();}
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
    if(['room','handle','wall'].includes(gesture.type)){
      const old=beforeGesture.floors.find(f=>f.id===beforeGesture.activeFloor);
      currentFloor().rooms=clone(old.rooms);currentFloor().openings=clone(old.openings);
      const [x,y]=world(e),dx=x-gesture.origin[0],dy=y-gesture.origin[1];snapGuide=null;
      if(gesture.type==='room'){
        const delta=[snap(dx),snap(dy)], ids=new Set(gesture.group);
        for(const room of currentFloor().rooms)if(ids.has(room.id))room.points=room.points.map(p=>[p[0]+delta[0],p[1]+delta[1]]);
        if(ids.size===1){const moving=currentFloor().rooms.find(r=>r.id===gesture.room),others=currentFloor().rooms.filter(r=>!ids.has(r.id));const adjusted=GEO.snapRoom(moving.points,others);moving.points=adjusted.points;snapGuide=adjusted.guide??null;}
      } else if(gesture.type==='handle'){
        const first=old.rooms.find(r=>r.id===gesture.room)?.points[gesture.handle];
        if(first)for(const r of currentFloor().rooms)for(const p of r.points)if(GEO.same(first,p)){p[0]=snap(first[0]+dx);p[1]=snap(first[1]+dy);}
      } else {
        const w=gesture.wall;if(w){const delta=w.axis==='v'?snap(dx):snap(dy);if(w.axis!=='free')GEO.moveWall(currentFloor().rooms,w,delta);const next=GEO.wallAfter(w,walls());selectedWall=next?.id??null;}
      }
      if(gesture.type!=='wall'&&gesture.type!=='room')reconcileOpenings(gesture.beforeWalls??GEO.walls(old.rooms));
      else reconcileOpenings(GEO.walls(old.rooms));
      notice(GEO.collides(currentFloor().rooms)?'⚠️ Räume überschneiden sich – Änderung wird beim Loslassen verworfen.':'');
      draw();return;
    }
  });
  function end(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(gesture?.type==='tap'&&pointers.size===0){const dx=Math.abs(e.clientX-gesture.screen[0]),dy=Math.abs(e.clientY-gesture.screen[1]);if(dx+dy<18)drawing.points.push(gesture.at.map(snap));}
    if(['room','handle','wall'].includes(gesture?.type)&&pointers.size===0){
      const invalid=currentFloor().rooms.some(r=>!GEO.validPolygon(r.points));const conflict=GEO.collides(currentFloor().rooms);if(invalid||conflict){home=beforeGesture;selectedWall=null;notice(invalid?'Ungültige Raumform verhindert.':'Überlappung verhindert: '+conflict.join(' und '));draw();}
      else{const oldWalls=GEO.walls(beforeGesture.floors.find(f=>f.id===beforeGesture.activeFloor).rooms);reconcileOpenings(oldWalls);commit(beforeGesture);notice('');}
    }
    snapGuide=null;
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
  $('#editor-delete-room').addEventListener('click',()=>{const r=findRoom();if(!r)return;if(!confirm(`Raum „${r.name}“ wirklich löschen?`))return;mutate(()=>{const old=walls();currentFloor().rooms=currentFloor().rooms.filter(a=>a.id!==r.id);currentFloor().openings=currentFloor().openings.filter(o=>!old.filter(w=>w.owners.some(t=>t.roomId===r.id)).some(w=>w.id===o.wallId&&!w.owners.some(a=>a.roomId!==r.id)));selected=null;selectedWall=null;});});
  $('#editor-kind').addEventListener('change',e=>mutate(()=>{home.kind=e.target.value==='haus'?'haus':'wohnung';}));
  $('#editor-add-floor').addEventListener('click',()=>{const name=prompt('Name der neuen Ebene',`Ebene ${home.floors.length+1}`);if(name===null)return;if(home.floors.length>=12){alert('Maximal 12 Ebenen.');return;}mutate(()=>{const f={id:uid(),name:name.trim().slice(0,50)||`Ebene ${home.floors.length+1}`,outline:[],rooms:[],openings:[],metersPerUnit:null};home.floors.push(f);home.activeFloor=f.id;selected=null;selectedWall=null;fit();});});
  $('#editor-rename-floor').addEventListener('click',()=>{const f=currentFloor(),name=prompt('Ebene umbenennen',f.name);if(name===null||!name.trim())return;mutate(()=>{f.name=name.trim().slice(0,50);});});
  $('#editor-remove-floor').addEventListener('click',()=>{if(home.floors.length<=1){alert('Mindestens eine Ebene ist erforderlich.');return;}if(!confirm(`Ebene „${currentFloor().name}“ mit allen Räumen löschen?`))return;mutate(()=>{home.floors=home.floors.filter(f=>f.id!==home.activeFloor);home.activeFloor=home.floors[0].id;selected=null;selectedWall=null;});});
  $('#editor-floor-prev').addEventListener('click',()=>cycleFloor(-1));$('#editor-floor-next').addEventListener('click',()=>cycleFloor(1));
  function cycleFloor(step){const i=home.floors.findIndex(f=>f.id===home.activeFloor);home.activeFloor=home.floors[(i+step+home.floors.length)%home.floors.length].id;selected=null;selectedWall=null;selectedOpening=null;drawing=null;API.saveHome(clone(home));draw();renderHome();}
  $('#editor-method').addEventListener('change',e=>{method=e.target.value; if(method==='outline')startDrawing('outline');else {drawing=null;draw();}});
  window.addEventListener('keydown',e=>{
    if($('#editor-overlay').hidden)return;
    if(e.key==='Escape'){if(drawing){drawing=null;draw();}else close();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
  });
  // U03 measurements are voluntary. The first known physical wall length calibrates the whole floor.
  $('#editor-calibrate').addEventListener('click',()=>{const w=wall(),actual=Number($('#editor-wall-measure').value);if(!w||!(actual>0&&actual<=300)){notice('Bitte eine Wand und eine echte Länge zwischen 0 und 300 m angeben.');return;}mutate(()=>{currentFloor().metersPerUnit=actual/w.length;});if(Number($('#editor-opening-width').value)===80)$('#editor-opening-width').value='0.80';notice('Maßstab anhand dieser Wand festgelegt.');});
  $('#editor-set-wall-length').addEventListener('click',()=>{const w=wall(),m=currentFloor().metersPerUnit,desired=Number($('#editor-wall-measure').value);if(!w||!m||w.axis==='free'){notice('Zuerst Maßstab kalibrieren und gerade Wand wählen.');return;}if(!(desired>.1&&desired<=300)){notice('Wandlänge muss zwischen 0,1 und 300 m liegen.');return;}safeChange(()=>{
    const old=walls(),was=old.find(x=>x.id===w.id);if(!was)return false;
    const delta=desired/m-w.length;if(Math.abs(delta)>10000)return false;
    // Lengthen the edge at its end; all room polygons owning this physical segment share the moved endpoint.
    for(const owner of was.owners){const r=currentFloor().rooms.find(v=>v.id===owner.roomId);for(const point of r.points)if(GEO.same(point,w.b)){if(w.axis==='h')point[0]+=Math.sign(w.b[0]-w.a[0])*delta;else point[1]+=Math.sign(w.b[1]-w.a[1])*delta;}}
    const next=GEO.wallAfter(w,walls());selectedWall=next?.id??null;
  });});
  $('#editor-set-room-size').addEventListener('click',()=>{const r=findRoom(),m=currentFloor().metersPerUnit;if(!r||!m){notice('Bitte zuerst eine Wand auf reale Meter kalibrieren.');return;}const width=Number($('#editor-room-width').value),height=Number($('#editor-room-height').value);if(!(width>0&&height>0&&width<300&&height<300)){notice('Raummaße müssen zwischen 0 und 300 m liegen.');return;}
    safeChange(()=>GEO.resizeRoom(currentFloor().rooms,r.id,width/m,height/m));
  });
  $('#editor-add-opening').addEventListener('click',()=>{const w=wall(),f=currentFloor();if(!w){notice('Zuerst Wand antippen.');return;}const kind=$('#editor-opening-kind').value,m=f.metersPerUnit||1,width=Number($('#editor-opening-width').value)/m,height=Number($('#editor-opening-height').value)/m,t=Number($('#editor-opening-position').value)/100;
    if(!(width>=8&&width<w.length-8)){notice('Öffnung zu breit für diese Wand. Bitte Breite verkleinern.');return;}
    if(f.openings.some(o=>o.wallId===w.id&&Math.abs(o.t-t)*w.length<(o.width+width)/2+4)){notice('Hier befindet sich bereits eine Öffnung.');return;}
    mutate(()=>{const o={id:uid(),wallId:w.id,kind,type:$('#editor-opening-type').value,width,height:Number.isFinite(height)&&height>0?height:null,t,swing:$('#editor-opening-swing').value};f.openings.push(o);selectedOpening=o.id;});
  });
  $('#editor-update-opening').addEventListener('click',()=>{const o=opening(),w=wall();if(!o||!w)return;const m=currentFloor().metersPerUnit||1,width=Number($('#editor-opening-width').value)/m,t=Number($('#editor-opening-position').value)/100;if(!(width>=8&&width<w.length-8)){notice('Breite passt nicht auf die Wand.');return;}if(currentFloor().openings.some(a=>a.id!==o.id&&a.wallId===w.id&&Math.abs(a.t-t)*w.length<(a.width+width)/2+4)){notice('Öffnungen dürfen sich nicht überschneiden.');return;}mutate(()=>{o.kind=$('#editor-opening-kind').value;o.type=$('#editor-opening-type').value;o.width=width;o.height=Number($('#editor-opening-height').value)>0?Number($('#editor-opening-height').value)/m:null;o.t=t;o.swing=$('#editor-opening-swing').value;});});
  $('#editor-remove-opening').addEventListener('click',()=>{const o=opening();if(!o||!confirm('Diese Tür / dieses Fenster löschen?'))return;mutate(()=>{currentFloor().openings=currentFloor().openings.filter(v=>v.id!==o.id);selectedOpening=null;});});
  $('#editor-opening-kind').addEventListener('change',e=>{$('#editor-opening-swing-wrap').hidden=e.target.value!=='door';});
  $('#editor-opening-position').addEventListener('input',e=>{$('#editor-opening-position-label').textContent=e.target.value+' %';});
  $('#editor-wall-measure').addEventListener('focus',e=>{const w=wall();if(w&&currentFloor().metersPerUnit&&!e.target.value)e.target.value=(w.length*currentFloor().metersPerUnit).toFixed(2);});
  window.PutzmanagerEditorGeometry=GEO;
  window.PutzmanagerEditor={open,renderHome,get:()=>clone(home)};
  renderHome();
})();
