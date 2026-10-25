/* V1.4.0.11 Premium 2D. Schematic furniture; live room geometry and handlers retained. */
(function premiumFloorplan(){
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const E=(tag,a={},t)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))e.setAttribute(k,String(v));if(t!==undefined)e.textContent=t;return e};
  const A=(parent,tag,a={},t)=>{const e=E(tag,a,t);parent.append(e);return e};
  const R=(p,x,y,w,h,fill,r=3)=>A(p,'rect',{x,y,width:w,height:h,rx:r,fill});
  const C=(p,x,y,r,fill)=>A(p,'circle',{cx:x,cy:y,r,fill});
  const L=(p,x1,y1,x2,y2,stroke,sw=1)=>A(p,'line',{x1,y1,x2,y2,stroke,'stroke-width':sw,'stroke-linecap':'round'});
  const category=(name)=>{const n=String(name||'').toLowerCase();if(/kinder|spiel|baby|jugend/.test(n))return 'child';if(/schlaf|gastzimmer|gästezimmer/.test(n))return 'bed';if(/wc|toilette|klo/.test(n))return 'wc';if(/bad|dusche|waschraum/.test(n))return 'bath';if(/küche|koch|esszimmer/.test(n))return 'kitchen';if(/wohn|fernseh|salon/.test(n))return 'living';if(/vorraum|flur|gang|diele|eingang/.test(n))return 'hall';return 'other'};
  function drawFurniture(parent,type){
    const p=parent;
    const plant=(x,y)=>{C(p,x,y,6,'#8c7051');C(p,x-1,y-1,4.8,'#307c53');L(p,x-4,y,x+3,y,'#77c48c',1);L(p,x,y-4,x,y+3,'#67ae7b',1)};
    const rug=(x,y,w,h,col)=>{R(p,x,y,w,h,col,5);const q=R(p,x+2,y+2,w-4,h-4,'none',4);q.setAttribute('stroke','#f6f0e4');q.setAttribute('stroke-width',1)};
    switch(type){
      case 'bed':
        rug(16,13,68,75,'#d7c9b2');R(p,22,18,56,64,'#9f815f',5);R(p,26,21,48,58,'#e9e0d2',5);R(p,29,25,42,48,'#c6b6a4',4);R(p,27,23,21,14,'#fffaf1',4);R(p,52,23,20,14,'#fffaf1',4);R(p,4,27,15,16,'#9c7955',2);R(p,81,27,15,16,'#9c7955',2);plant(90,88);break;
      case 'child':
        rug(15,17,66,67,'#d0d0bd');C(p,50,50,28,'#ebdfcb');R(p,72,14,22,63,'#b39879',4);R(p,74,17,18,57,'#bed4d4',3);R(p,74,19,18,13,'#f8f5ea',3);R(p,7,10,29,16,'#af8965',3);C(p,42,55,7,'#c7a079');C(p,38,49,3,'#c7a079');C(p,46,49,3,'#c7a079');plant(15,84);break;
      case 'bath':
        rug(3,4,94,92,'#acbabb');R(p,7,12,35,67,'#e7eeef',12);R(p,13,18,23,55,'#fdfdf9',10);C(p,25,20,3,'#a4b5b8');R(p,58,17,32,25,'#e1e5e4',5);C(p,74,28,11,'#a7b7bb');R(p,57,57,30,30,'#e1e7e6',4);plant(84,87);break;
      case 'wc':
        R(p,31,10,37,20,'#e3e8e8',5);A(p,'ellipse',{cx:50,cy:51,rx:19,ry:24,fill:'#f2f5f3'});A(p,'ellipse',{cx:50,cy:51,rx:12,ry:17,fill:'#9faeb4'});R(p,11,75,26,13,'#af926d',4);C(p,25,81,5,'#f5f5ef');plant(88,18);break;
      case 'kitchen':
        R(p,75,5,22,90,'#dfded8',3);L(p,76,37,96,37,'#a5a8a4',2);L(p,76,66,96,66,'#a5a8a4',2);C(p,86,22,6,'#555d60');C(p,86,47,6,'#555d60');R(p,17,33,48,34,'#ae885e',4);R(p,20,36,42,27,'#c5a77e',3);for(const x of [23,48]){R(p,x,19,12,11,'#ded6c8',3);R(p,x,71,12,11,'#ded6c8',3)}plant(12,87);break;
      case 'living':
        rug(10,18,79,69,'#d0c6b5');R(p,13,16,63,21,'#e4dfd7',5);R(p,13,36,21,48,'#e2ddd3',5);R(p,20,20,19,11,'#f8f1e7',4);R(p,44,20,19,11,'#f8f1e7',4);C(p,60,59,17,'#a8855d');C(p,60,58,14,'#c29f71');R(p,84,16,10,62,'#65625c',2);plant(14,91);break;
      case 'hall':
        rug(17,23,64,52,'#d9d8ce');R(p,20,27,58,44,'#e4e1d8',3);R(p,76,12,17,32,'#ac845c',3);R(p,28,85,34,10,'#a6835c',3);plant(14,16);plant(86,88);break;
      default:
        rug(14,21,72,59,'#d2d0bf');R(p,35,32,29,25,'#b39b78',4);plant(88,16);
    }
  }
  function decorate(){
    const preview=document.querySelector('#home-floorplan-preview'),svg=preview?.querySelector('svg'),api=window.PutzmanagerEditor;
    if(!svg||!api||svg.dataset.premiumReady==='1')return;
    const home=api.get(),floor=home.floors?.find(f=>f.id===home.activeFloor)||home.floors?.[0];if(!floor)return;
    svg.dataset.premiumReady='1';svg.classList.add('premium-apartment-svg');
    const defs=E('defs');svg.prepend(defs);
    const pat=(id,col,a,b,step)=>{
      const g=A(defs,'pattern',{id,patternUnits:'userSpaceOnUse',width:step,height:step});
      R(g,0,0,step,step,col,0);L(g,0,0,step,0,a,1);L(g,0,0,0,step,b,1);
      if(id==='pm-wood')L(g,0,step/2,step,step/2,b,.7);
    };
    pat('pm-wood','#b89b77','#e0caa6','#a78964',35);
    pat('pm-tile','#c1c4c2','#e9e8df','#f0f0e9',34);
    pat('pm-stone','#d1d0ca','#e9e8e2','#e9e9e1',40);
    pat('pm-darktile','#9da8aa','#d8d9d5','#d8d9d5',27);
    pat('pm-hall','#c6c5b8','#e0ded5','#e0ded5',42);
    const groups=[...svg.querySelectorAll('[data-home-room]')];
    floor.rooms.forEach((room,i)=>{
      const g=groups.find(e=>e.getAttribute('data-home-room')===room.id),path=g?.querySelector('path');
      if(!path||!Array.isArray(room.points)||room.points.length<3)return;
      const kind=category(room.name),pattern=kind==='bath'?'pm-tile':kind==='wc'?'pm-darktile':kind==='hall'?'pm-hall':kind==='kitchen'?'pm-stone':'pm-wood';
      path.setAttribute('fill',`url(#${pattern})`);path.setAttribute('fill-opacity','1');path.setAttribute('stroke','none');
      const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      const clipid='pm-clip-'+i;A(defs,'clipPath',{id:clipid}).append(E('path',{d:path.getAttribute('d')}));
      if(w>30&&h>30){
        const clipped=E('g',{'clip-path':`url(#${clipid})`,'pointer-events':'none',opacity:'.91'});
        const content=E('g',{transform:`translate(${x+w*.05} ${y+h*.05}) scale(${w*.9/100} ${h*.9/100})`});
        drawFurniture(content,kind);clipped.append(content);g.insertBefore(clipped,path.nextSibling);
      }
      const texts=g.querySelectorAll('text');
      if(texts.length>=2){
        const title=texts[0],num=texts[1],cx=Number(title.getAttribute('x')),cy=(Number(title.getAttribute('y'))+Number(num.getAttribute('y')))/2;
        if(Number.isFinite(cx)&&Number.isFinite(cy)){
          const n=Number.parseInt(num.textContent,10)||0,tw=title.textContent?.length||5;
          const width=Math.max(68,Math.min(w*.9,Math.min(213,tw*12.5+38))),height=w<120||h<105?49:62;
          const bg=n<35?'#95455b':n<65?'#9a703b':n<85?'#1a7797':'#08745f';
          const plaque=E('g',{'pointer-events':'none',class:'pm-room-label'});
          const badge=R(plaque,cx-width/2,cy-height/2,width,height,bg,14);badge.setAttribute('fill-opacity','.95');badge.setAttribute('stroke','#ffffff');badge.setAttribute('stroke-opacity','.35');badge.setAttribute('stroke-width','1');
          g.insertBefore(plaque,title);
          title.setAttribute('y',cy-10);title.setAttribute('font-family','Arial,sans-serif');title.setAttribute('font-size',Math.max(13,Math.min(21,width/(tw*.57))));title.setAttribute('stroke','none');title.setAttribute('fill','#fff');
          num.setAttribute('y',cy+16);num.setAttribute('font-family','Arial,sans-serif');num.setAttribute('font-size',Math.min(27,height*.43));num.setAttribute('stroke','none');num.setAttribute('fill','#fff');
        }
      }
    });
    [...svg.querySelectorAll('line')].filter(e=>e.getAttribute('stroke')==='#d4e8e2').forEach(w=>{
      const shadow=w.cloneNode(false);shadow.setAttribute('stroke','#26323a');shadow.setAttribute('stroke-width','19');w.before(shadow);
      w.setAttribute('stroke','#f1eee6');w.setAttribute('stroke-width','10.5');w.setAttribute('stroke-linecap','square');
    });
    [...svg.querySelectorAll('line')].filter(e=>e.getAttribute('stroke')==='#7bddff').forEach(w=>{
      w.setAttribute('stroke','#8ed5ed');w.setAttribute('stroke-width','7');
      const shine=w.cloneNode(false);shine.setAttribute('stroke','#e9fbff');shine.setAttribute('stroke-width','2');w.after(shine);
    });
    [...svg.querySelectorAll('line')].filter(e=>e.getAttribute('stroke')==='#ffc785').forEach(w=>{w.setAttribute('stroke','#f2ede0');w.setAttribute('stroke-width','3')});
    const foot=preview.querySelector('.home-map-foot');
    if(foot)foot.textContent='Raum antippen: Reinigen oder Aufgaben ansehen · Möbel sind schematisch';
  }
  const preview=document.querySelector('#home-floorplan-preview');if(!preview)return;
  new MutationObserver(decorate).observe(preview,{childList:true});
  decorate();
})();
