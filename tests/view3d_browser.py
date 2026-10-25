"""3D cleaning navigation and parity, Android-style touch, persistence, floor switching and stress fallback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
BASE=Path(__file__).resolve().parent.parent
read=lambda f:(BASE/f).read_text()
FILES=['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','cleaning-ui.js','inventory-model.js','inventory-ui.js','view3d-model.js','view3d-ui.js']
CSS=['style.css','editor.css','view3d.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css']
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 errors=[]
 def launch(storage=None):
  p=context.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept())
  p.set_content(read('index.html'))
  for f in CSS:p.add_style_tag(content=read(f))
  p.evaluate('''(storage)=>{const o=storage||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>o[k]??null,setItem:(k,v)=>o[k]=String(v)}});window._store=o;}''',storage)
  for f in FILES:p.add_script_tag(content=read(f))
  return p
 page=launch()
 assert page.locator('#floorplan-view-choice').is_hidden()
 page.locator('#setup-home').click()
 page.locator('#editor-new-room').fill('Bad')
 page.locator('#editor-add-room').click()
 page.locator('#editor-new-room').fill('Flur')
 page.locator('#editor-add-room').click()
 page.locator('#editor-close').click()
 original=page.evaluate('window.PutzmanagerEditor.get()')
 assert len(original['floors'][0]['rooms'])==2
 assert page.locator('[data-home-room]').count()==2
 assert page.locator('#floorplan-view-choice').is_visible()
 rid=original['floors'][0]['rooms'][0]['id']
 page.locator('#floorplan-view-3d').click()
 assert page.locator('#home-3d-preview').is_visible()
 assert page.locator('#home-floorplan-preview').is_hidden()
 assert page.locator('[data-3d-room]').count()==2
 assert rid in page.locator('[data-3d-room]').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("data-3d-room"))')
 assert page.locator('#view3d-scene').is_visible()
 # Tap room: same existing detail sheet from the 2D view.
 page.locator(f'[data-3d-room="{rid}"]').click(force=True)
 assert page.locator('#room-detail-overlay').is_visible(),'3D tap did not open room detail'
 page.locator('#room-detail-close').click()
 # Select and use 3D panel's quick action, score changes persist.
 page.locator('#view3d-score-25').click()
 assert '25 %' in page.locator('#view3d-status').inner_text()
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].cleanliness.override')==25
 page.locator('#view3d-quick').click()
 assert page.locator('#cleaning-overlay').is_visible()
 assert 'Bad' in page.locator('#cleaning-title').inner_text()
 page.locator('#cleaning-content .cleaning-submit').click()
 assert page.locator('#cleaning-overlay').is_hidden()
 home=page.evaluate('window.PutzmanagerEditor.get()');assert home['history'][-1]['roomId']==rid
 assert page.locator('#view3d-status').inner_text().find('100 %')>=0
 # 3D must use same score and floor identity after switching back to 2D.
 page.locator('#floorplan-view-2d').click();assert page.locator('#home-3d-preview').is_hidden()
 assert '100 %' in page.locator(f'[data-home-room="{rid}"]').text_content()
 page.locator('#floorplan-view-3d').click()
 assert page.locator('#view3d-scene').is_visible()
 # Rotate without changing stored room vertices; reset view.
 vertices=json.dumps(page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms.map(r=>r.points)'))
 # Finger/mouse drag rotates the projection without any edit to room geometry.
 before=page.locator(f'[data-3d-room="{rid}"] polygon').get_attribute('points')
 box=page.locator('#view3d-scene').bounding_box();cx=box['x']+box['width']*.55;cy=box['y']+box['height']*.55
 page.mouse.move(cx,cy);page.mouse.down();page.mouse.move(cx+35,cy+12,steps=5);page.mouse.up()
 page.wait_for_timeout(90)
 after=page.locator(f'[data-3d-room="{rid}"] polygon').get_attribute('points')
 assert before!=after,'3D pointer camera drag did not rotate the model'
 page.locator('#view3d-right').click();page.locator('#view3d-zoom-in').click()
 page.locator('#view3d-reset').click()
 assert json.dumps(page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms.map(r=>r.points)'))==vertices
 page.locator('#view3d-score-75').click()
 page.locator('#view3d-detail').click()
 assert page.locator('#cleaning-overlay').is_visible()
 page.locator('#cleaning-close').click()
 # Reload with exactly the old app storage key, scores and journal survive.
 saved=page.evaluate('window._store');page.close();page=launch(saved)
 assert page.evaluate('window.PutzmanagerEditor.get().history.length')==1
 assert page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].cleanliness.override')==75
 page.locator('#floorplan-view-3d').click()
 assert page.locator('[data-3d-room]').count()==2
 # 3D multi-floor switch with correct floor IDs.
 page.locator('#view3d-edit').click()
 page.locator('#editor-add-floor').click()
 page.locator('#editor-new-room').fill('Keller')
 page.locator('#editor-add-room').click()
 page.locator('#editor-close').click()
 page.locator('#view3d-floor').select_option(index=1)
 assert page.locator('[data-3d-room]').count()==1
 assert 'Keller' in page.locator('#home-3d-preview').inner_text()
 page.locator('#view3d-floor').select_option(index=0)
 assert page.locator('[data-3d-room]').count()==2
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'3D horizontal overflow'
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.4.0.4_3D_Reinigung.png',full_page=True)
 # Stress: renderer switches to light wall mode on >35 rooms.
 many=[{'id':f'test-{i}','name':f'Raum {i}','points':[[i%10*160,i//10*160],[i%10*160+150,i//10*160],[i%10*160+150,i//10*160+150],[i%10*160,i//10*160+150]],'cleanliness':{'base':45}} for i in range(50)]
 page.evaluate('''(rooms)=>{const h=window.PutzmanagerEditor.get();h.floors[0].rooms=rooms;window.PutzmanagerBeta.saveHome(h);document.dispatchEvent(new Event('putzmanager:homechange'));}''',many)
 # Editor keeps an internal snapshot. Rehydrate from persisted data when reopening existing app.
 saved=page.evaluate('window._store');page.close();page=launch(saved)
 start=time.monotonic();page.locator('#floorplan-view-3d').click();page.locator('[data-3d-room]').first.wait_for()
 duration=time.monotonic()-start
 assert page.locator('[data-3d-room]').count()==50
 assert duration<5, f'50-room renderer slow: {duration:.2f}s'
 assert 'vereinfachte Wände' in page.locator('#home-3d-preview').inner_text()
 assert not errors,errors
 print(f'3D BROWSER PASS: room identity, scene, quick/detail, score, journal, reload, floor, responsive, 50-room fallback ({duration:.2f}s); mobile Chromium simulated, physical Android not tested')
 browser.close()
