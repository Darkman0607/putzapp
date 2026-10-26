/* U05 – task management, recurring due dates, quick/detail cleaning and persisted journal. */
(() => {
 'use strict';
 const APP=window.PutzmanagerEditor,TASKS=window.PutzmanagerTasks,CLEAN=window.PutzmanagerClean;
 const $=s=>document.querySelector(s);
 const el=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n;};
 const makeButton=(text,fn,klass='room-btn')=>{const b=el('button',klass,text);b.type='button';b.addEventListener('click',fn);return b;};
 const uid=()=>globalThis.crypto?.randomUUID?.()||('task-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 let mode=null,selectedFloor=null,selectedRoom=null,materials=null,stopwatch=null,stagedPhotos={before:[],after:[]};
 function snapshot(){return APP.get();}
 function find(floorId,roomId){const state=snapshot();const floor=state.floors.find(f=>f.id===floorId),room=floor?.rooms.find(r=>r.id===roomId);return {state,floor,room};}
 function values(){return snapshot().floors.flatMap(f=>f.rooms.map(r=>({floorId:f.id,id:r.id,text:f.name+' · '+r.name})));}
 function selected(){const item=$('#cleaning-room-picker').value; const [floorId,id]=item.split('|');return {floorId,id};}
 function refreshPicker(){
  const picker=$('#cleaning-room-picker'),before=picker.value;picker.replaceChildren();
  for(const entry of values()) {const op=el('option','',entry.text);op.value=entry.floorId+'|'+entry.id;picker.append(op);}
  if([...picker.options].some(o=>o.value===before))picker.value=before;
  const available=picker.options.length>0;
  ['cleaning-room-quick','cleaning-room-detail','cleaning-room-manage'].forEach(id=>{$('#'+id).disabled=!available;});
  const current=selected();const room=find(current.floorId,current.id).room;
  const tasks=room?TASKS.allTasks(room):[];
  $('#cleaning-room-status').textContent=room?`${tasks.length} Aufgaben · ${tasks.filter(t=>['Fällig','Überfällig','Heute fällig','Offen'].includes(TASKS.status(t))).length} offen oder fällig · geschätzte Sauberkeit ${CLEAN.roomScore(room.cleanliness)} %`:'Zuerst auf der Startseite einen Grundriss mit Räumen anlegen.';
 }
 function renderHistory(){
  const home=snapshot(),entries=TASKS.sanitizeJournal(home.history),list=$('#room-clean-history');list.replaceChildren();
  $('#room-history-count').textContent=entries.length+' '+(entries.length===1?'Eintrag':'Einträge');
  if(!entries.length){list.append(el('p','empty-note','Noch keine abgeschlossene Raumreinigung.'));return;}
  for(const entry of entries.slice().reverse().slice(0,40)){
   const row=el('article','cleaning-history-item');const header=el('div','cleaning-history-head');const d=new Date(entry.at),title=el('strong','',entry.roomName+' · '+(entry.mode==='quick'?'Schnellreinigung':'Detailreinigung'));
   header.append(title,el('small','',d.toLocaleString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})));
   row.append(header,el('p','',entry.scope.map(s=>s.name).join(', ')+' · '+entry.scoreBefore+' % → '+entry.scoreAfter+' %'+(entry.durationSeconds!==null?' · ⏱️ '+window.PutzmanagerRoomTimer.format(entry.durationSeconds):'')));
   if(entry.tasks.length)row.append(el('small','',entry.tasks.map(t=>t.text).join(' · ')));
   if(entry.notes)row.append(el('small','cleaning-history-notes',entry.notes));
   list.append(row);
  }
 }
 function refresh(){refreshPicker();renderHistory();const tasks=snapshot().floors.flatMap(f=>f.rooms.flatMap(r=>TASKS.allTasks(r)));const due=tasks.filter(t=>['Fällig','Überfällig','Heute fällig','Offen'].includes(TASKS.status(t))).length;$('#open-count').textContent=String(due);}
 function close(){stopwatch?.dispose();stopwatch=null;mode=null;selectedFloor=null;selectedRoom=null;materials=null;$('#cleaning-overlay').hidden=true;}
 function open(nextMode,floorId,roomId){
  if(!['tasks','quick','detail'].includes(nextMode))return;
  const {room}=find(floorId,roomId);if(!room){$('#cleaning-room-status').textContent='Bitte zuerst einen Raum anlegen oder auswählen.';return;}
  stopwatch?.dispose();stopwatch=null;stagedPhotos={before:[],after:[]};mode=nextMode;selectedFloor=floorId;selectedRoom=roomId;materials=null;
  $('#cleaning-title').textContent=room.name;
  $('#cleaning-subtitle').textContent=nextMode==='tasks'?'✏️ AUFGABEN & INTERVALLE':nextMode==='quick'?'⚡ SCHNELLREINIGUNG':'☑ DETAILREINIGUNG';
  $('#cleaning-overlay').hidden=false;render();$('#cleaning-close').focus();
 }
 function openSelected(which){const {floorId,id}=selected();open(which,floorId,id);}
 function blockTitle(title,subtitle){const block=el('div','cleaning-intro');block.append(el('h3','',title),el('p','room-note',subtitle));return block;}
 function formLabel(label,control){const wrapper=el('label','cleaning-field');wrapper.append(el('span','',label),control);return wrapper;}
 function choice(options,value){const select=el('select','cleaning-select');for(const [key,name] of options){const option=el('option','',name);option.value=key;select.append(option);}if(value!==undefined)select.value=value;return select;}
 function notesInput(){const field=el('textarea','cleaning-notes');field.rows=2;field.maxLength=400;field.placeholder='Notiz zur Reinigung (optional)';return field;}
 function selectedData(){return find(selectedFloor,selectedRoom);}
 function saveTask(target,task){return APP.updateClean(selectedFloor,selectedRoom,c=>TASKS.upsert(c,target,task));}
 function removeTask(target,id){return APP.updateClean(selectedFloor,selectedRoom,c=>TASKS.remove(c,target,id));}
 function renderManager(){
  stopwatch?.dispose();stopwatch=null;const {room}=selectedData(),content=$('#cleaning-content'),clean=CLEAN.sanitize(room.cleanliness);content.replaceChildren();
  content.append(blockTitle('Putzaufgaben verwalten','Eigene Aufgaben oder Vorschläge je Raum/Teilbereich. Du kannst täglich, wöchentlich oder nach eigenen Tagen wiederholen.'));
  const form=el('div','cleaning-edit-form');
  const groupOptions=TASKS.taskGroups(clean).map(g=>[g.id,g.name]);
  const scope=choice(groupOptions,'base'),name=el('input','cleaning-input');name.type='text';name.maxLength=90;name.placeholder='z. B. Boden wischen';
  const common=['Boden saugen','Boden wischen','Staub entfernen','Oberflächen reinigen','Müll entsorgen','Fenster reinigen','WC reinigen','Dusche reinigen','Waschbecken reinigen','Spiegel reinigen','Küche reinigen','Arbeitsplatte reinigen'];
  const presets=choice([['','Vorschlag auswählen'],...common.map(x=>[x,x])],'');presets.addEventListener('change',()=>{if(presets.value)name.value=presets.value;});
  const interval=choice([['none','Einmalig / ohne Wiederholung'],['daily','Täglich'],['weekly','Wöchentlich'],['custom','Alle X Tage']],'weekly');
  const days=el('input','cleaning-input');days.type='number';days.min='1';days.max='365';days.value='3';days.setAttribute('aria-label','Wiederholung alle X Tage');
  const daysWrap=formLabel('Tage (1–365)',days);const updateDays=()=>{daysWrap.hidden=interval.value!=='custom';};interval.addEventListener('change',updateDays);updateDays();
  let editId=null,editScope=null;
  const save=makeButton('＋ Aufgabe speichern',()=>{
   const text=name.value.trim().slice(0,90);if(!text){name.focus();return;}
   const target=scope.value,raw=editId?TASKS.taskGroups(CLEAN.sanitize(selectedData().room.cleanliness)).find(g=>g.id===editScope)?.tasks.find(t=>t.id===editId):null;
   const task={...(raw||{}),id:editId||uid(),text,interval:interval.value,customDays:interval.value==='custom'?Number(days.value):1};
   if(interval.value==='custom' && (!Number.isInteger(task.customDays)||task.customDays<1||task.customDays>365)){alert('Intervall muss zwischen 1 und 365 Tagen liegen.');return;}
   if(task.lastDoneAt)task.nextDue=TASKS.nextDue(task.lastDoneAt,task.interval,task.customDays);
   const ok=APP.updateClean(selectedFloor,selectedRoom,c=>{if(editId&&editScope!==target)TASKS.remove(c,editScope,editId);return TASKS.upsert(c,target,task);});
   if(!ok){alert('Aufgabe nicht gespeichert. Bitte maximale Anzahl oder Zielbereich prüfen.');return;}
   renderManager();
  },'room-primary');
  form.append(formLabel('Bereich',scope),formLabel('Vorlage',presets),formLabel('Aufgabe',name),formLabel('Wiederholung',interval),daysWrap,save);
  content.append(form);content.append(el('h3','cleaning-list-heading','Gespeicherte Aufgaben'));
  let total=0;
  for(const group of TASKS.taskGroups(clean)){
   if(!group.tasks.length)continue;
   content.append(el('h4','cleaning-group-title',group.name));
   for(const task of group.tasks){total++;const row=el('div','cleaning-task-item');const text=el('div','cleaning-task-info');text.append(el('strong','',task.text),el('small','',TASKS.status(task)+(task.interval!=='none'?' · '+({'daily':'täglich','weekly':'wöchentlich','custom':'alle '+task.customDays+' Tage'}[task.interval]):'')));
    const edit=makeButton('Bearbeiten',()=>{editId=task.id;editScope=group.id;scope.value=group.id;name.value=task.text;interval.value=task.interval;days.value=task.customDays;updateDays();save.textContent='✓ Änderungen speichern';name.focus();});
    const del=makeButton('Löschen',()=>{if(!confirm(`Aufgabe „${task.text}“ löschen?`))return;removeTask(group.id,task.id);renderManager();},'room-btn room-danger');
    row.append(text,edit,del);content.append(row);
   }
  }
  if(!total)content.append(el('p','room-note','Noch keine Aufgaben. Oben eine Vorlage übernehmen oder eigene Aufgabe anlegen.'));
  content.append(makeButton('← Zur Detailreinigung',()=>{mode='detail';render();}));
 }
 function addPhotos(content){
  if(!window.PutzmanagerPhotos)return;
  const sessionPhotos=stagedPhotos;
  const wrapper=el('section','cleaning-photos');wrapper.append(el('h4','', '📸 Vorher / Nachher (optional)'));
  wrapper.append(el('p','room-note','Du kannst mehrere Fotos auf einmal auswählen oder weitere hinzufügen. Bilder vor dem Speichern einzeln entfernen.'));
  for(const kind of ['before','after']){
   const section=el('div','cleaning-photo-group'),name=kind==='before'?'Vorher':'Nachher';
   const head=el('div','cleaning-photo-head'),title=el('strong','',name+'-Fotos'),count=el('span','cleaning-photo-count');head.append(title,count);
   const input=el('input','cleaning-photo-file');input.type='file';input.accept='image/*';input.multiple=true;
   input.setAttribute('aria-label',name+'-Fotos hinzufügen');
   const preview=el('div','photo-preview cleaning-photo-previews'),status=el('p','room-note cleaning-photo-status');status.setAttribute('aria-live','polite');
   function show(){
    count.textContent=sessionPhotos[kind].length+' ausgewählt';preview.replaceChildren();
    sessionPhotos[kind].forEach((src,index)=>{
     const tile=el('figure','cleaning-photo-tile'),image=el('img');image.src=src;image.alt=name+'-Foto '+(index+1);
     const del=makeButton('✕ Entfernen',()=>{sessionPhotos[kind].splice(index,1);show();},'room-btn cleaning-photo-remove');
     del.setAttribute('aria-label',name+'-Foto '+(index+1)+' entfernen');tile.append(image,del);preview.append(tile);
    });
   }
   input.addEventListener('change',async()=>{
    const files=Array.from(input.files||[]);input.value='';if(!files.length)return;
    sessionPhotos.processing=(sessionPhotos.processing||0)+1;input.disabled=true;status.textContent=files.length+' Foto(s) werden verarbeitet …';let added=0;const errors=[];
    try{
     for(const file of files){
      try{const result=await window.PutzmanagerPhotos.encode(file);if(result&&stagedPhotos===sessionPhotos){sessionPhotos[kind].push(result);added++;}}
      catch(e){errors.push(file.name+': '+e.message);}
     }
     if(stagedPhotos===sessionPhotos){show();status.textContent=added+' Foto(s) hinzugefügt.'+(errors.length?' Fehler: '+errors.join(' | '):'');}
    }finally{sessionPhotos.processing--;input.disabled=false;}
   });
   section.append(head,input,preview,status);wrapper.append(section);show();
  }
  content.append(wrapper);
 }
 function addTimer(content){stopwatch?.dispose();stopwatch=window.PutzmanagerRoomTimer.create(selectedFloor,selectedRoom);content.append(stopwatch.element);}
 async function finishCleaning(data){
  if(stagedPhotos.processing){alert('Die Fotos werden noch verarbeitet. Bitte danach erneut speichern.');return null;}
  const inv=window.PutzmanagerInventory,before=inv.get(),id=uid();let photoSaved=false;
  try{
   // Photo storage is durable IndexedDB; await it, never silently lose a photo.
   if((stagedPhotos.before.length||stagedPhotos.after.length)&&window.PutzmanagerPhotos){
    await window.PutzmanagerPhotos.put({id,at:new Date().toISOString(),roomName:selectedData().room.name,beforePhotos:[...stagedPhotos.before],afterPhotos:[...stagedPhotos.after]});photoSaved=true;
   }
   const added=inv.commit(id,selectedRoom,materials.assignmentsForSave());
   const entry=APP.recordCleaning({...data,id,at:new Date().toISOString(),floorId:selectedFloor,roomId:selectedRoom,durationSeconds:stopwatch?.seconds()||0});
   if(!entry)throw Error('Keine gültige Reinigung ausgewählt.');
   stopwatch?.complete();stopwatch=null;close();refresh();return {entry,added};
  }catch(err){
   inv.restore(before);
   if(photoSaved)try{await window.PutzmanagerPhotos.remove(id);}catch(e){console.error('Foto-Rücksetzung fehlgeschlagen',e);}
   alert('Reinigung NICHT abgeschlossen: '+err.message+' Bitte verfügbaren Speicher und Materialbestand prüfen.');return null;
  }
 }
 function renderQuick(){
  stopwatch?.dispose();stopwatch=null;const {room}=selectedData(),content=$('#cleaning-content'),clean=CLEAN.sanitize(room.cleanliness);content.replaceChildren();
  content.append(blockTitle('Schnellreinigung','Alle Bereiche sind zunächst ausgewählt. Entferne das Häkchen bei Flächen, die du NICHT gereinigt hast.'));
  const choices=el('div','cleaning-checklist'),inputs=[];
  for(const group of TASKS.taskGroups(clean)){
   const label=el('label','cleaning-check-row');const cb=el('input');cb.type='checkbox';cb.checked=true;cb.value=group.id;
   const text=el('span','',group.name);label.append(cb,text);choices.append(label);inputs.push(cb);
  }
  content.append(choices);addTimer(content);addPhotos(content);if(window.PutzmanagerKnowledge)content.append(window.PutzmanagerKnowledge.forRoom(room.name));materials=window.PutzmanagerMaterials.create(selectedRoom);content.append(materials.element);materials.fill([{id:'room',name:'Material für diesen Raum'}]);const notes=notesInput();content.append(formLabel('Notiz',notes));
  content.append(makeButton('✓ Reinigung speichern',()=>{
   const targets=inputs.filter(c=>c.checked).map(c=>c.value);if(!targets.length){alert('Bitte mindestens einen gereinigten Bereich wählen.');return;}
   if(!materials.confirmAfter())return;finishCleaning({mode:'quick',targets,notes:notes.value});
  },'room-primary cleaning-submit'));
 }
 function renderDetail(){
  const {room}=selectedData(),content=$('#cleaning-content'),groups=TASKS.taskGroups(CLEAN.sanitize(room.cleanliness));content.replaceChildren();
  content.append(blockTitle('Reinigung mit Checkliste','Hake nur erledigte Aufgaben ab. Bei mehreren Aufgaben steigt der Bereichswert anteilig; 100 % erst bei vollständiger Liste.'));
  const checks=[];
  for(const group of groups){if(!group.tasks.length)continue;
   content.append(el('h4','cleaning-group-title',group.name));
   for(const task of group.tasks){const label=el('label','cleaning-check-row');const checkbox=el('input');checkbox.type='checkbox';checkbox.value=task.id;
    const t=el('span','',task.text),due=el('small','',TASKS.status(task));label.append(checkbox,t,due);content.append(label);checks.push(checkbox);}
  }
  if(!checks.length)content.append(el('p','room-note','Für diesen Raum sind noch keine Aufgaben angelegt. Lege zuerst passende Aufgaben an.'));
  addTimer(content);addPhotos(content);if(window.PutzmanagerKnowledge)content.append(window.PutzmanagerKnowledge.forRoom(room.name));const manage=makeButton('✏️ Aufgaben verwalten',()=>{mode='tasks';render();});content.append(manage);
  materials=window.PutzmanagerMaterials.create(selectedRoom);content.append(materials.element);
  const updateMaterials=()=>{const chosen=checks.filter(c=>c.checked);materials.fill(chosen.map(c=>({id:c.value,name:groups.flatMap(g=>g.tasks).find(t=>t.id===c.value)?.text||'Aufgabe'})));};
  for(const c of checks)c.addEventListener('change',updateMaterials);updateMaterials();
  const notes=notesInput();content.append(formLabel('Notiz',notes));
  const finish=makeButton('✓ Erledigte Aufgaben dokumentieren',()=>{
   const taskIds=checks.filter(c=>c.checked).map(c=>c.value);if(!taskIds.length){alert('Bitte mindestens eine erledigte Aufgabe auswählen.');return;}
   if(!materials.confirmAfter())return;finishCleaning({mode:'detail',taskIds,notes:notes.value});
  },'room-primary cleaning-submit');finish.disabled=!checks.length;content.append(finish);
 }
 function render(){if(mode==='tasks')renderManager();else if(mode==='quick')renderQuick();else if(mode==='detail')renderDetail();}
 $('#cleaning-room-picker').addEventListener('change',refreshPicker);
 [['cleaning-room-quick','quick'],['cleaning-room-detail','detail'],['cleaning-room-manage','tasks']].forEach(([id,action])=>$('#'+id).addEventListener('click',()=>openSelected(action)));
 $('#cleaning-close').addEventListener('click',close);
 $('#cleaning-overlay').addEventListener('click',e=>{if(e.target===$('#cleaning-overlay'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cleaning-overlay').hidden){e.preventDefault();close();}});
 window.PutzmanagerCleaning={open,openSelected,refresh,close,focusPicker:()=>$('#cleaning-room-picker')?.focus()};refresh();
})();
