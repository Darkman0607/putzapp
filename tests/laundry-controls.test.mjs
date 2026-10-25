import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import M from '../inventory-model.js';
function add(name,extras={}){return M.add(M.sanitize({}),{name,category:'zubehoer',quantity:5,unit:'Stück',...extras}).state;}
test('Geschirrtücher and Putzfetzen default to washable if no handling is specified',()=>{
 for(const name of ['Geschirrtücher','Putztücher','Putzfetzen','Putztlappen','Mikrofaser']){
  const s=add(name);assert.equal(s.items[0].handling,'wash',name);
 }
});
test('Manually transfer clean cloth to laundry and back without changing total quantity',()=>{
 let s=add('Geschirrtücher'),id=s.items[0].id;
 s=M.markForLaundry(s,id,3).state;
 assert.equal(M.available(s.items[0]),2);assert.equal(s.items[0].dirtyQuantity,3);assert.equal(s.items[0].quantity,5);
 s=M.markWashed(s,id,1).state;assert.equal(M.available(s.items[0]),3);assert.equal(s.items[0].dirtyQuantity,2);
 s=M.markWashed(s,id,2).state;assert.equal(s.items[0].dirtyQuantity,0);
});
test('Cannot create more dirty cloths than available; invalid count never touches input',()=>{
 const s=add('Putztücher'),id=s.items[0].id;
 for(const count of [0,6,-1,1.5,Number.NaN])assert.throws(()=>M.markForLaundry(s,id,count),/Ungültige Anzahl/);
 assert.equal(s.items[0].dirtyQuantity,0);
});
test('A completed cleaning still sends one washable unit to laundry; manual booking preserved',()=>{
 let s=add('Putztuch'),id=s.items[0].id;s=M.markForLaundry(s,id,2).state;
 s=M.registerUse(s,{sessionId:'S2',roomId:'k',assignments:[{ids:[id]}]}).state;
 assert.equal(s.items[0].dirtyQuantity,3);
 assert.equal(s.uses.length,1);
});
test('Configured washing temperature persists across edit and sanitize, unknown remains unknown',()=>{
 let s=add('Geschirrtücher',{washTemperature:60}),id=s.items[0].id;
 assert.equal(s.items[0].washTemperature,60);
 s=M.update(s,id,{location:'Küche'}).state;
 assert.equal(M.sanitize(JSON.parse(JSON.stringify(s))).items[0].washTemperature,60);
 assert.equal(add('Putzlappen',{washTemperature:80}).items[0].washTemperature,null);
});
test('Inventory controls include laundry button and editable washing temperature',()=>{
 const ui=fs.readFileSync(new URL('../inventory-ui.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(ui,/dataset\.action='laundry'/);
 assert.match(ui,/markForLaundry/);
 assert.match(html,/name="washTemperature"/);
});
