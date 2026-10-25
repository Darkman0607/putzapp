import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const CLEAN=require('../clean-model.js');
test('start score is neutral estimate, not pretending measured',()=>{assert.equal(CLEAN.roomScore(undefined),50);assert.equal(CLEAN.sanitize().base,50);});
test('baseline represents all untracked parts once',()=>{assert.equal(CLEAN.roomScore({base:50,areas:[{id:'a',name:'WC',score:100,tasks:[]}]}),75);assert.equal(CLEAN.roomScore({base:10,areas:[{id:'a',name:'WC',score:100,tasks:[]},{id:'b',name:'Boden',score:40,tasks:[]}]}),50);});
test('manual override takes precedence until area edit',()=>{const raw={base:10,override:95,areas:[{id:'a',name:'WC',score:30,tasks:[]}]};assert.equal(CLEAN.roomScore(raw),95);const next=CLEAN.updateArea(raw,'a',{score:80});assert.equal(next.override,null);assert.equal(CLEAN.roomScore(next),45);});
test('sanitizer tolerates old and hostile data',()=>{const result=CLEAN.sanitize({base:999,override:'90',areas:[null,{id:'ok',name:'Dusche',score:500,tasks:[]},{id:'ok',name:'Dup',score:1},{id:'x',name:'',score:10}]});assert.deepEqual(result,{base:50,override:null,tasks:[],areas:[{id:'ok',name:'Dusche',score:50,tasks:[]}]});});
test('bounds and color classes',()=>{assert.equal(CLEAN.roomScore({base:0}),0);assert.equal(CLEAN.roomScore({base:100}),100);assert.notEqual(CLEAN.stateColor(10),CLEAN.stateColor(95));});
test('rename validation prevents empty area names',()=>{assert.equal(CLEAN.updateArea({areas:[{id:'a',name:'WC',score:80,tasks:[]}]},'a',{name:'  '}),null);assert.equal(CLEAN.updateArea({areas:[{id:'a',name:'WC',score:80,tasks:[]}]},'b',{score:10}),null);});

test('area tasks survive sanitize with completed state',()=>{const c=CLEAN.sanitize({areas:[{id:'a',name:'Boden',score:40,tasks:[{id:'t1',text:'Wischen',done:true},{id:'t2',text:'Staubsaugen',done:false}]}]});assert.equal(c.areas[0].tasks.length,2);assert.equal(c.areas[0].tasks[0].done,true);assert.equal(CLEAN.roomScore(c),45);});
