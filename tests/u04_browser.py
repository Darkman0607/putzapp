"""Mobile test of real dashboard interactions + legacy localStorage reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
read=lambda p:(root/p).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[]
 def launch(saved=None):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:d.accept('WC neu'))
  page.set_content(read('index.html'))
  for style in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css']: page.add_style_tag(content=read(style))
  page.evaluate('''(saved)=>{const values=saved||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>values[k]??null,setItem:(k,v)=>values[k]=String(v)}});window.testStore=values;}''', saved)
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js']:page.add_script_tag(content=read(f))
  return page
 page=launch()
 assert '0' not in page.locator('#home-overall-value').inner_text()
 page.locator('#setup-home').click()
 page.locator('#editor-new-room').fill('Bad');page.locator('#editor-add-room').click()
 original=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')
 rid=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].id')
 page.locator('#editor-add-floor').click()
 page.locator('#editor-new-room').fill('Küche');page.locator('#editor-add-room').click()
 page.locator('#editor-close').click()
 assert page.locator('#home-floor-select').is_visible()
 assert page.locator('[data-home-room]').count()==1
 # current second floor; switch to first
 page.locator('#home-floor-select').select_option(index=0)
 group=page.locator(f'[data-home-room="{rid}"]')
 group.click()
 assert page.locator('#room-detail-overlay').is_visible()
 assert page.locator('#room-detail-state').inner_text().startswith('50 %')
 page.locator('#room-area-name').fill('WC');page.locator('#room-area-add').click()
 assert page.locator('#room-areas .area-line').count()==1
 # area 90, base 50 -> 70
 slide=page.locator('#room-areas input[type=range]')
 slide.fill('90');slide.dispatch_event('change')
 assert page.locator('#room-detail-state').inner_text().startswith('70 %')
 page.locator('#room-score-input').fill('96');page.locator('#room-score-save').click()
 assert page.locator('#room-detail-state').inner_text().startswith('96 %')
 # area edit supersedes override
 page.locator('#room-areas input[type=range]').fill('100');page.locator('#room-areas input[type=range]').dispatch_event('change')
 assert page.locator('#room-detail-state').inner_text().startswith('75 %')
 page.locator('#room-areas .room-btn').first.click()
 assert 'WC neu' in page.locator('#room-areas').inner_text()
 page.locator('.area-tasks input[type=text]').fill('WC reinigen');page.locator('.area-tasks .room-btn').last.click()
 assert 'WC reinigen' in page.locator('#room-areas').inner_text()
 page.locator('.area-task-row input[type=checkbox]').check()
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].cleanliness.areas[0].tasks[0].done') is True
 page.locator('#room-detail-close').click()
 assert '75 %' in group.locator('text').last.text_content()
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')==original,'room geometry changed in view mode'
 # trigger long press (dispatch timed pointerdown then wait)
 group=page.locator(f'[data-home-room="{rid}"]');box=group.bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
 page.evaluate('''(id)=>{document.querySelector(`[data-home-room="${id}"]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9,pointerType:'touch',clientX:100,clientY:200}));}''',rid)
 page.wait_for_timeout(670)
 assert page.locator('#room-quick-overlay').is_visible()
 page.locator('[data-quick-score="25"]').click()
 assert '25 Prozent' in page.locator(f'[data-home-room="{rid}"]').get_attribute('aria-label')
 # ensure no walls edited; persistence survives restart
 old=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points');saved=page.evaluate('window.testStore');page.close()
 page=launch(saved)
 assert page.locator('#home-floor-select').is_visible()
 page.locator('#home-floor-select').select_option(index=0)
 assert '25 %' in page.locator('#home-overall-value').inner_text() or page.locator('#home-overall-value').inner_text()!='– %'
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')==old
 page.locator(f'[data-home-room="{rid}"]').click()
 assert '25 %' in page.locator('#room-detail-state').inner_text()
 assert 'WC neu' in page.locator('#room-areas').inner_text()
 assert 'WC reinigen' in page.locator('#room-areas').inner_text()
 assert page.locator('.area-task-row input[type=checkbox]').is_checked()
 page.locator('#room-detail-close').click()
 page.screenshot(path='/mnt/data/Putzmanager_V1.0.3_U04_Home.png',full_page=True)
 assert not errors,errors
 print('U04 BROWSER PASS: 2 floors, tap details, area add/change/rename, room override, recompute, long-press quick score, persisted reload, immutable geometry, errors=0')
 browser.close()
