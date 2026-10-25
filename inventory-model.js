/* U16 – Putzlager: pure, browser/Node-compatible catalog and filter rules.
   Item editing/smart use accounting are reserved for U17–U22. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PutzmanagerInventoryModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const categories=Object.freeze({mittel:'Putzmittel',zubehoer:'Zubehör',geraete:'Reinigungsgeräte'});
 const modes=['list','grid'];
 const sorts=['name','newest','oldest','category','location','stock'];
 const statuses=['all','favorite','low','missing','incomplete'];
 const safeText=(v,max=100)=>typeof v==='string'?v.trim().slice(0,max):'';
 const numeric=(n)=>Number.isFinite(Number(n))&&n!==''&&n!==null?Math.max(0,Math.min(999999,Math.round(Number(n)*100)/100)):0;
 const validDate=(x)=>typeof x==='string'&&!Number.isNaN(Date.parse(x))?x:new Date().toISOString();
 function normalize(raw){
   if(!raw||typeof raw!=='object'||!categories[raw.category])return null;
   const name=safeText(raw.name,90);if(!name)return null;
   return {id:safeText(raw.id,100)||cryptoId(),name,category:raw.category,location:safeText(raw.location,70),quantity:numeric(raw.quantity),unit:safeText(raw.unit,25)||'Stück',minimum:numeric(raw.minimum),favorite:raw.favorite===true,createdAt:validDate(raw.createdAt),updatedAt:validDate(raw.updatedAt||raw.createdAt)};
 }
 function cryptoId(){return globalThis.crypto?.randomUUID?.()||`lager-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
 function sanitize(raw){const items=Array.isArray(raw?.items)?raw.items:[];const seen=new Set();return {items:items.slice(-3000).map(normalize).filter(x=>x&&!seen.has(x.id)&&seen.add(x.id)),view:modes.includes(raw?.view)?raw.view:'list',sort:sorts.includes(raw?.sort)?raw.sort:'name',search:safeText(raw?.search,120),category:categories[raw?.category]?raw.category:'all',status:statuses.includes(raw?.status)?raw.status:'all',location:safeText(raw?.location,70)};}
 function status(item){if(item.quantity===0)return 'missing';if(item.minimum>0&&item.quantity<=item.minimum)return 'low';return 'ok';}
 function incomplete(item){return !item.location;}
 const collator=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
 function filter(raw,options={}){
   const s=sanitize(raw);const query=safeText(options.search??s.search,120).toLocaleLowerCase('de');
   const category=options.category??s.category;const location=options.location??s.location;const condition=options.status??s.status;const sort=options.sort??s.sort;
   const matches=s.items.filter(x=>(category==='all'||x.category===category)&&(!location||x.location===location)&&(!query||[x.name,x.location,x.unit,categories[x.category]].join(' ').toLocaleLowerCase('de').includes(query))&&(condition==='all'||(condition==='favorite'&&x.favorite)||(condition==='low'&&status(x)==='low')||(condition==='missing'&&status(x)==='missing')||(condition==='incomplete'&&incomplete(x))));
   return matches.sort((a,b)=>{
     let cmp=0;
     if(sort==='newest')cmp=Date.parse(b.createdAt)-Date.parse(a.createdAt);
     else if(sort==='oldest')cmp=Date.parse(a.createdAt)-Date.parse(b.createdAt);
     else if(sort==='category')cmp=collator.compare(categories[a.category],categories[b.category]);
     else if(sort==='location')cmp=collator.compare(a.location,b.location);
     else if(sort==='stock')cmp=a.quantity-b.quantity;
     else cmp=collator.compare(a.name,b.name);
     return cmp||collator.compare(a.name,b.name)||collator.compare(a.id,b.id);
   });
 }
 function summary(raw){const items=sanitize(raw).items;return {total:items.length,favorite:items.filter(x=>x.favorite).length,low:items.filter(x=>status(x)==='low').length,missing:items.filter(x=>status(x)==='missing').length,incomplete:items.filter(incomplete).length};}
 function add(raw,details,now=new Date().toISOString()){
   const s=sanitize(raw);const item=normalize({...details,id:cryptoId(),createdAt:now,updatedAt:now});if(!item)throw Error('Name und gültige Kategorie erforderlich');
   s.items.push(item);return {state:s,item};
 }
 function setFavorite(raw,id,flag){const s=sanitize(raw),item=s.items.find(x=>x.id===id);if(!item)return s;item.favorite=Boolean(flag);item.updatedAt=new Date().toISOString();return s;}
 return {categories,normalize,sanitize,status,incomplete,filter,summary,add,setFavorite};
});