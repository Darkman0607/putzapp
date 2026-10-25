"""Mobile smoke: disposable debit, laundry queue, stopwatch, no stock on failed save, reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parent.parent
read=lambda p:(base/p).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 js_errors=[];alerts=[]
 def launch(store=None):
  p=context.new_page();p.on('pageerror',lambda e:js_errors.append(str(e)));p.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
  p.set_content(read('index.html'))
  for file in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','view3d.css']:p.add_style_tag(content=read(file))
  p.evaluate('''(v)=>{const data=v||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}});window.fakeStore=data}''',store)
  for file in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','room-timer.js','cleaning-ui.js','inventory-model.js','inventory-ui.js','view3d-model.js','view3d-ui.js']:p.add_script_tag(content=read(file))
  return p
 page=launch()
 page.locator('#setup-home').click();page.locator('#editor-new-room').fill('Küche');page.locator('#editor-add-room').click();page.locator('#editor-close').click()
 page.locator('.nav-button[data-nav=more]').click();page.locator('#inventory-open-more').click()
 def add(name,quantity,handling,unit='Stück'):
  page.locator('#inventory-add').click();page.locator('#inventory-name').fill(name)
  page.locator('input[name=quantity]').fill(str(quantity));page.locator('select[name=unit]').select_option(unit)
  page.locator('#inventory-handling').select_option(handling);page.locator('#inventory-save').click()
 add('Handschuhe weiß',1,'consume','Paar')
 add('Geschirrtuch blau',2,'wash')
 data=page.evaluate('window.PutzmanagerInventory.get()');assert len(data['items'])==2,data
 page.locator('#inventory-back').click();page.locator('.nav-button[data-nav=clean]').click();page.locator('#cleaning-room-quick').click()
 page.locator('.room-stopwatch .room-primary').click()
 page.wait_for_timeout(1300)
 page.locator('.room-stopwatch .room-primary').click()
 assert page.locator('.room-stopwatch-clock').inner_text() in ('00:01','00:02'),page.locator('.room-stopwatch-clock').inner_text()
 for checkbox in page.locator('.material-group input[data-item]').all():checkbox.check()
 page.locator('.cleaning-submit').click();assert not page.locator('#cleaning-overlay').is_visible()
 data=page.evaluate('window.PutzmanagerInventory.get()');gloves=next(x for x in data['items'] if 'Handschuhe' in x['name']);cloth=next(x for x in data['items'] if 'Geschirrtuch' in x['name'])
 assert gloves['quantity']==0,gloves
 assert cloth['quantity']==2 and cloth['dirtyQuantity']==1,cloth
 journal=page.evaluate('window.PutzmanagerEditor.get().history');assert len(journal)==1 and journal[0]['durationSeconds']>=1,journal
 assert '1 Eintrag' in page.locator('#session-count').inner_text()
 # Second booking must fail atomically even though washable towel has one clean unit.
 page.locator('#cleaning-room-quick').click()
 assert page.locator('.material-group input[data-item]').count()==2
 page.locator('.cleaning-submit').click()
 assert page.locator('#cleaning-overlay').is_visible()
 assert len(page.evaluate('window.PutzmanagerEditor.get().history'))==1
 assert page.evaluate('window.PutzmanagerInventory.get().items.find(x=>x.name.includes("Geschirrtuch")).dirtyQuantity')==1
 assert any('NICHT abgeschlossen' in x for x in alerts),alerts
 page.locator('#cleaning-close').click()
 page.locator('.nav-button[data-nav=more]').click();page.locator('#inventory-open-more').click()
 assert 'Wäsche' in page.locator('.inventory-card').all_inner_texts()[0]+' '.join(page.locator('.inventory-card').all_inner_texts())
 page.locator('[data-action=washed]').click()
 assert page.evaluate('window.PutzmanagerInventory.get().items.find(x=>x.name.includes("Geschirrtuch")).dirtyQuantity')==0
 saved=page.evaluate('window.fakeStore');page.close();page=launch(saved)
 assert page.evaluate('window.PutzmanagerInventory.get().items.find(x=>x.name.includes("Geschirrtuch")).dirtyQuantity')==0
 assert len(page.evaluate('window.PutzmanagerEditor.get().history'))==1
 assert not js_errors,js_errors
 print('V1.4.0.5 MOBILE PASS: stopwatch start/pause, session elapsed saved, disposable -1, washable → dirty, block empty stock atomically, wash +1, reload, no JS errors')
 browser.close()
