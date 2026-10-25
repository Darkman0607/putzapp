/* V1.4.0.8: small offline before/after gallery, included in JSON/Drive backups. */
(function(root){'use strict';
const KEY='mein-putzmanager-clean-photos-v1',MAX_ENTRIES=18,MAX_DATA_LENGTH=180000;
function all(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string'&&typeof x.at==='string').slice(-MAX_ENTRIES):[];}catch{return [];}}
function snapshot(){return localStorage.getItem(KEY);}
function restore(raw){if(raw===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,raw);render();}
function put(entry){if(!entry||!entry.id)return true;const images=['before','after'].map(k=>entry[k]).filter(Boolean);if(!images.length)return true;
 if(images.some(x=>typeof x!=='string'||!/^data:image\/jpeg;base64,/.test(x)||x.length>MAX_DATA_LENGTH))throw Error('Ein Bild ist zu groß oder ungültig.');
 const next=all().filter(x=>x.id!==entry.id);next.push({id:entry.id,roomName:String(entry.roomName||'Raum').slice(0,55),at:entry.at,before:entry.before||null,after:entry.after||null});
 // Explicit cap: refuse too many images rather than deleting photos without consent.
 if(next.length>MAX_ENTRIES)throw Error('Die Fotogalerie ist voll. Bitte alte Bilder löschen oder zuerst eine Sicherung erstellen.');
 try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Nicht genug Speicher für Reinigungsfotos. Bitte ein Bild entfernen und erneut speichern.');}render();return true;
}
function remove(id){const next=all().filter(x=>x.id!==id);localStorage.setItem(KEY,JSON.stringify(next));render();}
function encode(file){return new Promise((resolve,reject)=>{if(!file){resolve(null);return;}if(!String(file.type).startsWith('image/')){reject(Error('Bitte eine Bilddatei auswählen.'));return;}
 if(file.size>15*1024*1024){reject(Error('Foto zu groß (maximal 15 MB Originalbild).'));return;}
 const reader=new FileReader();reader.onerror=()=>reject(Error('Foto konnte nicht eingelesen werden.'));
 reader.onload=()=>{const picture=new Image();picture.onerror=()=>reject(Error('Bilddatei konnte nicht verarbeitet werden.'));
  picture.onload=()=>{try{const ratio=Math.min(1,720/Math.max(picture.width,picture.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.width*ratio));canvas.height=Math.max(1,Math.round(picture.height*ratio));const context=canvas.getContext('2d');context.drawImage(picture,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.55);if(data.length>MAX_DATA_LENGTH)throw Error('Komprimiertes Foto ist noch zu groß.');resolve(data);}catch(e){reject(e);}};
  picture.src=reader.result;
 };reader.readAsDataURL(file);
 });}
const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function render(){const box=document.querySelector('#photo-gallery');if(!box)return;const records=all().slice().reverse();box.replaceChildren();document.querySelector('#photo-gallery-count').textContent=`${records.length} Reinigungen mit Fotos`;
 if(!records.length){box.append(mk('p','room-note','Noch keine Vorher-/Nachher-Fotos gespeichert.'));return;}
 for(const record of records){const card=mk('article','photo-entry');card.append(mk('strong','',record.roomName),mk('small','',new Date(record.at).toLocaleString('de-AT')));
  const grid=mk('div','photo-grid');for(const type of ['before','after'])if(record[type]){const wrapper=mk('figure','');const picture=mk('img','');picture.src=record[type];picture.alt=(type==='before'?'Vorher':'Nachher')+' · '+record.roomName;picture.loading='lazy';const caption=mk('figcaption','',type==='before'?'Vorher':'Nachher');wrapper.append(picture,caption);grid.append(wrapper);}card.append(grid);
  const del=mk('button','room-btn','Fotos dieser Reinigung löschen');del.type='button';del.addEventListener('click',()=>{if(confirm('Fotos dieser Reinigung wirklich endgültig löschen?'))remove(record.id);});card.append(del);box.append(card);
 }
}
root.PutzmanagerPhotos={all,snapshot,restore,put,encode,render};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})(typeof window!=='undefined'?window:globalThis);
