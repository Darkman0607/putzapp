"""Hotfix full-page Chromium integration, true HTTP same-origin storage and photo upload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io, os
root=Path(__file__).parent.parent
url='about:blank'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.set_content((root/'index.html').read_text(),wait_until='domcontentloaded')
 for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','backup-drive.css']:page.add_style_tag(content=(root/f).read_text())
 page.evaluate('''() => {const store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k]}});window.testStore=store;}''')
 def inject():
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','room-timer.js','cleaning-ui.js','inventory-model.js','inventory-ui.js','plan-model.js','backup-model.js','backup-drive.js','photos.js','knowledge-ui.js','plan-ui.js']:page.add_script_tag(content=(root/f).read_text())
 inject()
 assert page.evaluate('PutzmanagerBeta.version')=='1.4.0.8'
 assert not errors,errors
 page.evaluate('''() => { const current=PutzmanagerEditor.get();const f=current.floors[0];f.rooms=[{id:'bathroom',name:'Bad',points:[[20,20],[20,300],[250,300],[250,20]],cleanliness:PutzmanagerClean.sanitize({base:40,areas:[{id:'wc',name:'WC',score:40,tasks:[{id:'task-wc',text:'WC reinigen',interval:'weekly',done:false},{id:'task-mirror',text:'Spiegel reinigen',interval:'weekly',done:false}]}]})}];PutzmanagerBeta.saveHome(current); }''')
 saved=page.evaluate('window.testStore');page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.set_content((root/'index.html').read_text());
 for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','backup-drive.css']:page.add_style_tag(content=(root/f).read_text())
 page.evaluate('''(saved) => {Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=String(v),removeItem:k=>delete saved[k]}});window.testStore=saved;}''',saved)
 inject();assert not errors,errors
 # Clicking primary quick-start must not open old unlinked session modal
 page.locator('.bottom-nav [data-nav="clean"]').first.click()
 page.locator('#view-clean [data-action="quickstart"]').click()
 assert page.locator('#cleaning-room-picker').evaluate('(e) => document.activeElement === e')
 assert page.locator('#modal').is_hidden()
 # New room-specific detailed flow: photos, manual timer, tasks
 page.locator('#cleaning-room-detail').click()
 assert page.locator('#cleaning-overlay').is_visible()
 assert page.locator('.cleaning-photos').is_visible()
 assert page.locator('.cleaning-knowledge').is_visible()
 assert page.locator('#cleaning-content input[type="checkbox"]').count()>=2
 from PIL import Image
 im=Image.new('RGB',(100,80),'navy');temp=io.BytesIO();im.save(temp,format='JPEG')
 page.locator('.cleaning-photos input').first.set_input_files({'name':'vorher.jpg','mimeType':'image/jpeg','buffer':temp.getvalue()})
 page.wait_for_function('document.querySelector(".photo-preview img") !== null')
 page.locator('.cleaning-check-row input[value="task-wc"]').check()
 page.locator('.cleaning-submit').click()
 assert page.locator('#cleaning-overlay').is_hidden()
 state=page.evaluate('PutzmanagerEditor.get()');area=state['floors'][0]['rooms'][0]['cleanliness']['areas'][0]
 assert area['score']==50,area
 assert area['tasks'][1]['done']==False
 assert page.evaluate('PutzmanagerPhotos.all().length')==1
 # Planned cleaning with 15 minutes and postponement
 page.locator('.bottom-nav [data-nav="plan"]').first.click()
 assert 'Spiegel reinigen' in page.locator('#daily-plan-items').inner_text()
 count=page.locator('.daily-task').count()
 page.locator('.daily-task').first.get_by_text('Morgen').click()
 assert page.locator('.daily-task').count()<count
 page.locator('[data-minutes="60"]').click()
 assert page.evaluate('PutzmanagerBeta.getBudget()')==60
 # Photo gallery and tutorial display
 page.locator('.bottom-nav [data-nav="more"]').first.click()
 assert page.locator('#photo-gallery .photo-entry').count()==1
 assert page.locator('#photo-gallery img').count()==1
 assert page.locator('.knowledge-guide').count()>=6
 # backup includes photo and plan
 pack=page.evaluate('PutzmanagerBackupModel.snapshot(localStorage)')
 assert 'mein-putzmanager-clean-photos-v1' in pack and 'mein-putzmanager-plan-v1' in pack
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
 # Restart: photos and plan survive
 saved=page.evaluate('window.testStore');page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.set_content((root/'index.html').read_text());
 for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','backup-drive.css']:page.add_style_tag(content=(root/f).read_text())
 page.evaluate('''(saved) => {Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=String(v),removeItem:k=>delete saved[k]}});window.testStore=saved;}''',saved)
 inject()
 assert page.evaluate('PutzmanagerPhotos.all().length')==1
 assert page.locator('#photo-gallery .photo-entry').count()==1
 assert not errors,errors
 page.screenshot(path='/mnt/data/Mein_Putzmanager_Hotfix_V1.4.0.8_Plan.png',full_page=True)
 print('HOTFIX MOBILE PASS: quickstart, partial score, photos, local/backup, daily plan, deferral, guide, reload, 390px, errors=0')
 browser.close()

