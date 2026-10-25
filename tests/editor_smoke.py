"""Mobile Chromium touch-editor regression: injection needed where HTTP navigation is blocked."""
import os
from playwright.sync_api import sync_playwright
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(name):return open(os.path.join(BASE,name),encoding='utf8').read()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 errors=[]
 def page_for(saved=None):
  page=context.new_page();page.on('dialog',lambda d:d.accept('Obergeschoss'))
  page.set_content(read('index.html'),wait_until='domcontentloaded')
  page.add_style_tag(content=read('style.css'));page.add_style_tag(content=read('editor.css'))
  page.evaluate('''(saved) => {
   const store=saved??{};
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}});
   window._testStorage=store;
  }''',saved)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_script_tag(content=read('app.js'))
  page.add_script_tag(content=read('geometry.js'));page.add_script_tag(content=read('editor.js'))
  return page
 page=page_for()
 page.locator('#setup-home').click()
 assert page.locator('#editor-overlay').is_visible()
 assert not page.locator('#editor-level-picker').is_visible(),'floor picker hidden for one level'
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'initial horizontal overflow mobile'
 page.locator('#editor-kind').select_option('haus')
 page.locator('#editor-add-floor').click()
 assert 'Obergeschoss' in page.locator('#editor-level-name').inner_text()
 assert page.locator('#editor-level-picker').is_visible()
 page.locator('#editor-new-room').fill('Küche')
 page.locator('#editor-room-shape').select_option('rect')
 page.locator('#editor-add-room').click()
 assert page.locator('#drawing-canvas [data-room]').count()>=1
 assert page.locator('#editor-selection').is_visible()
 assert 'Küche' in page.locator('#editor-selected-name').input_value()
 room_id=page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms[0].id')
 original=page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms[0].points[0][0]')
 path=page.locator(f'#drawing-canvas path[data-room="{room_id}"]')
 box=path.bounding_box();assert box
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
 page.mouse.down();page.mouse.move(box['x']+box['width']/2+27,box['y']+box['height']/2,steps=6);page.mouse.up()
 moved=page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms[0].points[0][0]')
 assert moved!=original,f'room did not move {moved} {original}'
 page.locator('#editor-undo').click()
 restored=page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms[0].points[0][0]')
 assert restored==original,f'undo failed {restored} {original}'
 page.locator('#editor-redo').click()
 assert page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms[0].points[0][0]')==moved
 page.locator(f'#drawing-canvas path[data-room="{room_id}"]').click(position={'x':30,'y':30});page.locator('#editor-selected-name').fill('Große Küche');page.locator('#editor-selected-name').dispatch_event('change')
 assert page.locator('#editor-selected-name').input_value()=='Große Küche'
 page.locator('#editor-room-shape').select_option('l')
 page.locator('#editor-new-room').fill('Flur')
 page.locator('#editor-add-room').click()
 assert len(page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").rooms'))==2
 page.locator('#editor-new-outline').click()
 area=page.locator('#drawing-canvas').bounding_box()
 for px,py in ((.15,.14),(.85,.14),(.85,.85),(.15,.85)):
  page.mouse.click(area['x']+area['width']*px,area['y']+area['height']*py)
 page.locator('#editor-complete').click()
 assert len(page.evaluate('window.PutzmanagerEditor.get().floors.find(f=>f.name==="Obergeschoss").outline'))==4
 page.locator('#editor-close').click()
 assert page.locator('#home-floorplan-preview').is_visible()
 assert page.locator('#home-edit-plan').is_visible()
 saved=page.evaluate('window._testStorage');assert 'mein-putzmanager-beta-v1' in saved
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.0.1_Home.png',full_page=True)
 page.close()
 page=page_for(saved)
 assert page.locator('#home-floorplan-preview').is_visible(),'home persisted after reload'
 assert page.evaluate('window.PutzmanagerEditor.get().kind')=='haus'
 assert len(page.evaluate('window.PutzmanagerEditor.get().floors'))==2
 page.locator('#home-edit-plan').click()
 assert page.locator('#editor-rooms-count').inner_text()=='2 Räume'
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.0.1_Editor.png')
 # Floor switching and deletion with confirmation
 page.locator('#editor-remove-floor').click()
 assert len(page.evaluate('window.PutzmanagerEditor.get().floors'))==1
 assert not page.locator('#editor-level-picker').is_visible()
 page.locator('#editor-undo').click()
 assert len(page.evaluate('window.PutzmanagerEditor.get().floors'))==2
 assert not errors,errors
 print('EDITOR SMOKE: PASS | setup, kind, floors, rectangle/L, drag, undo/redo, rename, outline, preview, reload, delete-undo, no JS exceptions')
 print('LIMITATION: true Android touch-pinch, live HTTP/SW offline, and installation on a device not verified')
 browser.close()
