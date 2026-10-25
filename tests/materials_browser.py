"""Mobile integration test: edit, icons, remembered task materials, usage booking, persistence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
read=lambda f:(root/f).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[]
 def launch(store=None):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  page.set_content(read('index.html'))
  for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css']:page.add_style_tag(content=read(f))
  page.evaluate('''(s)=>{const store=s||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>store[key]??null,setItem:(key,v)=>store[key]=String(v)}});window.testStore=store;}''',store)
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','cleaning-ui.js','inventory-model.js','inventory-ui.js']:page.add_script_tag(content=read(f))
  return page
 page=launch()
 page.locator('.nav-button[data-nav=more]').click();page.locator('#inventory-open-more').click();page.locator('#inventory-add').click()
 page.locator('#inventory-name').fill('WC Reiniger');page.locator('select[name=unit]').select_option('Flaschen');page.locator('select[name=icon]').select_option('spray');page.locator('input[name=location]').fill('Bad')
 page.locator('#inventory-save').click();assert page.locator('.inventory-card').count()==1
 page.locator('[data-action=edit]').click();page.locator('#inventory-name').fill('WC Gel');page.locator('input[name=brand]').fill('Muster');page.locator('select[name=icon]').select_option('glovesPink');page.locator('#inventory-save').click();assert page.locator('.inventory-card').count()==1
 assert page.locator('.inventory-card').first.inner_text().find('WC Gel')>=0
 page.locator('#inventory-back').click();page.locator('.nav-button[data-nav=home]').click();page.locator('#setup-home').click();page.locator('#editor-new-room').fill('Bad');page.locator('#editor-add-room').click();page.locator('#editor-close').click()
 page.locator('[data-home-room]').click();page.locator('#room-detail-tasks').click();page.locator('.cleaning-edit-form .cleaning-input').first.fill('WC reinigen');page.locator('.cleaning-edit-form .room-primary').click();page.locator('.cleaning-edit-form .cleaning-input').first.fill('Spiegel reinigen');page.locator('.cleaning-edit-form .room-primary').click();page.locator('#cleaning-close').click()
 page.locator('.nav-button[data-nav=clean]').click();page.locator('#cleaning-room-detail').click()
 checks=page.locator('#cleaning-content .cleaning-check-row input');assert checks.count()==2
 checks.nth(0).check();checks.nth(1).check()
 group=page.locator('.material-group');assert group.count()==2
 group.nth(0).locator('input[data-item]').first.check()
 group.nth(1).locator('input[data-item]').first.uncheck()
 page.locator('.cleaning-submit').click()
 inv=page.evaluate('window.PutzmanagerInventory.get()');assert inv['items'][0]['usageCount']==1,inv
 assert len(inv['uses'])==1 and len(inv['presets'])>=3
 page.locator('#cleaning-room-detail').click();page.locator('#cleaning-content .cleaning-check-row input').first.check();page.locator('.material-group input[data-item]').first.is_checked()
 assert page.locator('.material-group input[data-item]').first.is_checked()
 page.locator('#cleaning-close').click()
 page.locator('#cleaning-room-quick').click();page.locator('.clean-materials select.cleaning-select').select_option('after');assert not page.locator('.material-groups').is_visible()
 page.locator('.cleaning-submit').click();assert page.locator('.material-groups').is_visible()
 assert page.locator('#cleaning-overlay').is_visible();page.locator('.cleaning-submit').click()
 after=page.evaluate('window.PutzmanagerInventory.get()');assert after['items'][0]['usageCount']==2
 saved=page.evaluate('window.testStore');page.close();page=launch(saved)
 assert page.evaluate('window.PutzmanagerInventory.get().items[0].usageCount')==2
 assert not errors,errors
 print('MATERIALS MOBILE PASS: create/edit, icons, task-specific presets, one-use-per-session, after-mode, reload, errors=0')
 browser.close()
