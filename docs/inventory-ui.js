/* U16 catalog UI. No consumption is booked when selecting a product. */
(()=>{'use strict';
const M=window.PutzmanagerInventoryModel;
const KEY='mein-putzmanager-inventory-v1';
const $=s=>document.querySelector(s);
const list=$('#inventory-items');if(!M||!list)return;
let state;let persistent=true;let source='more';let selected=new Set();
const emptyState=()=>M.sanitize({});
try{state=M.sanitize(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{state=emptyState();persistent=false;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));persistent=true;$('#inventory-storage-notice').hidden=true;}catch{persistent=false;$('#inventory-storage-notice').hidden=false;}}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function refresh(){
 const stats=M.summary(state),items=M.filter(state);
 $('#inventory-count').textContent=`${items.length} von ${stats.total} Artikeln`;
 $('#inventory-warning-count').textContent=`${stats.low+stats.missing} Vorratswarnungen`;
 $('#inventory-warning-count').hidden=stats.low+stats.missing===0;
 $('#inventory-view-list').setAttribute('aria-pressed',String(state.view==='list'));
 $('#inventory-view-grid').setAttribute('aria-pressed',String(state.view==='grid'));
 list.className=`inventory-items inventory-${state.view}`;list.replaceChildren();
 const locations=[...new Set(state.items.map(x=>x.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
 const locationSelect=$('#inventory-location');locationSelect.replaceChildren(new Option('Alle Lagerorte',''));
 for(const loc of locations)locationSelect.add(new Option(loc,loc));locationSelect.value=state.location;
 $('#inventory-search').value=state.search;$('#inventory-category').value=state.category;$('#inventory-status').value=state.status;$('#inventory-sort').value=state.sort;
 $('#inventory-selection').hidden=source!=='clean';
 if(!items.length){const msg=node('div','inventory-empty');msg.append(node('strong','',state.items.length?'Keine passenden Artikel.':'Dein Putzlager ist noch leer.'),node('p','',state.items.length?'Ändere Suche oder Filter, um weitere Artikel zu sehen.':'Füge dein erstes Putzmittel, Zubehör oder Reinigungsgerät hinzu.'));list.append(msg);}
 for(const item of items){
  const card=node('article','inventory-card');card.dataset.itemId=item.id;
  const top=node('div','inventory-card-top');const emblem=node('span','inventory-emblem',item.category==='mittel'?'🧴':item.category==='zubehoer'?'🧽':'🧹');
  const main=node('div','inventory-card-main');main.append(node('strong','',item.name),node('small','',`${M.categories[item.category]} · ${item.location||'Lagerort fehlt'}`));
  top.append(emblem,main);
  const fav=node('button','inventory-fav',item.favorite?'★':'☆');fav.type='button';fav.dataset.action='favorite';fav.dataset.id=item.id;fav.setAttribute('aria-label',`${item.favorite?'Favorit entfernen':'Als Favorit merken'}: ${item.name}`);fav.setAttribute('aria-pressed',String(item.favorite));top.append(fav);card.append(top);
  const foot=node('div','inventory-card-bottom');foot.append(node('span','inventory-quantity',`${new Intl.NumberFormat('de-AT').format(item.quantity)} ${item.unit}`));
  const stat=M.status(item);if(stat!=='ok'){const tag=node('span',`inventory-tag ${stat}`,stat==='missing'?'Fehlt':'Fast leer');foot.append(tag);}
  if(M.incomplete(item)){foot.append(node('span','inventory-tag incomplete','Unvollständig'));}
  card.append(foot);
  if(source==='clean'){
    const button=node('button','inventory-choose',selected.has(item.id)?'✓ Vorgemerkt':'Für Reinigung vormerken');button.type='button';button.dataset.action='select';button.dataset.id=item.id;button.setAttribute('aria-pressed',String(selected.has(item.id)));card.append(button);
  }
  list.append(card);
 }
 const names=state.items.filter(x=>selected.has(x.id)).map(x=>x.name);
 $('#inventory-selection-count').textContent=`${names.length} Produkt${names.length===1?'':'e'} vorgemerkt`;
 $('#clean-supplies-display').textContent=names.length?`Für nächste Reinigung vorgemerkt: ${names.join(', ')}. Noch keine Verbrauchsbuchung.`:'Noch keine Putzmittel für die nächste Reinigung vorgemerkt.';
}
function show(from='more'){
 source=from==='clean'?'clean':'more';
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-inventory'));
 document.querySelectorAll('.nav-button').forEach(b=>{const active=b.dataset.nav===source;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 refresh();window.scrollTo({top:0,behavior:'instant'});$('#inventory-heading').focus({preventScroll:true});
}
function close(){const target=document.querySelector(`.nav-button[data-nav="${source}"]`);target?.click();}
$('#inventory-back').addEventListener('click',close);
$('#inventory-open-more').addEventListener('click',()=>show('more'));
$('#inventory-open-clean').addEventListener('click',()=>show('clean'));
$('#inventory-selection-done').addEventListener('click',close);
for(const [id,key] of [['inventory-search','search'],['inventory-category','category'],['inventory-status','status'],['inventory-sort','sort'],['inventory-location','location']]){
 $('#'+id).addEventListener(id==='inventory-search'?'input':'change',e=>{state[key]=e.target.value;save();refresh();});
}
for(const mode of ['list','grid'])$('#inventory-view-'+mode).addEventListener('click',()=>{state.view=mode;save();refresh();});
list.addEventListener('click',e=>{
 const action=e.target.closest('[data-action]');if(!action)return;
 if(action.dataset.action==='favorite'){state=M.setFavorite(state,action.dataset.id,!state.items.find(x=>x.id===action.dataset.id)?.favorite);save();refresh();}
 if(action.dataset.action==='select'){const id=action.dataset.id;if(selected.has(id))selected.delete(id);else selected.add(id);refresh();}
});
$('#inventory-add').addEventListener('click',()=>{$('#inventory-add-form').hidden=false;$('#inventory-name').focus();});
$('#inventory-cancel').addEventListener('click',()=>{$('#inventory-add-form').hidden=true;$('#inventory-add-form').reset();});
$('#inventory-add-form').addEventListener('submit',e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget);
 try{const out=M.add(state,{name:fd.get('name'),category:fd.get('category'),location:fd.get('location'),quantity:fd.get('quantity'),unit:fd.get('unit'),minimum:fd.get('minimum')});state=out.state;save();$('#inventory-add-form').reset();$('#inventory-add-form').hidden=true;state.search='';state.category='all';state.location='';state.status='all';save();refresh();}catch(err){$('#inventory-form-error').textContent=err.message;}
});
refresh();window.PutzmanagerInventory={open:show,closeView:close,get:()=>structuredClone(state),storageKey:KEY};
})();