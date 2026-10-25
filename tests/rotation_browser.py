"""V1.4.0.1: Chromium mobile controls and touch rotation with saved polygons."""
import os,math
from playwright.sync_api import sync_playwright
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(n):return open(os.path.join(BASE,n),encoding='utf8').read()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
 context=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 page=context.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(read('index.html'),wait_until='domcontentloaded')
 for name in ['style.css','editor.css','clean.css']:page.add_style_tag(content=read(name))
 page.evaluate('''() => {
  const store={};window._testStorage=store;
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}}});
 }''')
 for name in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js']:page.add_script_tag(content=read(name))
 page.locator('#setup-home').click()
 page.locator('#editor-new-room').fill('Wohnzimmer')
 page.locator('#editor-add-room').click()
 assert page.locator('#editor-rotate-left').is_visible()
 assert page.locator('#editor-rotate-right').is_visible()
 points=lambda:page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].points')
 orig=points();assert len(orig)==4
 page.locator('#editor-rotate-right').click();r15=points();assert r15!=orig
 assert abs(float(page.locator('#editor-rotate-angle').input_value())-15)<1
 page.locator('#editor-undo').click();assert points()==orig
 # Undo clears selection. Select room again for subsequent edits.
 page.locator('#drawing-canvas path[data-room]').click()
 page.locator('#editor-rotate-angle').fill('90');page.locator('#editor-rotate-angle').dispatch_event('change')
 assert abs(float(page.locator('#editor-rotate-angle').input_value())-90)<.1
 r90=points();assert r90!=orig
 # Touch drag of rotation handle, quarter circle in screen coordinates about polygon center.
 rid=page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms[0].id')
 grip=page.locator(f'#drawing-canvas [data-rotate="{rid}"]')
 pos=grip.bounding_box();assert pos
 x=pos['x']+pos['width']/2;y=pos['y']+pos['height']/2
 pivot=page.evaluate('''() => {
 const G=window.PutzmanagerEditorGeometry;
 const room=window.PutzmanagerEditor.get().floors[0].rooms[0];
 const p=G.polygonCenter(room.points),svg=document.querySelector('#drawing-canvas');
 const pt=svg.createSVGPoint();pt.x=p[0];pt.y=p[1];const q=pt.matrixTransform(svg.getScreenCTM());return [q.x,q.y];
 }''')
 dx=x-pivot[0];dy=y-pivot[1];end=[pivot[0]-dy,pivot[1]+dx]
 # Real browser input is required for setPointerCapture (synthetic JS events cannot capture a pointer).
 cdp=context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':3}]})
 for step in range(1,13):
  v=step/12;ang=v*math.pi/2
  # Trace an arc; x/y are the initial grip position, pivot is the room center.
  dest=[pivot[0]+dx*math.cos(ang)-dy*math.sin(ang),pivot[1]+dx*math.sin(ang)+dy*math.cos(ang)]
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':dest[0],'y':dest[1],'id':3}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 touch=points();assert touch!=r90,'real touch rotation did not change polygon; '+page.locator('#editor-geometry-status').inner_text()
 assert abs((float(page.locator('#editor-rotate-angle').input_value())-180))<3
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.4.0.1_Editor_Drehen.png')
 page.locator('#editor-close').click()
 stored=page.evaluate('JSON.parse(window._testStorage["mein-putzmanager-beta-v1"])')
 assert stored and 'home' in stored and len(stored['home']['floors'][0]['rooms'])==1
 assert not errs,errs
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/mnt/data/Mein_Putzmanager_V1.4.0.1_Rotation_Mobile.png')
 print('ROTATION MOBILE PASS: arrows, exact degrees, undo, SVG pointer drag 90 degrees, persisted data, no horizontal overflow/errors')
 b.close()
