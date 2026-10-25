/* V1.4.0.12 | Wohnungsgrafik anhand der Referenz: dynamische Polygone, Möblierung, Architektur, Werte und Bedienung. */
(function premiumFloorplan(){
 'use strict';
 const ns='http://www.w3.org/2000/svg';
 const E=(tag,a={},t)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(a))e.setAttribute(k,String(v));if(t!==undefined)e.textContent=t;return e};
 const A=(p,tag,a={},t)=>{const e=E(tag,a,t);p.append(e);return e};
 const R=(p,x,y,w,h,fill,r=3,attrs={})=>A(p,'rect',{x,y,width:w,height:h,rx:r,fill,...attrs});
 const C=(p,x,y,r,fill,attrs={})=>A(p,'circle',{cx:x,cy:y,r,fill,...attrs});
 const L=(p,x1,y1,x2,y2,stroke,sw=1,attrs={})=>A(p,'line',{x1,y1,x2,y2,stroke,'stroke-width':sw,'stroke-linecap':'round',...attrs});
 const P=(p,d,fill,attrs={})=>A(p,'path',{d,fill,...attrs});
 const category=name=>{const n=String(name||'').toLowerCase();if(/kinder|spiel|baby|jugend/.test(n))return 'child';if(/schlaf|gastzimmer|gästezimmer/.test(n))return 'bed';if(/wc|toilette|klo/.test(n))return 'wc';if(/bad|dusche|waschraum/.test(n))return 'bath';if(/küche|koch|esszimmer/.test(n))return 'kitchen';if(/wohn|fernseh|salon/.test(n))return 'living';if(/vorraum|flur|gang|diele|eingang/.test(n))return 'hall';return 'other'};
 const roomsym={bed:'♧',child:'★',bath:'♨',wc:'♧',kitchen:'♜',living:'▱',hall:'⌂',other:'●'};
 function defs(svg){
   const d=E('defs');svg.prepend(d);
   const image=(id,file)=>{const pat=A(d,'pattern',{id,patternUnits:'userSpaceOnUse',width:160,height:160});A(pat,'image',{href:'./assets/floor-'+file+'.png',x:0,y:0,width:160,height:160,preserveAspectRatio:'none'});};
   image('pm-wood','wood');image('pm-tile','tile');image('pm-stone','stone');image('pm-slate','slate');
   const linear=(id,a,b)=>{const g=A(d,'linearGradient',{id,x1:'0%',x2:'85%',y1:'0%',y2:'100%'});A(g,'stop',{offset:'0%','stop-color':a});A(g,'stop',{offset:'100%','stop-color':b});};
   linear('pm-wall','#66706f','#1b262e');linear('pm-fabric','#fffdf7','#b4b0a9');linear('pm-woodf','#d8b991','#896642');linear('pm-cabinet','#d5c0a2','#987552');linear('pm-tiles','#e8eceb','#9da9a9');linear('pm-green','#56ab73','#125839');
   const filter=A(d,'filter',{id:'pm-shadow',x:'-35%',y:'-35%',width:'175%',height:'185%'});A(filter,'feGaussianBlur',{in:'SourceAlpha',stdDeviation:2.1,result:'blur'});A(filter,'feOffset',{in:'blur',dy:2.5,dx:1,result:'off'});A(filter,'feComponentTransfer',{},undefined).append(E('feFuncA',{type:'linear',slope:'.4'}));A(filter,'feMerge').append(E('feMergeNode',{in:'off'}),E('feMergeNode',{in:'SourceGraphic'}));
   return d;
 }
 function plant(p,x,y,s=1){const g=A(p,'g',{transform:`translate(${x} ${y}) scale(${s})`});C(g,2,3,8,'#715942',{'filter':'url(#pm-shadow)'});for(let i=0;i<8;i++){const angle=i*Math.PI/4,len=8+(i%2)*3;A(g,'ellipse',{cx:Math.cos(angle)*len*.48,cy:Math.sin(angle)*len*.48,rx:3.5,ry:8.4,fill:i%2?'#377c45':'#4e9b59',stroke:'#2d673c','stroke-width':'.6',transform:`rotate(${i*45+90} ${Math.cos(angle)*len*.48} ${Math.sin(angle)*len*.48})`});}C(g,0,0,2,'#83bc71');}
 function rug(p,x,y,w,h,fill='#ded5c5',radius=8){R(p,x,y,w,h,fill,radius,{stroke:'#efeadc','stroke-width':1.4,'filter':'url(#pm-shadow)'});R(p,x+4,y+4,w-8,h-8,'none',radius,{stroke:'#c9c0b2','stroke-width':'.7',opacity:'.5'});}
 function pillow(p,x,y,w,h){R(p,x,y,w,h,'url(#pm-fabric)',6,{'filter':'url(#pm-shadow)'});L(p,x+4,y+h*.6,x+w-4,y+h*.6,'#cbc5bb',.65);}
 function wooden(p,x,y,w,h,r=3){R(p,x,y,w,h,'url(#pm-woodf)',r,{stroke:'#84694b','stroke-width':1,'filter':'url(#pm-shadow)'});for(let j=1;j<4;j++)L(p,x+3,y+h*j/4,x+w-3,y+h*j/4,'#f1dfbd',.55,{opacity:'.5'});}
 function sofa(p,x,y,w,h){R(p,x,y,w,h,'#d0c9bc',8,{stroke:'#a79e90','stroke-width':1,'filter':'url(#pm-shadow)'});R(p,x+4,y+3,w-8,h-7,'url(#pm-fabric)',7);for(let i=1;i<3;i++)L(p,x+(w-8)*i/3+4,y+5,x+(w-8)*i/3+4,y+h-7,'#b6b1a9',.8);R(p,x+1,y+1,w-2,7,'#e6e0d5',5);pillow(p,x+5,y+8,15,9);}
 function drawFurniture(p,type){
  // Every furniture item is an illustration, not a statement about the user's actual inventory.
  switch(type){
   case 'bed':
     rug(p,15,15,69,73,'#d5c7b6',23); wooden(p,20,8,60,12,2);
     R(p,21,19,58,67,'#a78c6b',7,{'filter':'url(#pm-shadow)'});R(p,24,22,52,60,'url(#pm-fabric)',8,{stroke:'#d8d4cc','stroke-width':1});
     R(p,26,40,48,39,'#ddd8d0',5);L(p,27,44,72,44,'#bbb6af',1.3);pillow(p,27,25,21,16);pillow(p,52,25,21,16);
     wooden(p,6,22,12,20);wooden(p,83,22,12,20);C(p,12,29,3.1,'#f3ebd9');C(p,89,29,3.1,'#f3ebd9');plant(p,10,75,.7);plant(p,90,84,.6);break;
   case 'child':
     rug(p,17,15,65,74,'#dfd4c3',34);C(p,50,49,27,'#e9dec9',{opacity:'.65'});wooden(p,73,9,19,63,3);R(p,76,15,13,49,'#d3c3ab',1);
     R(p,72,68,23,24,'#f5f0e7',3,{'filter':'url(#pm-shadow)'});pillow(p,74,70,18,10);wooden(p,10,8,30,13);R(p,13,10,24,3,'#ebdab5',1);C(p,45,51,6,'#bb8d51');C(p,40,45,3,'#b98c55');C(p,50,45,3,'#b98c55');
     R(p,33,76,13,5,'#c67853',1,{transform:'rotate(-22 33 76)'});R(p,59,29,10,6,'#318bad',1,{transform:'rotate(18 59 29)'});plant(p,12,84,.85);break;
   case 'bath':
     R(p,5,10,36,67,'url(#pm-tiles)',6,{stroke:'#75878a','stroke-width':2,'filter':'url(#pm-shadow)'});
     R(p,8,14,30,61,'#e7efec',8);R(p,11,19,24,53,'#fafcf9',7);C(p,19,23,3,'#afc5cb');R(p,52,13,40,27,'#d3d9d9',2,{'filter':'url(#pm-shadow)'});R(p,56,16,32,18,'#fafefd',4);C(p,72,25,8,'#acb9b8');C(p,72,25,5,'#fbffff');C(p,72,25,2,'#8a9b9b');
     R(p,55,60,33,30,'#eff1eb',3,{'filter':'url(#pm-shadow)'});C(p,72,74,6,'#dde6e0');plant(p,90,92,.65);break;
   case 'wc':
     wooden(p,12,10,22,21);R(p,36,13,30,17,'#f4f7f2',5,{'filter':'url(#pm-shadow)'});A(p,'ellipse',{cx:51,cy:52,rx:19,ry:25,fill:'#f7faf7',stroke:'#c0cbc9','stroke-width':1.4,'filter':'url(#pm-shadow)'});A(p,'ellipse',{cx:51,cy:52,rx:12,ry:18,fill:'#c9d1d0'});A(p,'ellipse',{cx:51,cy:52,rx:9,ry:15,fill:'#aeb8ba'});plant(p,83,85,.8);break;
   case 'kitchen':
     R(p,77,5,21,90,'#d0ccc3',2,{'filter':'url(#pm-shadow)'});R(p,79,8,17,34,'#ececea',2);R(p,79,46,17,46,'#a69f94',2);L(p,80,44,96,44,'#67615a',1);
     R(p,82,50,13,16,'#393d3f',2);for(const x of [85,91])for(const y of [54,61])C(p,x,y,2.4,'#b3b7b6');
     R(p,81,13,14,10,'#c9d4d0',3);R(p,83,15,10,6,'#737e7e',3);
     wooden(p,19,29,51,43,4);R(p,23,32,43,37,'#c5a77f',3);for(const x of [25,49]){wooden(p,x,12,14,13);wooden(p,x,75,14,13);}C(p,37,52,3,'#eee7d5');plant(p,10,90,.9);break;
   case 'living':
     rug(p,11,15,76,72,'#d5d0c3');sofa(p,12,13,69,25);R(p,10,36,25,49,'#cec6b7',7,{'filter':'url(#pm-shadow)'});R(p,13,39,19,43,'url(#pm-fabric)',6);pillow(p,15,48,15,13);pillow(p,15,67,15,12);
     C(p,61,65,17,'#ad875e',{'filter':'url(#pm-shadow)'});C(p,61,65,14,'#c8a678');L(p,51,66,70,66,'#aa8459',1);wooden(p,85,15,11,62);plant(p,8,87,.9);plant(p,91,87,.9);break;
   case 'hall':
     rug(p,14,22,69,58,'#c9c6ba',6);R(p,18,26,61,50,'#ddd9ce',3,{opacity:'.7'});wooden(p,82,10,13,38);wooden(p,13,83,38,10);plant(p,12,14,.85);plant(p,85,86,.9);break;
   default:
     rug(p,14,20,72,62,'#d1cabd');wooden(p,32,31,38,30);plant(p,85,18,.9);
  }
 }
 function installRoomLabels(g,room,kind,n,w,h){
   const texts=g.querySelectorAll('text');if(texts.length<2)return;
   const name=texts[0],score=texts[1];
   const cx=Number(name.getAttribute('x')),cy=(Number(name.getAttribute('y'))+Number(score.getAttribute('y')))/2;
   if(!Number.isFinite(cx)||!Number.isFinite(cy))return;
   // Badges fit inside the actual room envelope; protect small rooms and narrow devices.
   const label=String(room.name||'Raum');const small=Math.min(w,h)<110;
   const usable=Math.max(30,w-10),size=small?Math.max(10,Math.min(15,w/8)):Math.max(13,Math.min(18,w/7));
   const bw=Math.min(usable,Math.max(58,Math.min(175,label.length*size*.49+53)));
   const bh=Math.min(Math.max(32,h-6),small?43:50);
   const color=n<35?'#b94b61':n<65?'#9f7137':n<85?'#247da3':'#087b63';
   const bg=E('g',{'class':'pm-room-label','pointer-events':'none'});
   R(bg,cx-bw/2,cy-bh/2,bw,bh,color,Math.min(12,bh/4),{'fill-opacity':'.96','stroke':'#ffffff','stroke-opacity':'.22','stroke-width':'.75','filter':'url(#pm-shadow)'});
   // For micro rooms omit decorative icon to keep the room's name legible.
   const left=cx-bw/2+8;
   if(bw>=77&&bh>=40)A(bg,'text',{x:left,y:cy+3,fill:'#fff','font-size':Math.min(17,bh*.39),'text-anchor':'start',opacity:'.88','dominant-baseline':'middle'},roomsym[kind]||'●');
   g.insertBefore(bg,name);
   const start=cx+(bw>=77&&bh>=40?7:0);
   const capacity=bw-(bw>=77&&bh>=40?28:12);
   const ellipsis=Math.max(3,Math.floor(capacity/(size*.54)));
   name.textContent=label.length>ellipsis?label.slice(0,ellipsis-1)+'…':label;
   name.setAttribute('x',start);name.setAttribute('y',cy-bh*.18);name.setAttribute('font-size',size);name.setAttribute('font-family','Inter,Arial,sans-serif');name.setAttribute('font-weight','550');name.setAttribute('fill','#fff');name.setAttribute('stroke','none');name.setAttribute('paint-order','normal');
   score.setAttribute('x',start);score.setAttribute('y',cy+bh*.25);score.setAttribute('font-size',Math.max(13,Math.min(23,bh*.42)));score.setAttribute('font-family','Inter,Arial,sans-serif');score.setAttribute('font-weight','750');score.setAttribute('fill','#fff');score.setAttribute('stroke','none');score.setAttribute('paint-order','normal');
 }
 function renderArchitecture(svg,floor){
   // Preserve true editor openings; visual embellishment only, no modifications to the geometry.
   const GEO=window.PutzmanagerGeometry;if(!GEO)return;
   const walls=GEO.walls(floor.rooms);
   const previous=[...svg.querySelectorAll('line')];
   for(const line of previous){
     const stroke=line.getAttribute('stroke');
     if(stroke==='#d4e8e2'){
       const base=line.cloneNode(false);base.setAttribute('stroke','#1e252b');base.setAttribute('stroke-width','19');line.before(base);
       const bevel=line.cloneNode(false);bevel.setAttribute('stroke','url(#pm-wall)');bevel.setAttribute('stroke-width','15');line.before(bevel);
       line.setAttribute('stroke','#9ca5a0');line.setAttribute('stroke-width','2.8');line.setAttribute('opacity','.78');
     }
     if(stroke==='#7bddff'){
       const frame=line.cloneNode(false);frame.setAttribute('stroke','#314b54');frame.setAttribute('stroke-width','14');line.before(frame);
       const pane=line.cloneNode(false);pane.setAttribute('stroke','#e8f5f6');pane.setAttribute('stroke-width','8.5');line.before(pane);
       line.setAttribute('stroke','#81d6f4');line.setAttribute('stroke-width','3.8');
     }
     if(stroke==='#ffc785'){
       const opening=line.cloneNode(false);opening.setAttribute('stroke','#e6e3d7');opening.setAttribute('stroke-width','7');line.before(opening);
       line.setAttribute('stroke','#fffdf2');line.setAttribute('stroke-width','1.5');
     }
   }
   for(const wall of walls){for(const o of (floor.openings||[]).filter(item=>item.wallId===wall.id&&item.kind==='door')){
     const span=GEO.openingSpan(o,wall),v=[span.b[0]-span.a[0],span.b[1]-span.a[1]],len=Math.hypot(...v);if(len<6)continue;
     const x=span.a[0],y=span.a[1],dx=-v[1],dy=v[0];const dir=o.swing==='right'?-1:1;
     const group=A(svg,'g',{'pointer-events':'none',opacity:'.78'});
     L(group,x,y,x+dir*dx,y+dir*dy,'#f4f3eb',1.6);
     P(group,`M ${span.b[0]} ${span.b[1]} A ${len} ${len} 0 0 ${dir===1?1:0} ${x+dir*dx} ${y+dir*dy}`,'none',{stroke:'#f4f3eb','stroke-width':1.15,'stroke-opacity':'.78'});
   }}
 }
 function decorate(){
   const preview=document.querySelector('#home-floorplan-preview'),svg=preview?.querySelector('svg'),api=window.PutzmanagerEditor;
   if(!svg||!api||svg.dataset.premiumReady==='1')return;
   const home=api.get(),floor=home.floors?.find(f=>f.id===home.activeFloor)||home.floors?.[0];if(!floor)return;
   svg.dataset.premiumReady='1';svg.classList.add('premium-apartment-svg');
   const d=defs(svg),groups=[...svg.querySelectorAll('[data-home-room]')];
   floor.rooms.forEach((room,i)=>{
     const g=groups.find(e=>e.getAttribute('data-home-room')===room.id),path=g?.querySelector('path');
     if(!path||!Array.isArray(room.points)||room.points.length<3)return;
     const kind=category(room.name),pattern=kind==='bath'?'pm-tile':kind==='wc'?'pm-slate':kind==='kitchen'?'pm-stone':kind==='hall'?'pm-tile':'pm-wood';
     path.setAttribute('fill',`url(#${pattern})`);path.setAttribute('fill-opacity','1');path.setAttribute('stroke','none');
     const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
     const clipid='pm-clip-'+i;A(d,'clipPath',{id:clipid}).append(E('path',{d:path.getAttribute('d')}));
     if(w>48&&h>48){
       const clipped=E('g',{'clip-path':`url(#${clipid})`,'pointer-events':'none'});
       const shade=E('path',{d:path.getAttribute('d'),fill:'#fff','fill-opacity':'.04',stroke:'#152025','stroke-width':'7','stroke-opacity':'.35'});clipped.append(shade);
       const content=E('g',{transform:`translate(${x+w*.035} ${y+h*.035}) scale(${w*.93/100} ${h*.93/100})`});
       drawFurniture(content,kind);clipped.append(content);g.insertBefore(clipped,path.nextSibling);
     }
     const score=g.querySelectorAll('text')[1],n=Number.parseInt(score?.textContent,10)||0;
     installRoomLabels(g,room,kind,n,w,h);
   });
   renderArchitecture(svg,floor);
   // Decorative furniture stays non-interactive; original room groups still respond to tap/long press.
   const foot=preview.querySelector('.home-map-foot');if(foot)foot.textContent='Räume antippen für Details · Möbel beispielhaft dargestellt';
 }
 const preview=document.querySelector('#home-floorplan-preview');if(!preview)return;
 new MutationObserver(decorate).observe(preview,{childList:true});decorate();
})();
