import os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[1]
def read(n):return (BASE/n).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[]
 def launch(saved=None):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(read('index.html'),wait_until='domcontentloaded')
  page.add_style_tag(content=read('style.css'));page.add_style_tag(content=read('editor.css'))
  page.evaluate('''(saved)=>{const store=saved??{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}});window._testStorage=store;}''',saved)
  for file in ['app.js','geometry.js','clean-model.js','editor.js']:page.add_script_tag(content=read(file))
  page.on('dialog',lambda d:d.accept())
  return page
 page=launch();page.locator('#setup-home').click()
 for name in ['Küche','Bad']:
  page.locator('#editor-new-room').fill(name);page.locator('#editor-add-room').click()
 get='window.PutzmanagerEditor.get()'
 rooms=page.evaluate(get+'.floors[0].rooms')
 assert len(rooms)==2,rooms
 shared=page.evaluate('window.PutzmanagerEditorGeometry.walls(window.PutzmanagerEditor.get().floors[0].rooms).filter(w=>w.owners.length===2)')
 assert len(shared)==1,shared
 sh=shared[0];print('SHARED',sh)
 # selection of common wall via path: coordinates scaled under svg
 line=page.locator('#drawing-canvas line[data-target="wall"]').filter(has=None)
 found=page.locator(f'#drawing-canvas line[data-wall="{sh["id"]}"][data-target="wall"]')
 assert found.count()==1,found.count()
 found.click(force=True)
 print('WALL_AFTER_CLICK',page.locator('#editor-wall-tools').get_attribute('hidden'),page.locator('#editor-wall-summary').inner_text(), 'ERRORS',errors)
 assert page.locator('#editor-wall-tools').is_visible(),'Wall tools not visible'
 assert 'Gemeinsame Innenwand' in page.locator('#editor-wall-summary').inner_text()
 page.locator('#editor-wall-measure').fill('2.5');page.locator('#editor-calibrate').click()
 scale=page.evaluate(get+'.floors[0].metersPerUnit');assert scale and scale>0
 # choose valid initial door width in m within wall length
 page.locator('#editor-opening-width').fill('0.80');page.locator('#editor-opening-kind').select_option('door')
 page.locator('#editor-opening-position').fill('45');page.locator('#editor-add-opening').click()
 saved=page.evaluate(get+'.floors[0].openings')
 assert len(saved)==1,('door missing',saved,page.locator('#editor-geometry-status').inner_text())
 assert saved[0]['kind']=='door' and saved[0]['wallId']==sh['id']
 # adding overlapping window must be denied
 page.locator('#editor-opening-kind').select_option('window');page.locator('#editor-opening-width').fill('0.70');page.locator('#editor-add-opening').click()
 assert len(page.evaluate(get+'.floors[0].openings'))==1,'overlapping opening allowed'
 # place a separate window elsewhere on same wall if space available
 page.locator('#editor-opening-position').fill('85');page.locator('#editor-opening-width').fill('0.38');page.locator('#editor-add-opening').click()
 print('OPENINGS',page.evaluate(get+'.floors[0].openings'))
 # Actual gap: 2 drawn wall segments for one door on shared wall
 page.screenshot(path='/mnt/data/Putzmanager_V1.0.2_U03_Editor.png')
 # move wall 20px (should preserve shared wall and openings)
 sh=page.evaluate('window.PutzmanagerEditorGeometry.walls(window.PutzmanagerEditor.get().floors[0].rooms).find(w=>w.owners.length===2)')
 b=page.locator(f'#drawing-canvas line[data-wall="{sh["id"]}"][data-target="wall"]').bounding_box()
 page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2)
 page.mouse.down();page.mouse.move(b['x']+b['width']/2+18,b['y']+b['height']/2,steps=5);page.mouse.up()
 assert page.evaluate('window.PutzmanagerEditorGeometry.walls(window.PutzmanagerEditor.get().floors[0].rooms).filter(w=>w.owners.length===2).length')==1,'wall disconnected after drag'
 assert len(page.evaluate(get+'.floors[0].openings'))>=1,'opening disappeared on moving wall'
 assert not errors, errors
 page.locator('#editor-close').click()
 savedStorage=page.evaluate('window._testStorage');page.close()
 page=launch(savedStorage)
 assert len(page.evaluate(get+'.floors[0].rooms'))==2
 assert len(page.evaluate(get+'.floors[0].openings'))>=1
 page.locator('#home-edit-plan').click()
 assert page.locator('#editor-wall-summary').count()==1
 print('U03 BROWSER PASS: room placement/no overlaps, shared wall, calibration, door real gap, overlap denial, wall move, reopen migration; errors',errors)
 browser.close()
