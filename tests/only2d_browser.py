"""V1.4.0.7 mobile parity: exclusively 2D, saved room unchanged, detail/quick/editor, no resets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
load=lambda p:(root/p).read_text()
styles=['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','backup-drive.css']
scripts=['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','room-timer.js','cleaning-ui.js','inventory-model.js','inventory-ui.js','backup-model.js','backup-drive.js']
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
 errors=[]
 def page_with(store=None):
  p=context.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept())
  p.set_content(load('index.html'))
  for css in styles:p.add_style_tag(content=load(css))
  p.evaluate('''(v)=>{const m=v||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=String(v),removeItem:k=>delete m[k]}});window.saved=m}''',store)
  for js in scripts:p.add_script_tag(content=load(js))
  return p
 p=page_with()
 assert p.locator('#floorplan-view-choice,#floorplan-view-3d,#home-3d-preview').count()==0
 assert p.locator('#floorplan-empty').is_visible()
 p.locator('#setup-home').click();p.locator('#editor-new-room').fill('Küche');p.locator('#editor-add-room').click();p.locator('#editor-new-room').fill('Bad');p.locator('#editor-add-room').click();p.locator('#editor-close').click()
 assert p.locator('#home-floorplan-preview').is_visible()
 assert p.locator('[data-home-room]').count()==2
 assert not p.locator('#floorplan-empty').is_visible()
 rooms=p.evaluate('window.PutzmanagerEditor.get().floors[0].rooms.map(r=>({id:r.id,name:r.name,points:r.points}))')
 rid=rooms[0]['id'];p.locator(f'[data-home-room="{rid}"]').click()
 assert p.locator('#room-detail-overlay').is_visible()
 p.locator('#room-score-input').fill('82');p.locator('#room-score-save').click()
 assert p.locator('#room-detail-state').inner_text().startswith('82 %')
 p.locator('#room-detail-close').click()
 assert p.locator('#home-floorplan-preview').inner_text().find('82 %')>=0
 p.locator('#home-edit-plan').click();assert p.locator('#drawing-canvas').is_visible()
 p.locator('#editor-close').click()
 assert p.evaluate('window.PutzmanagerEditor.get().floors[0].rooms.map(r=>r.points)')==[r['points'] for r in rooms]
 # Drive panel stays wired and stored data remain unchanged after reload.
 p.locator('.nav-button[data-nav=more]').click();assert p.locator('#backup-panel').is_visible()
 p.locator('.nav-button[data-nav=home]').click()
 saved=p.evaluate('window.saved');p.close();p=page_with(saved)
 assert p.locator('#home-floorplan-preview').is_visible()
 assert p.locator('[data-home-room]').count()==2
 assert p.locator('#home-floorplan-preview').inner_text().find('82 %')>=0
 assert p.evaluate('window.PutzmanagerEditor.get().floors[0].rooms.map(r=>r.points)')==[r['points'] for r in rooms]
 assert p.evaluate('Object.keys(window.saved).includes("mein-putzmanager-beta-v1")')
 assert p.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 assert not errors,errors
 p.screenshot(path='/mnt/data/Mein_Putzmanager_V1.4.0.7_2D.png',full_page=True)
 print('2D ONLY MOBILE PASS: no 3D controls, rooms create/tap/score/editor, geometry preserved, reload, backup panel, responsive, no JS errors')
 browser.close()
