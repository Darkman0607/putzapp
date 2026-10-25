/* V1.4.0.5: Room stopwatch, pauses on leaving the view; local single-device draft. */
(function(root){'use strict';
 const KEY='mein-putzmanager-room-timers-v1';
 const now=()=>Date.now();
 const fmt=s=>{const h=Math.floor(s/3600),m=String(Math.floor((s%3600)/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');return h?`${h}:${m}:${sec}`:`${m}:${sec}`;};
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
 const persist=(k,s)=>{try{const map=read();if(s)map[k]=s;else delete map[k];localStorage.setItem(KEY,JSON.stringify(map));return true;}catch{return false;}};
 function create(floorId,roomId){
  const key=String(floorId).slice(0,120)+'|'+String(roomId).slice(0,120),raw=read()[key];
  let elapsed=Math.max(0,Math.floor(Number(raw?.elapsedMs)||0)),started=null,interval=null;
  // Never count closed-background time on a restored draft.
  // A restored timer always starts paused; background time is not included.
  const node=document.createElement('section');node.className='room-stopwatch';node.setAttribute('aria-label','Stoppuhr für die Raumreinigung');
  const title=document.createElement('div');title.className='room-stopwatch-title';title.textContent='⏱️ Stoppuhr · Raumreinigung';
  const display=document.createElement('div');display.className='room-stopwatch-clock';display.textContent=fmt(Math.floor(elapsed/1000));display.setAttribute('role','timer');
  const row=document.createElement('div');row.className='room-stopwatch-actions';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='room-primary';
  const reset=document.createElement('button');reset.type='button';reset.className='room-btn';reset.textContent='↺ Zurücksetzen';
  const hint=document.createElement('small');hint.className='room-note';hint.textContent='Start/Pause nach Bedarf. Bei App-Wechsel wird automatisch pausiert. Die Zeit wird beim Abschluss gespeichert.';
  const ms=()=>elapsed+(started===null?0:Math.max(0,now()-started));
  const seconds=()=>Math.floor(ms()/1000);
  function paint(){display.textContent=fmt(seconds());toggle.textContent=started===null?'▶ Start / Weiter':'⏸ Pause';reset.disabled=ms()===0;}
  function pause(){if(started!==null){elapsed=ms();started=null;}if(interval!==null){clearInterval(interval);interval=null;}persist(key,{elapsedMs:elapsed});paint();}
  function resume(){if(started!==null)return;started=now();interval=setInterval(paint,250);persist(key,{elapsedMs:elapsed});paint();}
  toggle.addEventListener('click',()=>started===null?resume():pause());
  reset.addEventListener('click',()=>{if(ms()>0&&root.confirm&&!root.confirm('Stoppuhr wirklich auf 0 zurücksetzen?'))return;elapsed=0;started=null;clearInterval(interval);interval=null;persist(key,{elapsedMs:0});paint();});
  const onHidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',onHidden);
  node.append(title,display,row,hint);row.append(toggle,reset);paint();
  function dispose(){pause();document.removeEventListener('visibilitychange',onHidden);}
  function complete(){const time=seconds();dispose();persist(key,null);return time;}
  return {element:node,seconds,complete,dispose};
 }
 root.PutzmanagerRoomTimer={create,format:fmt};
})(typeof window!=='undefined'?window:globalThis);
