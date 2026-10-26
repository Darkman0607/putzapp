/* V1.4.0.18: persistent background stopwatch and room time learning. */
(function(root){'use strict';
 const KEY='mein-putzmanager-room-timers-v1';
 const now=()=>Date.now();
 const fmt=s=>{const h=Math.floor(s/3600),m=String(Math.floor((s%3600)/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');return h?`${h}:${m}:${sec}`:`${m}:${sec}`;};
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
 const persist=(k,s)=>{try{const map=read();if(s)map[k]=s;else delete map[k];localStorage.setItem(KEY,JSON.stringify(map));return true;}catch{return false;}};
 const estimate=(history,floorId,roomId,mode)=>{const samples=(Array.isArray(history)?history:[]).filter(e=>e&&e.floorId===floorId&&e.roomId===roomId&&e.mode===mode&&Number.isFinite(e.durationSeconds)&&e.durationSeconds>=15&&e.durationSeconds<=21600).slice(-10).map(e=>Math.round(e.durationSeconds));const count=samples.length;return {count,seconds:count>=2?Math.round(samples.reduce((a,b)=>a+b,0)/count):null,confidence:count>=3?'gelernt':count===2?'vorläufig':'unzureichend'};};
 function create(floorId,roomId,mode='quick',history=[]){
  const key=String(floorId).slice(0,120)+'|'+String(roomId).slice(0,120),raw=read()[key];
  let elapsed=Math.max(0,Math.floor(Number(raw?.elapsedMs)||0)),started=raw?.running===true&&Number.isFinite(raw?.startedAt)&&raw.startedAt>0?raw.startedAt:null,interval=null;
  const node=document.createElement('section');node.className='room-stopwatch';node.setAttribute('aria-label','Stoppuhr für die Raumreinigung');
  const title=document.createElement('div');title.className='room-stopwatch-title';title.textContent='⏱️ Stoppuhr · Raumreinigung';
  const display=document.createElement('div');display.className='room-stopwatch-clock';display.textContent=fmt(Math.floor(elapsed/1000));display.setAttribute('role','timer');
  const row=document.createElement('div');row.className='room-stopwatch-actions';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='room-primary';
  const correct=document.createElement('button');correct.type='button';correct.className='room-btn';correct.textContent='✎ Zeit korrigieren';
  const forecast=document.createElement('p');forecast.className='room-timer-forecast';const learned=estimate(history,floorId,roomId,mode);forecast.textContent=learned.seconds===null?'🧠 Zeitprognose nach 2 Reinigungen · bisher '+learned.count+' gültige Messung'+(learned.count===1?'':'en'):'🧠 '+(learned.confidence==='gelernt'?'Gelernte':'Vorläufige')+' Zeit · '+(mode==='detail'?'Detail':'Schnell')+'reinigung: ca. '+Math.max(1,Math.round(learned.seconds/60))+' Min. ('+learned.count+' Reinigungen)';
  const reset=document.createElement('button');reset.type='button';reset.className='room-btn';reset.textContent='↺ Zurücksetzen';
  const hint=document.createElement('small');hint.className='room-note';
  const ms=()=>elapsed+(started===null?0:Math.max(0,now()-started));
  const seconds=()=>Math.floor(ms()/1000);
  function paint(){display.textContent=fmt(seconds());toggle.textContent=started===null?'▶ Start / Weiter':'⏸ Pause';reset.disabled=ms()===0;hint.textContent=started!==null&&ms()>14400000?'⚠️ Stoppuhr läuft länger als 4 Stunden. Zeit bei Bedarf korrigieren.':'Die Uhr zählt auch bei App-Wechsel und gesperrtem Bildschirm. Nur „Pause“ hält sie an.';}
  const save=()=>persist(key,{elapsedMs:elapsed,running:started!==null,startedAt:started});
  function pause(){if(started!==null){elapsed=ms();started=null;}if(interval!==null){clearInterval(interval);interval=null;}save();paint();}
  function resume(){if(started!==null)return;started=now();interval=setInterval(paint,1000);save();paint();}
  toggle.addEventListener('click',()=>started===null?resume():pause());
  correct.addEventListener('click',()=>{const input=root.prompt?.('Tatsächlich benötigte Minuten eingeben (0–1440):',String(Math.round(ms()/6000)/10));if(input===null||input===undefined)return;const n=Number(String(input).replace(',','.'));if(!Number.isFinite(n)||n<0||n>1440){root.alert?.('Bitte eine Zahl zwischen 0 und 1440 Minuten eingeben.');return;}elapsed=Math.round(n*60000);if(started!==null)started=now();save();paint();});
  reset.addEventListener('click',()=>{if(ms()>0&&root.confirm&&!root.confirm('Stoppuhr wirklich auf 0 zurücksetzen?'))return;elapsed=0;started=null;clearInterval(interval);interval=null;save();paint();});
  const onHidden=()=>{if(!document.hidden)paint();};document.addEventListener('visibilitychange',onHidden);
  if(started!==null)interval=setInterval(paint,1000);
  node.append(title,display,row,forecast,hint);row.append(toggle,correct,reset);paint();
  function dispose(){if(interval!==null){clearInterval(interval);interval=null;}document.removeEventListener('visibilitychange',onHidden);/* running clock stays saved */}
  function complete(){const time=seconds();persist(key,null);dispose();return time;}
  return {element:node,seconds,complete,dispose,pause,resume};
 }
 const api={create,format:fmt,estimate};root.PutzmanagerRoomTimer=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
