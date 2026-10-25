/* V1.4.0.8: plan, postponement and foreground reminders without push-server. */
(()=>{'use strict';
 const M=window.PutzmanagerPlanModel,E=window.PutzmanagerEditor,K='mein-putzmanager-plan-v1';
 const $=s=>document.querySelector(s),mk=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 function load(){try{const s=JSON.parse(localStorage.getItem(K)||'{}');return {snoozes:s.snoozes&&typeof s.snoozes==='object'?s.snoozes:{},enabled:s.enabled===true,quietFrom:Number.isInteger(s.quietFrom)?s.quietFrom:22,quietTo:Number.isInteger(s.quietTo)?s.quietTo:7,lastNotified:String(s.lastNotified||'')};}catch{return {snoozes:{},enabled:false,quietFrom:22,quietTo:7,lastNotified:''};}}
 let settings=load();
 function save(){try{localStorage.setItem(K,JSON.stringify(settings));return true;}catch{alert('Putzplan-Einstellungen konnten nicht gespeichert werden.');return false;}}
 const stamp=(d)=>M.keyFromDate(d),today=()=>new Date(),tomorrow=()=>{const d=today();d.setDate(d.getDate()+1);return stamp(d);};
 function card(item){const c=mk('article','daily-task'),row=mk('div','daily-task-head');row.append(mk('strong','',item.text),mk('small','daily-time',item.minutes+' min'));c.append(row,mk('small','',item.floorName+' · '+item.roomName+' · '+item.areaName));const label=mk('small','daily-priority',item.overdue?'🔴 Überfällig':item.todayDue?'🟠 Heute fällig':'🔵 Offen');c.append(label);
  const buttons=mk('div','daily-task-buttons'),go=mk('button','room-primary','▶ Raum reinigen'),later=mk('button','room-btn','Morgen');
  go.type='button';later.type='button';go.addEventListener('click',()=>{window.PutzmanagerCleaning?.open('detail',item.floorId,item.roomId);});
  later.addEventListener('click',()=>{settings.snoozes[item.id]=tomorrow();if(save())render();});buttons.append(go,later);c.append(buttons);return c;
 }
 function quiet(date){const h=date.getHours(),start=settings.quietFrom,end=settings.quietTo;return start<end?h>=start&&h<end:h>=start||h<end;}
 async function requestNotify(){if(!('Notification'in window)){alert('Dein Browser unterstützt hier keine Systembenachrichtigungen. Die Hinweise in der App funktionieren trotzdem.');return;}
  if(Notification.permission==='denied'){alert('Benachrichtigungen wurden im Browser blockiert. Bitte in den Einstellungen freigeben.');return;}
  const permission=await Notification.requestPermission();if(permission==='granted'){settings.enabled=true;save();render();alert('Erinnerungen eingeschaltet. Hinweise erscheinen beim Öffnen der App während der erlaubten Zeiten. Keine Hintergrundzustellung.');}else alert('Ohne Browser-Erlaubnis sind nur Hinweise direkt in der App möglich.');
 }
 function maybeNotify(result){const d=today();if(!settings.enabled||quiet(d)||!result.all.length||settings.lastNotified===result.today||!('Notification'in window)||Notification.permission!=='granted')return;
  // Only notify once each day while the PWA is actually open (no unreliable background promises).
  try{new Notification('Mein Putzmanager',{body:`${result.all.length} offene/fällige Aufgaben. Starte mit ${result.selected[0]?.roomName||'deinem Putzplan'}.`});settings.lastNotified=result.today;save();}catch{ /* browser may reject foreground notifications */ }
 }
 function render(){const container=$('#daily-plan-items');if(!container)return;const result=M.build(E.get(),today(),window.PutzmanagerBeta?.getBudget?.()||30,settings.snoozes);container.replaceChildren();
  $('#daily-plan-summary').textContent=result.all.length?`${result.selected.length} Vorschläge · ca. ${result.used} von ${result.budget} Minuten · ${result.all.length} fällige/offene Aufgaben`:'Keine fälligen Aufgaben. Lege im Bereich Putzen zuerst Aufgaben an.';
  if(!result.selected.length){container.append(mk('p','room-note',result.all.length?'Für das Zeitbudget passen keine Aufgaben. Wähle ein größeres Budget.':'Alles erledigt oder derzeit nichts fällig.'));}
  result.selected.forEach(item=>container.append(card(item)));
  if(result.remaining.length){container.append(mk('h3','daily-subheading','Weitere Aufgaben ('+result.remaining.length+')'));const extra=mk('details','daily-extra');extra.append(mk('summary','','Weitere Vorschläge zeigen'));result.remaining.forEach(item=>extra.append(card(item)));container.append(extra);}
  const status=$('#plan-reminders-status');if(status)status.textContent=settings.enabled?'Aktiv beim Öffnen der App; Ruhezeit '+String(settings.quietFrom).padStart(2,'0')+'–'+String(settings.quietTo).padStart(2,'0')+' Uhr.':'Ausgeschaltet · Tagesübersicht bleibt verfügbar.';
  const toggle=$('#plan-reminders-enable');if(toggle)toggle.checked=settings.enabled;
  maybeNotify(result);
 }
 $('#plan-reminders-enable')?.addEventListener('change',e=>{if(e.target.checked){e.target.checked=false;requestNotify();}else{settings.enabled=false;save();render();}});
 $('#plan-reminders-quiet-from')?.addEventListener('change',e=>{settings.quietFrom=Number(e.target.value);save();render();});
 $('#plan-reminders-quiet-to')?.addEventListener('change',e=>{settings.quietTo=Number(e.target.value);save();render();});
 for(const select of [$('#plan-reminders-quiet-from'),$('#plan-reminders-quiet-to')])for(let hour=0;hour<24;hour++){const o=document.createElement('option');o.value=String(hour);o.textContent=String(hour).padStart(2,'0')+':00';select.append(o);}
 $('#plan-reminders-quiet-from').value=String(settings.quietFrom);$('#plan-reminders-quiet-to').value=String(settings.quietTo);
 window.addEventListener('focus',render);
 document.addEventListener('putzmanager:homechange',render);
 window.PutzmanagerPlan={render};render();
})();
