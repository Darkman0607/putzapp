import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const timer=createRequire(import.meta.url)('../room-timer.js');
const entry=(seconds,mode='quick',roomId='a',floorId='eg')=>({floorId,roomId,mode,durationSeconds:seconds});
test('learns by room and mode after two and three valid sessions',()=>{
 assert.equal(timer.estimate([entry(1440)],'eg','a','quick').seconds,null);
 assert.deepEqual(timer.estimate([entry(1440),entry(1200)],'eg','a','quick'),{count:2,seconds:1320,confidence:'vorläufig'});
 assert.deepEqual(timer.estimate([entry(1440),entry(1200),entry(1320),entry(0),entry(999999),entry(500,'detail')],'eg','a','quick'),{count:3,seconds:1320,confidence:'gelernt'});
 assert.equal(timer.estimate([entry(500,'detail')],'eg','a','quick').count,0);
});
test('a running timer persists when view disappears and on restart',()=>{
 const data={};globalThis.localStorage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v)};
 globalThis.document={hidden:false,createElement:()=>({children:[],setAttribute(){},addEventListener(k,f){(this.handlers??={})[k]=f},append(...xs){this.children.push(...xs)}}),addEventListener(){},removeEventListener(){}};
 const original=Date.now;let clock=2000000000000;Date.now=()=>clock;
 try{let first=timer.create('eg','a');first.element.children[2].children[0].handlers.click();clock+=60000;first.dispose();clock+=120000;let second=timer.create('eg','a');assert.equal(second.seconds(),180);second.pause();clock+=60000;assert.equal(second.seconds(),180);second.complete();assert.equal(JSON.parse(data['mein-putzmanager-room-timers-v1'])['eg|a'],undefined);}finally{Date.now=original;delete globalThis.document;delete globalThis.localStorage;}
});
