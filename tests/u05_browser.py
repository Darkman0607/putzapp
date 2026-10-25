"""U05 mobile end-to-end check: task CRUD, intervals, partial cleaning, history and reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
read=lambda f:(root/f).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[]
 def launch(saved=None):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  page.set_content(read('index.html'))
  for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css']:page.add_style_tag(content=read(f))
  page.evaluate('''(saved)=>{const store=saved||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>store[key]??null,setItem:(key,v)=>store[key]=String(v)}});window.testStore=store;}''',saved)
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','cleaning-ui.js','inventory-model.js','inventory-ui.js']:page.add_script_tag(content=read(f))
  return page
 page=launch()
 page.locator('#setup-home').click()
 page.locator('#editor-new-room').fill('Bad')
 page.locator('#editor-add-room').click()
 page.locator('#editor-close').click()
 rid=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].id')
 original=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')
 page.locator('[data-home-room]').click()
 for name in ['WC','Boden']:
  page.locator('#room-area-name').fill(name)
  page.locator('#room-area-add').click()
 # set neutral scores differently before task tests
 page.locator('#room-base-input').fill('10');page.locator('#room-base-save').click()
 for idx,val in [(0,'25'),(1,'15')]:
  inp=page.locator('#room-areas .area-line > input[type=range]').nth(idx)
  inp.fill(val);inp.dispatch_event('change')
 page.locator('#room-detail-tasks').click()
 assert page.locator('#cleaning-overlay').is_visible()
 # 1) weekly task for WC, with custom title
 page.locator('.cleaning-edit-form .cleaning-select').first.select_option(index=1)
 page.locator('.cleaning-edit-form .cleaning-input').first.fill('WC gründlich reinigen')
 page.locator('.cleaning-edit-form .room-primary').click()
 assert 'WC gründlich reinigen' in page.locator('#cleaning-content').inner_text()
 # 2) room-wide/remaining-surface task with custom recurrence
 page.locator('.cleaning-edit-form .cleaning-select').first.select_option('base')
 page.locator('.cleaning-edit-form .cleaning-input').first.fill('Türgriffe putzen')
 page.locator('.cleaning-edit-form .cleaning-select').last.select_option('custom')
 page.locator('.cleaning-edit-form input[type=number]').fill('3')
 page.locator('.cleaning-edit-form .room-primary').click()
 assert 'Türgriffe putzen' in page.locator('#cleaning-content').inner_text()
 # 3) edit the task and confirm replacement rather than duplicate
 page.locator('.cleaning-task-item').filter(has_text='Türgriffe putzen').get_by_text('Bearbeiten').click()
 page.locator('.cleaning-edit-form .cleaning-input').first.fill('Türgriffe desinfizieren')
 page.locator('.cleaning-edit-form .room-primary').click()
 assert page.locator('.cleaning-task-item').count()==2
 assert 'Türgriffe desinfizieren' in page.locator('#cleaning-content').inner_text()
 page.locator('#cleaning-close').click()
 page.locator('[data-nav="clean"]').click()
 assert page.locator('#cleaning-room-picker option').count()==1
 # 4) only WC selected for quick clean, base + Boden unchanged
 page.locator('#cleaning-room-quick').click()
 check=page.locator('#cleaning-content input[type=checkbox]')
 assert check.count()==3
 check.nth(0).uncheck();check.nth(2).uncheck()
 page.locator('#cleaning-content .cleaning-notes').fill('Nur WC gereinigt')
 page.locator('#cleaning-content .cleaning-submit').click()
 assert page.locator('#room-history-count').inner_text().startswith('1')
 home=page.evaluate('window.PutzmanagerEditor.get()')
 area=home['floors'][0]['rooms'][0]['cleanliness']
 assert area['base']==10 and area['areas'][0]['score']==100 and area['areas'][1]['score']==15,area
 assert home['history'][0]['scope'][0]['name']=='WC'
 # reset WC dirty and check that detail cleaning tracks only marked task
 page.locator('[data-nav="home"]').click()
 page.locator('[data-home-room]').click()
 inp=page.locator('#room-areas .area-line > input[type=range]').first
 inp.fill('20');inp.dispatch_event('change')
 page.locator('#room-detail-close').click()
 page.locator('[data-nav="clean"]').click()
 page.locator('#cleaning-room-detail').click()
 assert page.locator('#cleaning-content .cleaning-check-row').count()==2
 labels=page.locator('#cleaning-content .cleaning-check-row')
 labels.filter(has_text='WC gründlich reinigen').locator('input').check()
 page.locator('#cleaning-content .cleaning-submit').click()
 savedHome=page.evaluate('window.PutzmanagerEditor.get()')
 clean=savedHome['floors'][0]['rooms'][0]['cleanliness']
 assert clean['base']==10 and clean['areas'][0]['score']==100 and clean['areas'][1]['score']==15,clean
 weekly=clean['areas'][0]['tasks'][0]
 assert weekly['done'] is True and weekly['nextDue'] is not None and weekly['lastDoneAt'] is not None,weekly
 assert clean['tasks'][0]['done'] is False
 assert len(savedHome['history'])==2
 assert savedHome['history'][-1]['tasks'][0]['text']=='WC gründlich reinigen'
 # Reload, 2 journals + task recurrence preserved; original polygon unchanged
 store=page.evaluate('window.testStore');page.close();page=launch(store)
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')==original
 assert page.locator('#room-history-count').inner_text().startswith('2')
 page.locator('[data-nav="clean"]').click()
 page.locator('#cleaning-room-manage').click()
 assert 'Nächste Fälligkeit:' in page.locator('#cleaning-content').inner_text()
 assert 'Türgriffe desinfizieren' in page.locator('#cleaning-content').inner_text()
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.0.4_U05_Aufgaben.png',full_page=True)
 assert not errors,errors
 print('U05 CHROMIUM MOBILE PASS: task CRUD/interval, selective quick and checklist cleaning, timestamps, due, 2 saved histories, reload, geometry unaffected, JS errors 0')
 browser.close()
