/* Mein Putzmanager – product inventory, editable items and confirmed use records. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PutzmanagerInventoryModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const categories=Object.freeze({mittel:'Putzmittel',zubehoer:'Zubehör',geraete:'Reinigungsgeräte'});
 const defaultCategories=Object.freeze(Object.entries(categories).map(([id,name])=>({id,name,type:id})));
 const validTypes=Object.keys(categories);
 function normalizeCategories(raw){
  if(!Array.isArray(raw))return defaultCategories.map(x=>({...x}));
  const result=[],ids=new Set(),names=new Set();
  for(const c of raw.slice(0,100)){
   if(!c||typeof c!=='object')continue;
   const id=safeText(c.id,100),name=safeText(c.name,50),type=c.type;
   if(!id||!name||!validTypes.includes(type)||ids.has(id)||names.has(name.toLocaleLowerCase('de')))continue;
   ids.add(id);names.add(name.toLocaleLowerCase('de'));result.push({id,name,type});
  }
  return result.length?result:defaultCategories.map(x=>({...x}));
 }
 function categoryType(raw,id){const defs=Array.isArray(raw)?raw:normalizeCategories(raw?.categories);return defs.find(x=>x.id===id)?.type||null;}
 function categoryName(raw,id){const defs=Array.isArray(raw)?raw:normalizeCategories(raw?.categories);return defs.find(x=>x.id===id)?.name||'Unbekannt';}
 function createCategory(raw,name,type){
  const s=sanitize(raw),clean=safeText(name,50);
  if(!clean)throw Error('Bitte einen Kategorienamen eingeben.');
  if(!validTypes.includes(type))throw Error('Bitte eine Artikelart auswählen.');
  if(s.categories.length>=100)throw Error('Maximal 100 Kategorien möglich.');
  if(s.categories.some(x=>x.name.toLocaleLowerCase('de')===clean.toLocaleLowerCase('de')))throw Error('Diese Kategorie gibt es bereits.');
  const id='cat-'+cryptoId();s.categories.push({id,name:clean,type});return {state:s,category:s.categories.at(-1)};
 }
 function renameCategory(raw,id,name){
  const s=sanitize(raw),category=s.categories.find(x=>x.id===id),clean=safeText(name,50);
  if(!category)throw Error('Kategorie wurde nicht gefunden.');
  if(!clean)throw Error('Der Kategoriename darf nicht leer sein.');
  if(s.categories.some(x=>x.id!==id&&x.name.toLocaleLowerCase('de')===clean.toLocaleLowerCase('de')))throw Error('Diese Kategorie gibt es bereits.');
  category.name=clean;return {state:s,category};
 }
 function deleteCategory(raw,id,replacementId){
  const s=sanitize(raw),category=s.categories.find(x=>x.id===id);
  if(!category)throw Error('Kategorie wurde nicht gefunden.');
  if(s.categories.length<=1)throw Error('Die letzte Kategorie kann nicht gelöscht werden.');
  const affected=s.items.filter(x=>x.category===id);
  if(affected.length){
   const replacement=s.categories.find(x=>x.id===replacementId&&x.id!==id);
   if(!replacement||replacement.type!==category.type)throw Error('Bitte eine andere Kategorie derselben Artikelart als Ziel wählen.');
   for(const item of affected)item.category=replacement.id;
  }
  s.categories=s.categories.filter(x=>x.id!==id);
  if(s.category===id)s.category='all';
  return {state:s,moved:affected.length};
 }
 const icons=Object.freeze({bottle:'🧴',spray:'🫧',glovesBlue:'🧤',glovesWhite:'🧤',glovesPink:'🧤',dishcloth:'🟨',cloth:'🧻',sponge:'🧽',brush:'🪥',broom:'🧹',bucket:'🪣',vacuum:'🌀',device:'⚙️',paper:'🧻',other:'📦'});
 const iconColors=Object.freeze({glovesBlue:'#4caaff',glovesWhite:'#f4f4ef',glovesPink:'#ff83b9',dishcloth:'#f2c464',cloth:'#74d1c8'});
 const handlingModes=Object.freeze({liquid:'🧴 Flüssigmittel: Verwendungen zählen (Flasche erst bei „leer“ abziehen)',consume:'🗑️ Einweg: bei Reinigung 1 Einheit abziehen',wash:'🧺 Waschbar: 1 Einheit zu „Wäsche“ verschieben',durable:'♻️ Dauerhaft: Verwendung dokumentieren, nichts abziehen'});
 function handlingFor(raw,family){
  if(Object.hasOwn(handlingModes,raw.handling))return raw.handling;
  const term=String(raw.name||'').toLocaleLowerCase('de');
  const icon=raw.icon||'';
  if(['dishcloth','cloth'].includes(icon)||/geschirr.?t(?:uch|ücher)|putz.?t(?:uch|ücher)|mikrofaser|spül.?t(?:uch|ücher)|waschlappen|putzfetzen|putzlappen|putztlappen|reinigungslappen|spüllappen/.test(term))return 'wash';
  if(['glovesWhite','glovesPink','glovesBlue','paper'].includes(icon)||/handschuh|einweg|küchenrolle|küchenpapier|müllbeutel/.test(term))return raw.reusable===true?'wash':'consume';
  if(family==='geraete')return 'durable';
  if(family==='mittel')return 'liquid';
  return raw.reusable===false?'consume':'durable';
 }
 const available=item=>item.handling==='wash'?Math.max(0,item.quantity-item.dirtyQuantity):item.quantity;
 const modes=['list','grid'],sorts=['name','newest','oldest','category','location','stock'],statuses=['all','favorite','low','missing','incomplete'];
 const safeText=(v,max=100)=>typeof v==='string'?v.trim().slice(0,max):'';
 const numeric=n=>Number.isFinite(Number(n))&&n!==''&&n!==null?Math.max(0,Math.min(999999,Math.round(Number(n)*100)/100)):0;
 const validDate=x=>typeof x==='string'&&!Number.isNaN(Date.parse(x))?x:new Date().toISOString();
 const cryptoId=()=>globalThis.crypto?.randomUUID?.()||`lager-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 function normalize(raw,categoryDefs=defaultCategories){
  if(!raw||typeof raw!=='object'||!categoryType(categoryDefs,raw.category))return null;
  const family=categoryType(categoryDefs,raw.category);
  const name=safeText(raw.name,90);if(!name)return null;const handling=handlingFor(raw,family),quantity=numeric(raw.quantity);const dirtyQuantity=handling==='wash'?Math.min(Math.floor(quantity),Math.floor(numeric(raw.dirtyQuantity))):0;
  const washTemperature=[30,40,60,90].includes(Number(raw.washTemperature))?Number(raw.washTemperature):null;
  const photos=Array.isArray(raw.photos)?raw.photos.slice(0,3).filter(p=>typeof p==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(p)&&p.length<140000):[];
  return {id:safeText(raw.id,100)||cryptoId(),name,category:raw.category,location:safeText(raw.location,70),quantity,dirtyQuantity,handling,washTemperature,unit:safeText(raw.unit,25)||'Stück',minimum:numeric(raw.minimum),favorite:raw.favorite===true,icon:icons[raw.icon]?raw.icon:(family==='mittel'?'bottle':family==='geraete'?'device':'sponge'),brand:safeText(raw.brand,80),model:safeText(raw.model,80),notes:safeText(raw.notes,500),photos,reusable:raw.reusable===true||(raw.reusable===undefined&&family==='zubehoer'&&raw.icon!=='paper'),usageCount:Math.floor(numeric(raw.usageCount)),usageWeighted:numeric(raw.usageWeighted),activeBottleId:safeText(raw.activeBottleId,120),bottleUses:Math.floor(numeric(raw.bottleUses)),bottleWeighted:numeric(raw.bottleWeighted),samples:Array.isArray(raw.samples)?raw.samples.slice(-40).filter(v=>v&&numeric(v.weighted)>0).map(v=>({weighted:numeric(v.weighted),uses:Math.floor(numeric(v.uses)),at:validDate(v.at)})):[],createdAt:validDate(raw.createdAt),updatedAt:validDate(raw.updatedAt||raw.createdAt)};
 }
 function sanitize(raw){const categoryDefs=normalizeCategories(raw?.categories),items=Array.isArray(raw?.items)?raw.items:[],seen=new Set();const presets={};for(const [key,v] of Object.entries(raw?.presets&&typeof raw.presets==='object'?raw.presets:{}).slice(-500)){if(key.length>240)continue;presets[key]=Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,50):[];}
  return {categories:categoryDefs,items:items.slice(-3000).map(x=>normalize(x,categoryDefs)).filter(x=>x&&!seen.has(x.id)&&seen.add(x.id)),view:modes.includes(raw?.view)?raw.view:'list',sort:sorts.includes(raw?.sort)?raw.sort:'name',search:safeText(raw?.search,120),category:categoryType(categoryDefs,raw?.category)?raw.category:'all',status:statuses.includes(raw?.status)?raw.status:'all',location:safeText(raw?.location,70),presets,uses:Array.isArray(raw?.uses)?raw.uses.slice(-3000).filter(x=>x&&typeof x.sessionId==='string'&&typeof x.itemId==='string').map(x=>({...x,weight:[0.5,1,2].includes(x.weight)?x.weight:1})):[]};}
 function status(item){if(available(item)===0)return 'missing';if(item.minimum>0&&available(item)<=item.minimum)return 'low';return 'ok';}
 const incomplete=item=>!item.location;
 const collator=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
 function filter(raw,options={}){
  const s=sanitize(raw),query=safeText(options.search??s.search,120).toLocaleLowerCase('de'),category=options.category??s.category,location=options.location??s.location,condition=options.status??s.status,sort=options.sort??s.sort;
  const matches=s.items.filter(x=>(category==='all'||x.category===category)&&(!location||x.location===location)&&(!query||[x.name,x.location,x.unit,x.brand,categoryName(s.categories,x.category)].join(' ').toLocaleLowerCase('de').includes(query))&&(condition==='all'||(condition==='favorite'&&x.favorite)||(condition==='low'&&status(x)==='low')||(condition==='missing'&&status(x)==='missing')||(condition==='incomplete'&&incomplete(x))));
  return matches.sort((a,b)=>{let cmp=0;if(sort==='newest')cmp=Date.parse(b.createdAt)-Date.parse(a.createdAt);else if(sort==='oldest')cmp=Date.parse(a.createdAt)-Date.parse(b.createdAt);else if(sort==='category')cmp=collator.compare(categoryName(s.categories,a.category),categoryName(s.categories,b.category));else if(sort==='location')cmp=collator.compare(a.location,b.location);else if(sort==='stock')cmp=available(a)-available(b);else cmp=collator.compare(a.name,b.name);return cmp||collator.compare(a.name,b.name)||collator.compare(a.id,b.id);});
 }
 function summary(raw){const items=sanitize(raw).items;return {total:items.length,favorite:items.filter(x=>x.favorite).length,low:items.filter(x=>status(x)==='low').length,missing:items.filter(x=>status(x)==='missing').length,incomplete:items.filter(incomplete).length};}
 function add(raw,details,now=new Date().toISOString()){const s=sanitize(raw),item=normalize({...details,id:cryptoId(),createdAt:now,updatedAt:now},s.categories);if(!item)throw Error('Name und gültige Kategorie erforderlich');s.items.push(item);return {state:s,item};}
 function update(raw,id,changes,now=new Date().toISOString()){const s=sanitize(raw),i=s.items.findIndex(x=>x.id===id);if(i<0)throw Error('Artikel nicht vorhanden');const old=s.items[i],item=normalize({...old,...changes,id,createdAt:old.createdAt,updatedAt:now,usageCount:old.usageCount,usageWeighted:old.usageWeighted,bottleUses:old.bottleUses,bottleWeighted:old.bottleWeighted,activeBottleId:old.activeBottleId,samples:old.samples},s.categories);if(!item)throw Error('Ungültiger Artikel');s.items[i]=item;return {state:s,item};}
 function setFavorite(raw,id,flag){return update(raw,id,{favorite:Boolean(flag)}).state;}
 const presetKey=(roomId,taskId='')=>`${String(roomId).slice(0,120)}|${String(taskId).slice(0,120)||'room'}`;
 function suggestions(raw,roomId,taskId=''){const s=sanitize(raw);const exact=s.presets[presetKey(roomId,taskId)],fallback=s.presets[presetKey(roomId)];return (exact||fallback||[]).filter(id=>s.items.some(x=>x.id===id));}
 function registerUse(raw,input,now=new Date().toISOString()){
  const s=sanitize(raw),sessionId=safeText(input?.sessionId,120),roomId=safeText(input?.roomId,120);
  if(!sessionId||!roomId)throw Error('Reinigungssitzung fehlt');
  const assignments=Array.isArray(input.assignments)?input.assignments:[];const unique=new Map();const presets={};
  for(const a of assignments){const taskId=safeText(a.taskId,120),key=presetKey(roomId,taskId);presets[key]=[...new Set((Array.isArray(a.ids)?a.ids:[]).filter(id=>s.items.some(x=>x.id===id)))];for(const id of presets[key]){const weight=[0.5,1,2].includes(Number(a.weights?.[id]))?Number(a.weights[id]):1;if(!unique.has(id)||unique.get(id).weight<weight)unique.set(id,{weight,taskId});}}
  // Validate the entire booking first: never partly debit stock when a later article is empty.
  for(const [id] of unique){const item=s.items.find(x=>x.id===id);if(!item||s.uses.some(x=>x.sessionId===sessionId&&x.itemId===id))continue;
   if(['consume','wash'].includes(item.handling)&&available(item)<1)throw Error(`„${item.name}“: kein sauberer/verfügbarer Bestand. Im Lager auffüllen oder Wäsche abschließen.`);
   if(item.handling==='liquid'&&item.quantity<1)throw Error(`„${item.name}“: keine Flasche auf Lager.`);
  }
  // Presets are only saved with a successful, validated cleaning.
  for(const [key,ids] of Object.entries(presets))s.presets[key]=ids;
  s.presets[presetKey(roomId)]=[...unique.keys()];
  const added=[];
  for(const [id,{weight,taskId}] of unique){const item=s.items.find(x=>x.id===id);if(!item||s.uses.some(x=>x.sessionId===sessionId&&x.itemId===id))continue;
   const event={sessionId,itemId:id,roomId,taskId,at:now,weight,handling:item.handling};
   if(item.handling==='liquid'){if(!item.activeBottleId)item.activeBottleId=cryptoId();event.bottleId=item.activeBottleId;item.usageCount++;item.usageWeighted+=weight;item.bottleUses++;item.bottleWeighted+=weight;}
   else if(item.handling==='consume'){item.quantity=Math.max(0,item.quantity-1);event.quantityDebited=1;}
   else if(item.handling==='wash'){item.dirtyQuantity++;event.movedToLaundry=1;}
   item.updatedAt=now;s.uses.push(event);added.push(event);
  }
  s.uses=s.uses.slice(-3000);return {state:s,added};
 }
 function markForLaundry(raw,id,count=1,now=new Date().toISOString()){
  const s=sanitize(raw),item=s.items.find(x=>x.id===id);
  if(!item||item.handling!=='wash')throw Error('Artikel ist nicht als waschbar eingestellt.');
  const n=Number(count);if(!Number.isInteger(n)||n<1||n>available(item))throw Error('Ungültige Anzahl – es müssen genügend saubere Artikel verfügbar sein.');
  item.dirtyQuantity+=n;item.updatedAt=now;return {state:s,item};
 }
 function markWashed(raw,id,count=1,now=new Date().toISOString()){
  const s=sanitize(raw),item=s.items.find(x=>x.id===id);
  if(!item||item.handling!=='wash')throw Error('Artikel ist nicht als waschbar eingestellt.');
  const n=Number(count);if(!Number.isInteger(n)||n<1||n>item.dirtyQuantity)throw Error('Ungültige Anzahl – nur vorhandene schmutzige Artikel können gewaschen werden.');
  item.dirtyQuantity-=n;item.updatedAt=now;return {state:s,item};
 }
 function markBottleEmpty(raw,id,now=new Date().toISOString()){
  const s=sanitize(raw),item=s.items.find(x=>x.id===id);if(!item||item.handling!=='liquid'||!item.activeBottleId||item.bottleWeighted<=0)throw Error('Keine benutzte offene Flasche vorhanden');
  item.samples.push({weighted:item.bottleWeighted,uses:item.bottleUses,at:now});item.samples=item.samples.slice(-40);item.quantity=Math.max(0,item.quantity-1);item.activeBottleId='';item.bottleUses=0;item.bottleWeighted=0;item.updatedAt=now;return {state:s,item};
 }
 function estimate(item){if(!item.samples?.length)return null;return {sampleCount:item.samples.length,mean:Math.round(item.samples.reduce((sum,x)=>sum+x.weighted,0)/item.samples.length*10)/10};}
 return {categories,defaultCategories,normalizeCategories,categoryType,categoryName,createCategory,renameCategory,deleteCategory,handlingModes,handlingFor,available,markForLaundry,markWashed,icons,iconColors,normalize,sanitize,status,incomplete,filter,summary,add,update,setFavorite,presetKey,suggestions,registerUse,markBottleEmpty,estimate};
});
