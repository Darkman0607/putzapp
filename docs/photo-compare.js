/* Mein Putzmanager – V1.4.0.17. Rein lokaler Vorher-/Nachher-Vergleich.
   Kein KI-Urteil: es werden die unveränderten, bereits lokal gespeicherten Fotos angezeigt. */
(function(root){'use strict';
 const mk=(tag,klass,text)=>{const e=root.document.createElement(tag);if(klass)e.className=klass;if(text!==undefined)e.textContent=text;return e;};
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 let active=null;
 function open(record){
  if(!root.document||!record||!record.before||!record.after)return false;
  if(active)active.close();
  const previous=root.document.activeElement;
  const dialog=mk('dialog','photo-compare-dialog');
  dialog.setAttribute('aria-labelledby','photo-compare-heading');dialog.setAttribute('aria-modal','true');
  const content=mk('div','photo-compare-content');
  const header=mk('div','photo-compare-header');
  const titles=mk('div','');const heading=mk('h2','', '📸 Fotos vergleichen');heading.id='photo-compare-heading';
  const description=mk('p','',String(record.roomName||'Raum')+' · '+new Date(record.at).toLocaleString('de-AT'));
  titles.append(heading,description);
  const closeBtn=mk('button','photo-compare-close','✕');closeBtn.type='button';closeBtn.setAttribute('aria-label','Fotovergleich schließen');
  header.append(titles,closeBtn);content.append(header);
  const modeButtons=mk('div','photo-compare-modes');modeButtons.setAttribute('role','group');modeButtons.setAttribute('aria-label','Fotovergleich-Ansicht');
  const side=mk('button','photo-compare-mode is-active','Nebeneinander');side.type='button';side.setAttribute('aria-pressed','true');
  const overlay=mk('button','photo-compare-mode','Schieberegler');overlay.type='button';overlay.setAttribute('aria-pressed','false');
  modeButtons.append(side,overlay);content.append(modeButtons);
  const stage=mk('div','photo-compare-stage');stage.setAttribute('aria-label','Vorher- und Nachher-Aufnahmen');
  stage.style.setProperty('--split','50%');
  const images=[];
  for(const [kind,label] of [['before','Vorher'],['after','Nachher']]){
   const pane=mk('div','photo-compare-pane photo-compare-pane--'+kind);
   const picture=mk('img','photo-compare-photo');picture.src=record[kind];picture.alt=label+' · '+String(record.roomName||'Raum');picture.draggable=false;
   const chip=mk('span','photo-compare-chip',label);pane.append(picture,chip);stage.append(pane);images.push(picture);
  }
  content.append(stage);
  const sliderWrap=mk('label','photo-compare-range');sliderWrap.hidden=true;
  const sliderLabel=mk('span','', 'Trennlinie verschieben');
  const slider=mk('input','');slider.type='range';slider.min='0';slider.max='100';slider.value='50';slider.step='1';slider.setAttribute('aria-label','Vorher-/Nachher-Trennlinie in Prozent');
  const splitLabel=mk('output','photo-compare-range-value','50 %');sliderWrap.append(sliderLabel,slider,splitLabel);content.append(sliderWrap);
  const zoomBar=mk('div','photo-compare-zoom');
  const minus=mk('button','photo-compare-control','−');minus.type='button';minus.setAttribute('aria-label','Fotos verkleinern');
  const readout=mk('output','photo-compare-zoom-value','100 %');readout.setAttribute('aria-live','polite');
  const plus=mk('button','photo-compare-control','+');plus.type='button';plus.setAttribute('aria-label','Fotos vergrößern');
  const reset=mk('button','photo-compare-reset','Zurücksetzen');reset.type='button';
  zoomBar.append(minus,readout,plus,reset);content.append(zoomBar);
  content.append(mk('p','photo-compare-hint','Tipp: Zum Vergleich möglichst denselben Bildausschnitt fotografieren. Bei Vergrößerung das Bild mit dem Finger verschieben. Keine automatische Sauberkeitsbewertung.'));
  dialog.append(content);root.document.body.append(dialog);
  let zoom=1,panX=0,panY=0,start=null;
  function updateTransform(){
   for(const img of images)img.style.transform=`translate(${panX}px, ${panY}px) scale(${zoom})`;
   readout.textContent=Math.round(zoom*100)+' %';minus.disabled=zoom<=1;plus.disabled=zoom>=3;
   stage.classList.toggle('is-zoomed',zoom>1);
  }
  function setMode(mode){
   stage.classList.toggle('is-overlay',mode==='overlay');
   side.classList.toggle('is-active',mode==='side');overlay.classList.toggle('is-active',mode==='overlay');
   side.setAttribute('aria-pressed',String(mode==='side'));overlay.setAttribute('aria-pressed',String(mode==='overlay'));
   sliderWrap.hidden=mode!=='overlay';panX=0;panY=0;zoom=1;updateTransform();
  }
  side.addEventListener('click',()=>setMode('side'));overlay.addEventListener('click',()=>setMode('overlay'));
  slider.addEventListener('input',()=>{const val=Number(slider.value);stage.style.setProperty('--split',val+'%');splitLabel.textContent=val+' %';});
  plus.addEventListener('click',()=>{zoom=clamp(Math.round((zoom+.25)*100)/100,1,3);updateTransform();});
  minus.addEventListener('click',()=>{zoom=clamp(Math.round((zoom-.25)*100)/100,1,3);if(zoom===1){panX=0;panY=0;}updateTransform();});
  reset.addEventListener('click',()=>{zoom=1;panX=0;panY=0;slider.value='50';slider.dispatchEvent(new Event('input',{bubbles:true}));updateTransform();});
  stage.addEventListener('pointerdown',e=>{if(zoom<=1||e.button!==0)return;start={id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY};stage.setPointerCapture(e.pointerId);});
  stage.addEventListener('pointermove',e=>{if(!start||start.id!==e.pointerId)return;panX=clamp(start.panX+e.clientX-start.x,-stage.clientWidth*(zoom-1)/2,stage.clientWidth*(zoom-1)/2);panY=clamp(start.panY+e.clientY-start.y,-stage.clientHeight*(zoom-1)/2,stage.clientHeight*(zoom-1)/2);updateTransform();});
  function stop(){start=null;}stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);stage.addEventListener('lostpointercapture',stop);
  closeBtn.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.remove();if(active===dialog)active=null;previous?.focus?.({preventScroll:true});},{once:true});
  active=dialog;setMode('side');dialog.showModal();closeBtn.focus();return true;
 }
 root.PutzmanagerPhotoCompare={open,close(){if(active)active.close();}};
})(typeof window!=='undefined'?window:globalThis);
