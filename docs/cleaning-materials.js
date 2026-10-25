/* Flexible material chooser: per-room and per-task memory; draft is not a stock movement. */
(function(root){'use strict';
 const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
 const makeId=()=>globalThis.crypto?.randomUUID?.()||'putz-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 function create(roomId){
  const api=()=>root.PutzmanagerInventory, model=()=>root.PutzmanagerInventoryModel;
  const outer=el('section','clean-materials'),title=el('h3','','🧺 Benötigte Materialien'),hint=el('p','room-note','Vorausgewählt aus der letzten Reinigung. Häkchen kannst du ändern. Nur bestätigte Verwendung zählt.');
  outer.append(title,hint);
  const modeSelect=el('select','cleaning-select');[['during','Jetzt / während des Putzens abhaken'],['after','Nach dem Putzen abhaken']].forEach(([id,label])=>{const o=el('option','',label);o.value=id;modeSelect.append(o);});
  try{modeSelect.value=localStorage.getItem('mein-putzmanager-material-mode')==='after'?'after':'during';}catch{}
  outer.append(el('label','cleaning-group-title','Wann erfassen?'),modeSelect);
  let deferred=false,assignments=[],draft=new Map(),currentGroups=[];
  const content=el('div','material-groups');outer.append(content);
  function restore(key){if(!draft.has(key))draft.set(key,new Set((api()?.suggestions(roomId,key==='room'?'':key)||[]).length?api().suggestions(roomId,key==='room'?'':key):(api()?.getSelected()||[])));return draft.get(key);}
  function fill(groups){currentGroups=groups.map(g=>({id:g.id,name:g.name}));content.replaceChildren();
   for(const group of groups){const selected=restore(group.id),card=el('div','material-group');card.append(el('h4','',group.name));
    const items=api()?.get().items||[];
    if(!items.length)card.append(el('p','room-note','Noch keine Lagerartikel. Unter Mehr → Putzlager hinzufügen.'));
    for(const item of items){const line=el('label','material-check-row'),check=el('input');check.type='checkbox';check.checked=selected.has(item.id);check.dataset.item=item.id;const name=el('span','',`${model()?.icons[item.icon]||'📦'} ${item.name}`);const level=el('select','material-dose');[['0.5','Wenig'],['1','Normal'],['2','Viel']].forEach(([value,text])=>{const o=el('option','',text);o.value=value;level.append(o);});level.setAttribute('aria-label','Verbrauchsintensität für '+item.name);level.hidden=model()?.categoryType(api()?.get(),item.category)!=='mittel';
     check.addEventListener('change',()=>{if(check.checked)selected.add(item.id);else selected.delete(item.id);});line.append(check,name,level);card.append(line);
    }
    content.append(card);
   }
   if(!groups.length)content.append(el('p','room-note','Bitte zuerst mindestens eine Aufgabe auswählen.'));
   deferred=false;applyVisibility();
  }
  function applyVisibility(){content.hidden=modeSelect.value==='after'&&!deferred;hint.textContent=modeSelect.value==='after'?'Die Artikel werden vor dem Speichern der Reinigung eingeblendet. Die letzte Auswahl bleibt gespeichert.':'Hake deine tatsächlich verwendeten Artikel jetzt oder während der Reinigung ab. Eine Buchung erfolgt beim Speichern.';}
  modeSelect.addEventListener('change',()=>{try{localStorage.setItem('mein-putzmanager-material-mode',modeSelect.value);}catch{}applyVisibility();});
  function confirmAfter(){if(modeSelect.value==='after'&&!deferred){deferred=true;applyVisibility();outer.scrollIntoView({behavior:'smooth',block:'start'});return false;}return true;}
  function assignmentsForSave(){const result=[];for(const [i,group] of currentGroups.entries()){const node=content.children[i],ids=[],weights={};for(const input of node.querySelectorAll('input[data-item]')){if(input.checked){ids.push(input.dataset.item);weights[input.dataset.item]=Number(input.parentElement.querySelector('select')?.value)||1;}}result.push({taskId:group.id==='room'?'':group.id,ids,weights});}return result;}
  return {element:outer,fill,confirmAfter,assignmentsForSave,newSessionId:makeId};
 }
 root.PutzmanagerMaterials={create};
})(window);
